import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { asyncHandler } from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";

export function registerPaymentVerificationRoutes(app: Express, storage: IStorage) {
  // Test Helcim API connectivity
  app.get("/api/test-helcim", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    
    // Try to get API token
    let apiToken = process.env.HELCIM_API_TOKEN;
    
    if (!apiToken) {
      try {
        const dbClient: any = (storage as any).db || (await import('../db.js')).db;
        const sql = (await import('drizzle-orm')).sql;
        const result = await dbClient.execute(
          sql`SELECT api_token FROM terminal_configurations WHERE is_active = true ORDER BY updated_at DESC LIMIT 1`
        );
        
        if (result?.rows?.length > 0) {
          const encryptedToken = result.rows[0].api_token;
          const { decrypt } = await import('../utils/encryption.js');
          apiToken = await decrypt(encryptedToken);
        }
      } catch (dbError: any) {
        console.error("Could not fetch API token:", dbError);
      }
    }
    
    if (!apiToken) {
      return res.json({ 
        success: false, 
        message: "No Helcim API token configured" 
      });
    }
    
    // Try to fetch recent transactions (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];
    
    try {
      const helcimUrl = `https://api.helcim.com/v2/card-transactions`;
      const queryParams = new URLSearchParams({
        dateFrom,
        dateTo,
        limit: '10'
      });
      
      const response = await fetch(`${helcimUrl}?${queryParams}`, {
        method: 'GET',
        headers: {
          'api-token': apiToken,
          'Accept': 'application/json'
        }
      });
      
      const responseText = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }
      
      return res.json({
        success: response.ok,
        status: response.status,
        dateFrom,
        dateTo,
        hasToken: !!apiToken,
        tokenLength: apiToken?.length,
        transactionsFound: data?.transactions?.length || data?.data?.length || 0,
        response: data
      });
    } catch (error: any) {
      return res.json({
        success: false,
        error: error.message,
        dateFrom,
        dateTo
      });
    }
  }));
  
  // Verify today's Helcim transactions against appointments
  app.post("/api/verify-helcim-payments", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { date } = req.body; // Optional date parameter, defaults to today
    
    LoggerService.info("Starting Helcim payment verification", context);
    
    try {
      // Try to get API token from environment first
      let apiToken = process.env.HELCIM_API_TOKEN;
      const accountId = process.env.HELCIM_ACCOUNT_ID;
      
      // If not in environment, try to get from terminal configurations
      if (!apiToken) {
        try {
          const dbClient: any = (storage as any).db || (await import('../db.js')).db;
          const sql = (await import('drizzle-orm')).sql;
          const result = await dbClient.execute(
            sql`SELECT api_token FROM terminal_configurations WHERE is_active = true ORDER BY updated_at DESC LIMIT 1`
          );
          
          if (result?.rows?.length > 0) {
            const encryptedToken = result.rows[0].api_token;
            // Decrypt the token
            const { decrypt } = await import('../utils/encryption.js');
            apiToken = await decrypt(encryptedToken);
            LoggerService.info("Using API token from terminal_configurations", { 
              ...context,
              hasToken: !!apiToken 
            });
          }
        } catch (dbError: any) {
          LoggerService.warn("Could not fetch API token from terminal_configurations", { 
            ...context, 
            error: dbError.message 
          });
        }
      }
      
      if (!apiToken) {
        return res.status(500).json({ 
          success: false, 
          message: "Helcim API not configured. Please configure in Settings > Payment Terminal." 
        });
      }
      
      // Get today's date range (or specified date)
      const targetDate = date ? new Date(date) : new Date();
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      
      // Format dates for Helcim API (YYYY-MM-DD)
      const dateFrom = startDate.toISOString().split('T')[0];
      const dateTo = endDate.toISOString().split('T')[0];
      
      LoggerService.info("Fetching Helcim transactions", { 
        ...context, 
        dateFrom, 
        dateTo 
      });
      
      // Fetch transactions from Helcim
      const helcimUrl = `https://api.helcim.com/v2/card-transactions`;
      const queryParams = new URLSearchParams({
        dateFrom,
        dateTo,
        limit: '1000',  // Get more transactions
        ...(accountId ? { accountId } : {})
      });
      
      const helcimResponse = await fetch(`${helcimUrl}?${queryParams}`, {
        method: 'GET',
        headers: {
          'api-token': apiToken,
          'Accept': 'application/json'
        }
      });
      
      // Log the request details for debugging
      LoggerService.info("Helcim API Request", { 
        ...context,
        url: `${helcimUrl}?${queryParams}`,
        hasToken: !!apiToken,
        tokenLength: apiToken?.length,
        tokenPrefix: apiToken?.substring(0, 10)
      });
      
      if (!helcimResponse.ok) {
        const error = await helcimResponse.text();
        LoggerService.error("Failed to fetch Helcim transactions", { 
          ...context, 
          status: helcimResponse.status,
          error 
        });
        return res.status(502).json({ 
          success: false, 
          message: "Failed to fetch Helcim transactions",
          error 
        });
      }
      
      const helcimData = await helcimResponse.json();
      // Helcim returns transactions as a direct array
      const transactions = Array.isArray(helcimData) ? helcimData : 
                          (helcimData.transactions || helcimData.data || []);
      
      LoggerService.info("Fetched Helcim transactions", { 
        ...context, 
        count: transactions.length 
      });
      
      // Get all appointments for the date
      const allAppointments = await storage.getAllAppointments();
      const dayAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.startTime);
        return aptDate >= startDate && aptDate <= endDate;
      });
      
      // Get all payments for matching
      const allPayments = await storage.getAllPayments();
      
      // Match transactions with appointments
      const matched: any[] = [];
      const unmatched: any[] = [];
      const unverifiedAppointments: any[] = [];
      
      // Process each Helcim transaction
      for (const transaction of transactions) {
        const amount = transaction.amount;
        const cardLast4 = transaction.cardNumber?.slice(-4) || 
                         transaction.cardLast4 || 
                         transaction.card?.last4;
        const transactionId = transaction.id || transaction.transactionId;
        const cardType = transaction.cardType || transaction.card?.type || 'card';
        
        // Try to find matching payment/appointment
        let matchFound = false;
        
        // First try to match by Helcim transaction ID
        const paymentByTxId = allPayments.find((p: any) => 
          p.helcimPaymentId === transactionId || 
          p.helcimPaymentId === String(transactionId)
        );
        
        if (paymentByTxId) {
          matched.push({
            transaction,
            appointmentId: paymentByTxId.appointmentId,
            paymentId: paymentByTxId.id,
            matchType: 'transaction_id'
          });
          matchFound = true;
          
          // Update payment with card details if missing
          if (cardLast4 && !paymentByTxId.notes?.includes('cardLast4')) {
            await storage.updatePayment(paymentByTxId.id, {
              notes: JSON.stringify({ 
                ...(paymentByTxId.notes ? JSON.parse(paymentByTxId.notes) : {}),
                cardLast4,
                verified: true,
                verifiedAt: new Date().toISOString()
              })
            });
          }
        }
        
        // If not found by transaction ID, try to match by amount and time
        if (!matchFound) {
          const closeAppointments = dayAppointments.filter((apt: any) => {
            const aptTotal = apt.totalAmount || 0;
            // Allow small variance for tips
            return Math.abs(aptTotal - amount) <= 50 && 
                   apt.paymentStatus === 'paid';
          });
          
          if (closeAppointments.length === 1) {
            const apt = closeAppointments[0];
            matched.push({
              transaction,
              appointmentId: apt.id,
              matchType: 'amount_time'
            });
            matchFound = true;
            
            // Find and update the payment
            const payment = allPayments.find((p: any) => p.appointmentId === apt.id);
            if (payment) {
              await storage.updatePayment(payment.id, {
                helcimPaymentId: transactionId,
                notes: JSON.stringify({
                  cardLast4,
                  verified: true,
                  verifiedAt: new Date().toISOString(),
                  matchType: 'amount_time'
                })
              });
            }
          }
        }
        
        if (!matchFound) {
          unmatched.push(transaction);
        }
      }
      
      // Find appointments marked as paid but without matching Helcim transactions
      for (const apt of dayAppointments) {
        if (apt.paymentStatus === 'paid') {
          const hasMatch = matched.some(m => m.appointmentId === apt.id);
          const payment = allPayments.find((p: any) => p.appointmentId === apt.id);
          
          if (!hasMatch && payment?.method !== 'cash' && payment?.method !== 'gift_card') {
            unverifiedAppointments.push({
              appointmentId: apt.id,
              clientId: apt.clientId,
              totalAmount: apt.totalAmount,
              startTime: apt.startTime,
              paymentId: payment?.id
            });
            
            // Mark payment as unverified
            if (payment) {
              await storage.updatePayment(payment.id, {
                notes: JSON.stringify({
                  ...(payment.notes ? JSON.parse(payment.notes) : {}),
                  verified: false,
                  unverifiedAt: new Date().toISOString(),
                  reason: 'No matching Helcim transaction found'
                })
              });
            }
          }
        }
      }
      
      const summary = {
        success: true,
        date: targetDate.toISOString().split('T')[0],
        helcimTransactions: transactions.length,
        matchedTransactions: matched.length,
        unmatchedTransactions: unmatched.length,
        unverifiedAppointmentsCount: unverifiedAppointments.length,
        totalAppointments: dayAppointments.length,
        paidAppointments: dayAppointments.filter((a: any) => a.paymentStatus === 'paid').length,
        matched,
        unmatched: unmatched.map(t => ({
          id: t.id,
          amount: t.amount,
          cardLast4: t.cardNumber?.slice(-4) || t.cardLast4,
          dateTime: t.dateTime || t.date
        })),
        unverifiedAppointments
      };
      
      LoggerService.info("Payment verification completed", { 
        ...context, 
        ...summary 
      });
      
      res.json(summary);
      
    } catch (error: any) {
      LoggerService.error("Payment verification failed", { 
        ...context, 
        error: error.message 
      });
      res.status(500).json({ 
        success: false, 
        message: "Payment verification failed", 
        error: error.message 
      });
    }
  }));
  
  // Get verification status for a specific appointment
  app.get("/api/appointments/:id/payment-verification", asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = parseInt(req.params.id);
    const context = getLogContext(req);
    
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      return res.status(404).json({ 
        success: false, 
        message: "Appointment not found" 
      });
    }
    
    const allPayments = await storage.getAllPayments();
    const payment = allPayments.find((p: any) => p.appointmentId === appointmentId);
    
    let verificationStatus = 'not_paid';
    let paymentDetails = null;
    
    if (payment) {
      try {
        const notes = payment.notes ? JSON.parse(payment.notes) : {};
        verificationStatus = notes.verified ? 'verified' : 'unverified';
        paymentDetails = {
          method: payment.method,
          cardLast4: notes.cardLast4,
          verifiedAt: notes.verifiedAt,
          unverifiedAt: notes.unverifiedAt,
          reason: notes.reason
        };
      } catch {
        verificationStatus = 'unverified';
      }
    }
    
    res.json({
      appointmentId,
      paymentStatus: appointment.paymentStatus,
      verificationStatus,
      paymentDetails
    });
  }));
}
