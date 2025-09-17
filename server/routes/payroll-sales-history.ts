import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';

export function registerPayrollSalesHistoryRoutes(app: any, storage: IStorage) {
  // New endpoint that uses sales_history for accurate payroll
  app.get('/api/payroll/sales-history', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, staffId } = req.query;
      
      // Parse dates
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Get all sales history in date range
      const salesHistory = await storage.getSalesHistoryByDateRange(start, end);
      
      // Get all staff members
      const allStaff = await storage.getAllStaff();
      
      // Get all users for name mapping
      const allUsers = await storage.getAllUsers();
      
      // Create a map of staff names to staff IDs
      const staffNameToId = new Map();
      const staffIdToUser = new Map();
      
      for (const staff of allStaff) {
        const user = allUsers.find(u => u.id === staff.userId);
        if (user) {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          const email = user.email;
          
          // Map various name formats
          staffNameToId.set(fullName.toLowerCase(), staff.id);
          staffNameToId.set(email.toLowerCase(), staff.id);
          staffIdToUser.set(staff.id, user);
          
          // Also map by first name only or last name only
          if (user.firstName) {
            staffNameToId.set(user.firstName.toLowerCase(), staff.id);
          }
          if (user.lastName) {
            staffNameToId.set(user.lastName.toLowerCase(), staff.id);
          }
        }
      }
      
      // Group sales by staff member
      const payrollByStaff = new Map();
      
      for (const sale of salesHistory) {
        // Skip transactions without staff assignment
        if (!sale.staffName || sale.staffName === 'NEEDS ASSIGNMENT') {
          continue;
        }
        
        // Try to find staff ID from staff name
        let staffId = null;
        const staffNameLower = sale.staffName.toLowerCase().trim();
        
        // Direct lookup
        if (staffNameToId.has(staffNameLower)) {
          staffId = staffNameToId.get(staffNameLower);
        } else {
          // Try partial matches
          for (const [name, id] of staffNameToId.entries()) {
            if (staffNameLower.includes(name) || name.includes(staffNameLower)) {
              staffId = id;
              break;
            }
          }
        }
        
        // If we found a staff ID, add to their payroll
        if (staffId) {
          if (!payrollByStaff.has(staffId)) {
            payrollByStaff.set(staffId, {
              staffId,
              staffName: sale.staffName,
              transactions: [],
              totalRevenue: 0,
              totalTips: 0,
              transactionCount: 0
            });
          }
          
          const staffPayroll = payrollByStaff.get(staffId);
          staffPayroll.transactions.push({
            id: sale.id,
            date: sale.transactionDate,
            clientName: sale.clientName,
            serviceNames: sale.serviceNames,
            amount: sale.totalAmount - (sale.tipAmount || 0),
            tip: sale.tipAmount || 0,
            total: sale.totalAmount,
            transactionType: sale.transactionType,
            paymentMethod: sale.paymentMethod,
            helcimPaymentId: sale.helcimPaymentId
          });
          
          staffPayroll.totalRevenue += sale.totalAmount - (sale.tipAmount || 0);
          staffPayroll.totalTips += sale.tipAmount || 0;
          staffPayroll.transactionCount++;
        }
      }
      
      // Convert map to array and add staff details
      const payrollData = [];
      for (const [staffId, data] of payrollByStaff) {
        const staff = allStaff.find(s => s.id === staffId);
        const user = staffIdToUser.get(staffId);
        
        if (staff && user) {
          // Calculate commission based on staff settings
          let totalCommission = 0;
          let totalHourlyPay = 0;
          
          switch (staff.commissionType) {
            case 'commission':
              totalCommission = data.totalRevenue * (staff.commissionRate || 0);
              break;
            case 'hourly':
              // Estimate hours based on transaction count (you may want to adjust this)
              const estimatedHours = data.transactionCount * 1; // 1 hour per service
              totalHourlyPay = estimatedHours * (staff.hourlyRate || 0);
              break;
            case 'fixed':
              totalCommission = data.transactionCount * (staff.fixedRate || 0);
              break;
            case 'hourly_plus_commission':
              const hours = data.transactionCount * 1;
              totalHourlyPay = hours * (staff.hourlyRate || 0);
              totalCommission = data.totalRevenue * (staff.commissionRate || 0);
              break;
          }
          
          payrollData.push({
            staffId: staff.id,
            staffName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            transactions: data.transactions,
            totalRevenue: data.totalRevenue,
            totalTips: data.totalTips,
            totalCommission,
            totalHourlyPay,
            totalEarnings: totalCommission + totalHourlyPay + data.totalTips,
            transactionCount: data.transactionCount,
            commissionType: staff.commissionType,
            commissionRate: staff.commissionRate,
            hourlyRate: staff.hourlyRate,
            fixedRate: staff.fixedRate
          });
        }
      }
      
      // Filter by specific staff if requested
      if (staffId) {
        const filteredData = payrollData.filter(p => p.staffId === parseInt(staffId as string));
        return res.json(filteredData);
      }
      
      res.json(payrollData);
      
    } catch (error) {
      console.error('Error fetching payroll from sales history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch payroll data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Detailed view for a specific staff member
  app.get('/api/payroll/sales-history/:staffId/detailed', async (req: Request, res: Response) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const { month } = req.query;
      
      const monthDate = month ? new Date(month as string) : new Date();
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Get staff member details
      const staff = await storage.getStaff(staffId);
      if (!staff) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      
      const user = await storage.getUserById(staff.userId);
      const staffName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown';
      
      // Get sales history for this staff member
      const allSales = await storage.getSalesHistoryByDateRange(start, end);
      
      // Filter for this staff member's transactions
      const staffTransactions = allSales.filter(sale => {
        if (!sale.staffName) return false;
        
        const saleName = sale.staffName.toLowerCase().trim();
        const userFullName = staffName.toLowerCase();
        const userFirstName = (user?.firstName || '').toLowerCase();
        const userLastName = (user?.lastName || '').toLowerCase();
        const userEmail = (user?.email || '').toLowerCase();
        
        return saleName === userFullName ||
               saleName === userEmail ||
               saleName.includes(userFirstName) ||
               saleName.includes(userLastName) ||
               userFullName.includes(saleName);
      });
      
      // Calculate totals and prepare detailed rows
      let totalRevenue = 0;
      let totalTips = 0;
      let totalCommission = 0;
      let totalHourlyPay = 0;
      
      const detailedTransactions = staffTransactions.map(sale => {
        const revenue = sale.totalAmount - (sale.tipAmount || 0);
        const tip = sale.tipAmount || 0;
        
        totalRevenue += revenue;
        totalTips += tip;
        
        // Calculate commission for this transaction
        let commission = 0;
        let hourlyPay = 0;
        
        switch (staff.commissionType) {
          case 'commission':
            commission = revenue * (staff.commissionRate || 0);
            break;
          case 'hourly':
            hourlyPay = staff.hourlyRate || 0; // 1 hour per service
            break;
          case 'fixed':
            commission = staff.fixedRate || 0;
            break;
          case 'hourly_plus_commission':
            hourlyPay = staff.hourlyRate || 0;
            commission = revenue * (staff.commissionRate || 0);
            break;
        }
        
        totalCommission += commission;
        totalHourlyPay += hourlyPay;
        
        return {
          id: sale.id,
          date: sale.transactionDate,
          clientName: sale.clientName || 'Unknown',
          serviceName: sale.serviceNames || sale.transactionType || 'Service',
          servicePrice: revenue,
          tip,
          commission,
          hourlyPay,
          total: commission + hourlyPay + tip,
          paymentMethod: sale.paymentMethod,
          transactionType: sale.transactionType,
          helcimPaymentId: sale.helcimPaymentId
        };
      });
      
      res.json({
        staffId,
        staffName,
        title: staff.title || 'Staff',
        month: monthDate.toISOString(),
        transactions: detailedTransactions,
        totalRevenue,
        totalTips,
        totalCommission,
        totalHourlyPay,
        totalEarnings: totalCommission + totalHourlyPay + totalTips,
        transactionCount: staffTransactions.length,
        commissionType: staff.commissionType,
        commissionRate: staff.commissionRate,
        hourlyRate: staff.hourlyRate,
        fixedRate: staff.fixedRate
      });
      
    } catch (error) {
      console.error('Error fetching detailed payroll:', error);
      res.status(500).json({ 
        error: 'Failed to fetch detailed payroll data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}










