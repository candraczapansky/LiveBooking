import { Express } from "express";
import { IStorage } from "../storage";
import { db } from "../db";
import { salesHistory, appointments, services, serviceCategories, products, users, staff } from "../../shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// Helper function to format price
const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper function to get current user from request
const getCurrentUser = (req: any) => {
  return req.user || { id: null, role: 'client' };
};

// Helper function to check if user can access staff data
const canAccessStaffData = (user: any, staffId?: number) => {
  if (user.role === 'admin') return true;
  if (user.role === 'staff' && staffId) {
    // Staff can only see their own data
    return user.staffId === staffId;
  }
  return false;
};

export function registerReportRoutes(app: Express, storage: IStorage) {
  
  // GET /api/reports/sales/category
  app.get("/api/reports/sales/category", async (req, res) => {
    try {
      const { start_date, end_date, location_id } = req.query;
      const currentUser = getCurrentUser(req);
      
      if (!start_date || !end_date) {
        return res.status(400).json({ 
          error: "start_date and end_date query parameters are required" 
        });
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);
      const locationId = location_id ? parseInt(location_id as string) : null;

      // Build query based on user role
      let salesByCategoryQuery;
      
      if (currentUser.role === 'staff') {
        // Staff can only see their own sales
        salesByCategoryQuery = sql`
          WITH sales_by_category AS (
            -- Service sales (from appointments) for this staff only
            SELECT 
              sc.name as category_name,
              'service' as transaction_type,
              COALESCE(SUM(a.total_amount), 0) as total_revenue,
              COUNT(a.id) as transaction_count
            FROM sales_history sh
            JOIN appointments a ON sh.appointment_id = a.id
            JOIN services s ON a.service_id = s.id
            JOIN service_categories sc ON s.category_id = sc.id
            WHERE sh.transaction_type = 'appointment'
              AND sh.payment_status = 'completed'
              AND sh.transaction_date >= ${startDate}
              AND sh.transaction_date <= ${endDate}
              AND a.staff_id = ${currentUser.staffId}
              ${locationId ? sql`AND a.location_id = ${locationId}` : sql``}
            GROUP BY sc.id, sc.name
          )
          SELECT 
            category_name,
            SUM(total_revenue) as total_revenue,
            SUM(transaction_count) as transaction_count,
            ROUND(
              CAST((SUM(total_revenue) / NULLIF(SUM(SUM(total_revenue)) OVER(), 0)) * 100 AS NUMERIC), 2
            ) as percentage
          FROM sales_by_category
          GROUP BY category_name
          ORDER BY total_revenue DESC
        `;
      } else {
        // Admin and client see all sales
        salesByCategoryQuery = sql`
          WITH sales_by_category AS (
            -- Service sales (from appointments)
            SELECT 
              sc.name as category_name,
              'service' as transaction_type,
              COALESCE(SUM(a.total_amount), 0) as total_revenue,
              COUNT(a.id) as transaction_count
            FROM sales_history sh
            JOIN appointments a ON sh.appointment_id = a.id
            JOIN services s ON a.service_id = s.id
            JOIN service_categories sc ON s.category_id = sc.id
            WHERE sh.transaction_type = 'appointment'
              AND sh.payment_status = 'completed'
              AND sh.transaction_date >= ${startDate}
              AND sh.transaction_date <= ${endDate}
              ${locationId ? sql`AND a.location_id = ${locationId}` : sql``}
            GROUP BY sc.id, sc.name
            
            UNION ALL
            
            -- Product sales (from POS) - Note: POS sales don't have location filtering yet
            SELECT 
              p.category as category_name,
              'product' as transaction_type,
              COALESCE(SUM(sh.total_amount), 0) as total_revenue,
              COUNT(sh.id) as transaction_count
            FROM sales_history sh
            JOIN products p ON p.id = ANY(
              SELECT jsonb_array_elements_text(sh.product_ids::jsonb)::integer
            )
            WHERE sh.transaction_type = 'pos_sale'
              AND sh.payment_status = 'completed'
              AND sh.transaction_date >= ${startDate}
              AND sh.transaction_date <= ${endDate}
            GROUP BY p.category
          )
          SELECT 
            category_name,
            SUM(total_revenue) as total_revenue,
            SUM(transaction_count) as transaction_count,
            ROUND(
              CAST((SUM(total_revenue) / NULLIF(SUM(SUM(total_revenue)) OVER(), 0)) * 100 AS NUMERIC), 2
            ) as percentage
          FROM sales_by_category
          GROUP BY category_name
          ORDER BY total_revenue DESC
        `;
      }

      const result = await db.execute(salesByCategoryQuery);
      
      res.json({
        success: true,
        data: result.rows,
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        user_role: currentUser.role
      });

    } catch (error: any) {
      console.error("Error fetching sales by category:", error);
      res.status(500).json({ 
        error: "Failed to fetch sales by category data",
        details: error.message 
      });
    }
  });

  // GET /api/reports/clients/retention
  app.get("/api/reports/clients/retention", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      const currentUser = getCurrentUser(req);
      
      if (!start_date || !end_date) {
        return res.status(400).json({ 
          error: "start_date and end_date query parameters are required" 
        });
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);
      const previousPeriodStart = new Date(startDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days before

      // Build query based on user role
      let retentionQuery;
      
      if (currentUser.role === 'staff') {
        // Staff can only see their own client retention
        retentionQuery = sql`
          WITH client_periods AS (
            -- Previous period clients for this staff only
            SELECT DISTINCT 
              client_id,
              'previous' as period
            FROM appointments 
            WHERE start_time >= ${previousPeriodStart}
              AND start_time < ${startDate}
              AND status = 'completed'
              AND staff_id = ${currentUser.staffId}
            
            UNION ALL
            
            -- Current period clients for this staff only
            SELECT DISTINCT 
              client_id,
              'current' as period
            FROM appointments 
            WHERE start_time >= ${startDate}
              AND start_time <= ${endDate}
              AND status = 'completed'
              AND staff_id = ${currentUser.staffId}
          ),
          retention_analysis AS (
            SELECT 
              client_id,
              COUNT(CASE WHEN period = 'previous' THEN 1 END) as was_previous_client,
              COUNT(CASE WHEN period = 'current' THEN 1 END) as is_current_client
            FROM client_periods
            GROUP BY client_id
          )
          SELECT 
            COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END) as retained_clients,
            COUNT(CASE WHEN was_previous_client > 0 THEN 1 END) as total_previous_clients,
            COUNT(CASE WHEN is_current_client > 0 THEN 1 END) as total_current_clients,
            ROUND(
              (COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END)::decimal / 
               NULLIF(COUNT(CASE WHEN was_previous_client > 0 THEN 1 END), 0)) * 100, 2
            ) as retention_rate
          FROM retention_analysis
        `;
      } else {
        // Admin and client see all retention data
        retentionQuery = sql`
          WITH client_periods AS (
            -- Previous period clients
            SELECT DISTINCT 
              client_id,
              'previous' as period
            FROM appointments 
            WHERE start_time >= ${previousPeriodStart}
              AND start_time < ${startDate}
              AND status = 'completed'
            
            UNION ALL
            
            -- Current period clients
            SELECT DISTINCT 
              client_id,
              'current' as period
            FROM appointments 
            WHERE start_time >= ${startDate}
              AND start_time <= ${endDate}
              AND status = 'completed'
          ),
          retention_analysis AS (
            SELECT 
              client_id,
              COUNT(CASE WHEN period = 'previous' THEN 1 END) as was_previous_client,
              COUNT(CASE WHEN period = 'current' THEN 1 END) as is_current_client
            FROM client_periods
            GROUP BY client_id
          )
          SELECT 
            COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END) as retained_clients,
            COUNT(CASE WHEN was_previous_client > 0 THEN 1 END) as total_previous_clients,
            COUNT(CASE WHEN is_current_client > 0 THEN 1 END) as total_current_clients,
            ROUND(
              (COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END)::decimal / 
               NULLIF(COUNT(CASE WHEN was_previous_client > 0 THEN 1 END), 0)) * 100, 2
            ) as retention_rate
          FROM retention_analysis
        `;
      }

      const result = await db.execute(retentionQuery);
      
      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            retained_clients: 0,
            total_previous_clients: 0,
            total_current_clients: 0,
            retention_rate: 0
          },
          period: {
            previous_start: previousPeriodStart.toISOString(),
            previous_end: startDate.toISOString(),
            current_start: startDate.toISOString(),
            current_end: endDate.toISOString()
          },
          user_role: currentUser.role
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        period: {
          previous_start: previousPeriodStart.toISOString(),
          previous_end: startDate.toISOString(),
          current_start: startDate.toISOString(),
          current_end: endDate.toISOString()
        },
        user_role: currentUser.role
      });

    } catch (error: any) {
      console.error("Error fetching client retention:", error);
      res.status(500).json({ 
        error: "Failed to fetch client retention data",
        details: error.message 
      });
    }
  });

  // GET /api/reports/appointments/no-shows
  app.get("/api/reports/appointments/no-shows", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      const currentUser = getCurrentUser(req);
      
      if (!start_date || !end_date) {
        return res.status(400).json({ 
          error: "start_date and end_date query parameters are required" 
        });
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);

      // Build query based on user role
      let noShowQuery;
      
      if (currentUser.role === 'staff') {
        // Staff can only see their own no-shows
        noShowQuery = sql`
          WITH no_show_analysis AS (
            -- No-shows by client for this staff only
            SELECT 
              'client' as analysis_type,
              u.first_name || ' ' || u.last_name as name,
              COUNT(*) as no_show_count,
              COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER(), 0) as percentage
            FROM appointments a
            JOIN users u ON a.client_id = u.id
            WHERE a.status = 'no_show'
              AND a.start_time >= ${startDate}
              AND a.start_time <= ${endDate}
              AND a.staff_id = ${currentUser.staffId}
            GROUP BY u.id, u.first_name, u.last_name
          )
          SELECT 
            analysis_type,
            name,
            no_show_count,
            ROUND(percentage, 2) as percentage
          FROM no_show_analysis
          ORDER BY no_show_count DESC
        `;
      } else {
        // Admin and client see all no-show data
        noShowQuery = sql`
          WITH no_show_analysis AS (
            -- No-shows by client
            SELECT 
              'client' as analysis_type,
              u.first_name || ' ' || u.last_name as name,
              COUNT(*) as no_show_count,
              COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER(), 0) as percentage
            FROM appointments a
            JOIN users u ON a.client_id = u.id
            WHERE a.status = 'no_show'
              AND a.start_time >= ${startDate}
              AND a.start_time <= ${endDate}
            GROUP BY u.id, u.first_name, u.last_name
            
            UNION ALL
            
            -- No-shows by staff
            SELECT 
              'staff' as analysis_type,
              u.first_name || ' ' || u.last_name as name,
              COUNT(*) as no_show_count,
              COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER(), 0) as percentage
            FROM appointments a
            JOIN staff s ON a.staff_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE a.status = 'no_show'
              AND a.start_time >= ${startDate}
              AND a.start_time <= ${endDate}
            GROUP BY u.id, u.first_name, u.last_name
          )
          SELECT 
            analysis_type,
            name,
            no_show_count,
            ROUND(percentage, 2) as percentage
          FROM no_show_analysis
          ORDER BY no_show_count DESC
        `;
      }

      const result = await db.execute(noShowQuery);
      
      // Group results by analysis type
      const clientNoShows = result.rows.filter((row: any) => row.analysis_type === 'client');
      const staffNoShows = result.rows.filter((row: any) => row.analysis_type === 'staff');

      res.json({
        success: true,
        data: {
          by_client: clientNoShows,
          by_staff: staffNoShows,
          summary: {
            total_no_shows: result.rows.reduce((sum: number, row: any) => sum + parseInt(row.no_show_count), 0),
            client_no_shows: clientNoShows.length,
            staff_no_shows: staffNoShows.length
          }
        },
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        user_role: currentUser.role
      });

    } catch (error: any) {
      console.error("Error fetching no-show analysis:", error);
      res.status(500).json({ 
        error: "Failed to fetch no-show analysis data",
        details: error.message 
      });
    }
  });

  // GET /api/reports/strategic-insights
  app.get("/api/reports/strategic-insights", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      const currentUser = getCurrentUser(req);
      
      if (!start_date || !end_date) {
        return res.status(400).json({ 
          error: "start_date and end_date query parameters are required" 
        });
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);
      const previousPeriodStart = new Date(startDate.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Generate strategic insights based on data analysis
      const insights = [];

      // 1. Client Retention Insight
      const retentionQuery = sql`
        WITH client_periods AS (
          SELECT DISTINCT 
            client_id,
            'previous' as period
          FROM appointments 
          WHERE start_time >= ${previousPeriodStart}
            AND start_time < ${startDate}
            AND status = 'completed'
            ${currentUser.role === 'staff' ? sql`AND staff_id = ${currentUser.staffId}` : sql``}
          
          UNION ALL
          
          SELECT DISTINCT 
            client_id,
            'current' as period
          FROM appointments 
          WHERE start_time >= ${startDate}
            AND start_time <= ${endDate}
            AND status = 'completed'
            ${currentUser.role === 'staff' ? sql`AND staff_id = ${currentUser.staffId}` : sql``}
        ),
        retention_analysis AS (
          SELECT 
            COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END) as retained_clients,
            COUNT(CASE WHEN was_previous_client > 0 THEN 1 END) as total_previous_clients
          FROM (
            SELECT 
              client_id,
              COUNT(CASE WHEN period = 'previous' THEN 1 END) as was_previous_client,
              COUNT(CASE WHEN period = 'current' THEN 1 END) as is_current_client
            FROM client_periods
            GROUP BY client_id
          ) sub
        )
        SELECT 
          ROUND(
            (retained_clients::decimal / NULLIF(total_previous_clients, 0)) * 100, 2
          ) as retention_rate
        FROM retention_analysis
      `;

      const retentionResult = await db.execute(retentionQuery);
      const retentionRate = parseFloat(retentionResult.rows[0]?.retention_rate || '0');

      if (retentionRate < 70) {
        insights.push({
          type: 'warning',
          category: 'client_retention',
          title: 'Client Retention Alert',
          message: `Client retention is ${retentionRate.toFixed(1)}% this period. Consider implementing a re-engagement campaign.`,
          priority: 'high',
          action: 'Implement client re-engagement strategies'
        });
      }

      // 2. No-Show Rate Insight
      const noShowQuery = sql`
        SELECT 
          COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
          COUNT(*) as total_appointments,
          ROUND(
            (COUNT(CASE WHEN status = 'no_show' THEN 1 END)::decimal / COUNT(*)) * 100, 2
          ) as no_show_rate
        FROM appointments 
        WHERE start_time >= ${startDate}
          AND start_time <= ${endDate}
          ${currentUser.role === 'staff' ? sql`AND staff_id = ${currentUser.staffId}` : sql``}
      `;

      const noShowResult = await db.execute(noShowQuery);
      const noShowRate = parseFloat(noShowResult.rows[0]?.no_show_rate || '0');

      if (noShowRate > 10) {
        insights.push({
          type: 'alert',
          category: 'no_shows',
          title: 'High No-Show Rate',
          message: `No-show rate is ${noShowRate.toFixed(1)}%. Consider implementing reminder systems or deposit requirements.`,
          priority: 'medium',
          action: 'Review booking and reminder processes'
        });
      }

      // 3. Revenue Performance Insight
      const revenueQuery = sql`
        SELECT 
          COALESCE(SUM(total_amount), 0) as current_revenue
        FROM sales_history 
        WHERE payment_status = 'completed'
          AND transaction_date >= ${startDate}
          AND transaction_date <= ${endDate}
          ${currentUser.role === 'staff' ? sql`AND staff_id = ${currentUser.staffId}` : sql``}
      `;

      const revenueResult = await db.execute(revenueQuery);
      const currentRevenue = parseFloat(revenueResult.rows[0]?.current_revenue || '0');

      // Get previous period revenue for comparison
      const prevRevenueQuery = sql`
        SELECT 
          COALESCE(SUM(total_amount), 0) as previous_revenue
        FROM sales_history 
        WHERE payment_status = 'completed'
          AND transaction_date >= ${previousPeriodStart}
          AND transaction_date < ${startDate}
          ${currentUser.role === 'staff' ? sql`AND staff_id = ${currentUser.staffId}` : sql``}
      `;

      const prevRevenueResult = await db.execute(prevRevenueQuery);
      const previousRevenue = parseFloat(prevRevenueResult.rows[0]?.previous_revenue || '0');

      if (previousRevenue > 0) {
        const revenueChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        
        if (revenueChange < -10) {
          insights.push({
            type: 'alert',
            category: 'revenue',
            title: 'Revenue Decline',
            message: `Revenue has decreased by ${Math.abs(revenueChange).toFixed(1)}% compared to the previous period.`,
            priority: 'high',
            action: 'Analyze revenue drivers and implement growth strategies'
          });
        } else if (revenueChange > 20) {
          insights.push({
            type: 'success',
            category: 'revenue',
            title: 'Strong Revenue Growth',
            message: `Revenue has increased by ${revenueChange.toFixed(1)}% compared to the previous period!`,
            priority: 'low',
            action: 'Consider capitalizing on successful strategies'
          });
        }
      }

      // 4. Top Performing Service Insight
      const topServiceQuery = sql`
        SELECT 
          s.name as service_name,
          COUNT(a.id) as appointment_count,
          COALESCE(SUM(a.total_amount), 0) as total_revenue
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.status = 'completed'
          AND a.start_time >= ${startDate}
          AND a.start_time <= ${endDate}
          ${currentUser.role === 'staff' ? sql`AND a.staff_id = ${currentUser.staffId}` : sql``}
        GROUP BY s.id, s.name
        ORDER BY total_revenue DESC
        LIMIT 1
      `;

      const topServiceResult = await db.execute(topServiceQuery);
      const topService = topServiceResult.rows[0] as any;

      if (topService) {
        insights.push({
          type: 'info',
          category: 'service_performance',
          title: 'Top Performing Service',
          message: `"${topService.service_name}" is your top revenue generator with ${formatPrice(parseFloat(topService.total_revenue || '0'))} in revenue.`,
          priority: 'low',
          action: 'Consider promoting related services or products'
        });
      }

      res.json({
        success: true,
        data: {
          insights,
          summary: {
            total_insights: insights.length,
            high_priority: insights.filter(i => i.priority === 'high').length,
            medium_priority: insights.filter(i => i.priority === 'medium').length,
            low_priority: insights.filter(i => i.priority === 'low').length
          }
        },
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        user_role: currentUser.role
      });

    } catch (error: any) {
      console.error("Error generating strategic insights:", error);
      res.status(500).json({ 
        error: "Failed to generate strategic insights",
        details: error.message 
      });
    }
  });

  // GET /api/reports/sales/daily-trend
  app.get("/api/reports/sales/daily-trend", async (req, res) => {
    try {
      const { start_date, end_date, location_id } = req.query;
      const currentUser = getCurrentUser(req);
      
      if (!start_date || !end_date) {
        return res.status(400).json({ 
          error: "start_date and end_date query parameters are required" 
        });
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);
      const locationId = location_id ? parseInt(location_id as string) : null;

      // Daily Sales Trend Query
      const dailyTrendQuery = sql`
        SELECT 
          DATE(sh.transaction_date) as date,
          SUM(sh.total_amount) as total_revenue,
          COUNT(sh.id) as transaction_count,
          SUM(sh.tax_amount) as total_tax,
          SUM(sh.tip_amount) as total_tips,
          SUM(sh.discount_amount) as total_discounts
        FROM sales_history sh
        LEFT JOIN appointments a ON sh.appointment_id = a.id
        WHERE sh.payment_status = 'completed'
          AND sh.transaction_date >= ${startDate}
          AND sh.transaction_date <= ${endDate}
          ${currentUser.role === 'staff' ? sql`AND sh.staff_id = ${currentUser.staffId}` : sql``}
          ${locationId ? sql`AND (a.location_id = ${locationId} OR sh.transaction_type = 'pos_sale')` : sql``}
        GROUP BY DATE(sh.transaction_date)
        ORDER BY date ASC
      `;

      const result = await db.execute(dailyTrendQuery);
      
      res.json({
        success: true,
        data: result.rows,
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        user_role: currentUser.role
      });

    } catch (error: any) {
      console.error("Error fetching daily sales trend:", error);
      res.status(500).json({ 
        error: "Failed to fetch daily sales trend data",
        details: error.message 
      });
    }
  });

  // GET /api/reports/clients/lifetime-value
  app.get("/api/reports/clients/lifetime-value", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      const currentUser = getCurrentUser(req);
      
      if (!start_date || !end_date) {
        return res.status(400).json({ 
          error: "start_date and end_date query parameters are required" 
        });
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);

      // Client Lifetime Value Query
      const lifetimeValueQuery = sql`
        SELECT 
          u.id as client_id,
          u.first_name || ' ' || u.last_name as client_name,
          u.email as client_email,
          COUNT(DISTINCT a.id) as total_appointments,
          COALESCE(SUM(a.total_amount), 0) as total_spent,
          COALESCE(AVG(a.total_amount), 0) as average_ticket,
          MIN(a.start_time) as first_appointment,
          MAX(a.start_time) as last_appointment,
          CASE 
            WHEN COUNT(DISTINCT a.id) = 1 THEN 'one_time'
            WHEN COUNT(DISTINCT a.id) BETWEEN 2 AND 5 THEN 'regular'
            ELSE 'loyal'
          END as client_type
        FROM users u
        LEFT JOIN appointments a ON u.id = a.client_id 
          AND a.status = 'completed'
          AND a.start_time >= ${startDate}
          AND a.start_time <= ${endDate}
          ${currentUser.role === 'staff' ? sql`AND a.staff_id = ${currentUser.staffId}` : sql``}
        WHERE u.role = 'client'
        GROUP BY u.id, u.first_name, u.last_name, u.email
        ORDER BY total_spent DESC
      `;

      const result = await db.execute(lifetimeValueQuery);
      
      res.json({
        success: true,
        data: result.rows,
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        user_role: currentUser.role
      });

    } catch (error: any) {
      console.error("Error fetching client lifetime value:", error);
      res.status(500).json({ 
        error: "Failed to fetch client lifetime value data",
        details: error.message 
      });
    }
  });
} 