import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { asyncHandler } from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";
import { createSalesHistoryRecord } from "./payments.js";

export function registerPaymentMatchingRoutes(app: Express, storage: IStorage) {
  // Enhanced matching endpoint
  app.post("/api/match-helcim-payments", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { date, autoUpdate = false } = req.body;
    
    LoggerService.info("Starting enhanced Helcim payment matching", context);
    
    
      // Get API token from environment or database
      let apiToken = process.env.HELCIM_API_TOKEN;
      const accountId = process.env.HELCIM_ACCOUNT_ID;
      
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
          LoggerService.warn("Could not fetch API token from terminal_configurations", { 
            ...context, 
            error: dbError.message 
          });
        }
      }
      
      if (!apiToken) {
        return res.status(500).json({ 
          success: false, 
          message: "Helcim API not configured" 
        });
      }
      
      // Get date range
      const targetDate = date ? new Date(date) : new Date();
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      
      const dateFrom = startDate.toISOString().split('T')[0];
      const dateTo = endDate.toISOString().split('T')[0];
      
      // Fetch Helcim transactions
      const helcimUrl = `https://api.helcim.com/v2/card-transactions`;
      const queryParams = new URLSearchParams({
        dateFrom,
        dateTo,
        limit: '1000',
        ...(accountId ? { accountId } : {})
      });
      
      const helcimResponse = await fetch(`${helcimUrl}?${queryParams}`, {
        method: 'GET',
        headers: {
          'api-token': apiToken,
          'Accept': 'application/json'
        }
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
      const transactions = Array.isArray(helcimData) ? helcimData : 
                          (helcimData.transactions || helcimData.data || []);
      
      LoggerService.info("Fetched Helcim transactions", { 
        ...context, 
        count: transactions.length 
      });
      
      // Get all appointments and payments for the date
      const allAppointments = await storage.getAllAppointments();
      const dayAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.startTime);
        return aptDate >= startDate && aptDate <= endDate;
      });
      
      const allPayments = await storage.getAllPayments();
      const dayPayments = allPayments.filter((payment: any) => {
        if (!payment.createdAt && !payment.paymentDate) return false;
        const paymentDate = new Date(payment.paymentDate || payment.createdAt);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
      
      // Get all clients for matching by name
      const allClients = await storage.getAllUsers();
      
      // Match transactions with appointments
      const matched: any[] = [];
      const unmatched: any[] = [];
      const possibleMatches: any[] = [];
      
      // Process each Helcim transaction
      for (const transaction of transactions) {
        // Skip verify transactions (they have $0 amount and are just card verifications)
        if (transaction.type === 'verify') {
          continue;
        }
        
        const amount = parseFloat(transaction.amount);
        
        // Skip transactions with 0 or invalid amounts
        if (!amount || amount <= 0) {
          continue;
        }
        
        const cardLast4 = transaction.cardNumber?.slice(-4) || 
                         transaction.cardLast4 || 
                         transaction.card?.last4;
        const transactionId = String(transaction.transactionId || transaction.id);
        const invoiceNumber = transaction.invoiceNumber;
        const customerCode = transaction.customerCode;
        const cardHolderName = transaction.cardHolderName || '';
        const txTime = new Date(transaction.dateCreated || transaction.createdAt);
        
        let bestMatch: any = null;
        let matchConfidence = 0;
        let matchReason = '';
        
        // Strategy 1: Exact transaction ID match
        const paymentByTxId = dayPayments.find((p: any) => 
          p.helcimPaymentId === transactionId || 
          p.helcimPaymentId === parseInt(transactionId)
        );
        
        if (paymentByTxId) {
          bestMatch = {
            type: 'payment',
            payment: paymentByTxId,
            appointmentId: paymentByTxId.appointmentId
          };
          matchConfidence = 100;
          matchReason = 'Exact transaction ID match';
        }
        
        // Strategy 2: Invoice number matches payment ID (highest priority after exact ID match)
        if (!bestMatch && invoiceNumber) {
          // Extract numeric part from invoice number (e.g., INV001162 -> 1162)
          const invoiceNum = parseInt(invoiceNumber.replace(/[^0-9]/g, ''), 10);
          
          // Match payment ID directly - this is our standard format
          if (invoiceNum) {
            const paymentByInvoice = dayPayments.find((p: any) => 
              p.id === invoiceNum || 
              `INV${String(p.id).padStart(6, '0')}` === invoiceNumber
            );
            
            if (paymentByInvoice) {
              bestMatch = {
                type: 'payment',
                payment: paymentByInvoice,
                appointmentId: paymentByInvoice.appointmentId
              };
              matchConfidence = 98; // Very high confidence - this is our standard format
              matchReason = `Invoice ${invoiceNumber} matches payment #${invoiceNum}`;
            }
          }
          
          // Also check if it's a POS format (POS-timestamp) - older format
          if (!bestMatch && invoiceNumber.startsWith('POS-')) {
            // Try to find by checking payment notes
            const paymentWithPOS = dayPayments.find((p: any) => {
              if (p.notes) {
                try {
                  const notes = JSON.parse(p.notes);
                  return notes.invoiceNumber === invoiceNumber;
                } catch (_e) {}
              }
              return false;
            });
            
            if (paymentWithPOS) {
              bestMatch = {
                type: 'payment',
                payment: paymentWithPOS,
                appointmentId: paymentWithPOS.appointmentId
              };
              matchConfidence = 85;
              matchReason = 'POS invoice number match';
            }
          }
        }
        
        // Strategy 3: Customer code matches client ID
        if (!bestMatch && customerCode) {
          const customerNum = customerCode.replace(/[^0-9]/g, '');
          const appointment = dayAppointments.find((apt: any) => 
            String(apt.clientId) === customerNum ||
            'CST' + apt.clientId === customerCode
          );
          
          if (appointment) {
            bestMatch = {
              type: 'appointment',
              appointment,
              appointmentId: appointment.id
            };
            matchConfidence = 85;
            matchReason = 'Customer code matches client ID';
          }
        }
        
        // Strategy 4: Card holder name match
        if (!bestMatch && cardHolderName && cardHolderName.length > 2) {
          // Normalize the name for comparison
          const normalizedCardName = cardHolderName.toLowerCase().trim();
          
          for (const apt of dayAppointments) {
            if (apt.paymentStatus !== 'paid') continue;
            
            const client = allClients.find((c: any) => c.id === apt.clientId);
            if (client) {
              const clientFullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
              const clientFirstLast = `${client.firstName || ''} ${client.lastName ? client.lastName.charAt(0) : ''}.`.toLowerCase();
              const clientLastFirst = `${client.lastName || ''}, ${client.firstName || ''}`.toLowerCase();
              
              // Check various name formats
              if (clientFullName === normalizedCardName ||
                  clientFirstLast === normalizedCardName ||
                  clientLastFirst === normalizedCardName ||
                  (client.lastName && normalizedCardName.includes(client.lastName.toLowerCase())) ||
                  clientFullName.includes(normalizedCardName)) {
                
                // Also check if amount matches
                if (Math.abs((apt.totalAmount || 0) - amount) < 5) {
                  bestMatch = {
                    type: 'appointment',
                    appointment: apt,
                    appointmentId: apt.id
                  };
                  matchConfidence = 85;
                  matchReason = `Name and amount match (${cardHolderName})`;
                  break;
                }
              }
            }
          }
        }
        
        // Strategy 5: Amount + Time window match (with tip tolerance)
        if (!bestMatch) {
          // Find appointments within 4 hours of transaction time
          const timeWindowMatches = dayAppointments.filter((apt: any) => {
            const aptTime = new Date(apt.startTime);
            const timeDiff = Math.abs(txTime.getTime() - aptTime.getTime());
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            return hoursDiff <= 4 && apt.paymentStatus === 'paid';
          });
          
          // First try to match with tip tolerance
          for (const apt of timeWindowMatches) {
            // Skip if already has a Helcim payment ID
            const existingPayment = dayPayments.find((p: any) => p.appointmentId === apt.id);
            if (existingPayment?.helcimPaymentId) continue;
            
            const baseAmount = apt.totalAmount || 0;
            const possibleTip = amount - baseAmount;
            const tipPercentage = baseAmount > 0 ? (possibleTip / baseAmount) * 100 : 0;
            
            // Check if the tip is reasonable (0-35% of base amount, or within $25)
            const reasonableTip = possibleTip >= -0.50 && // Allow small rounding differences
                                 (tipPercentage <= 35 || possibleTip <= 25);
            
            if (reasonableTip && possibleTip >= -0.50 && possibleTip <= 50) {
              const aptTime = new Date(apt.startTime);
              const timeDiff = Math.abs(txTime.getTime() - aptTime.getTime());
              const hoursDiff = timeDiff / (1000 * 60 * 60);
              
              bestMatch = {
                type: 'appointment',
                appointment: apt,
                appointmentId: apt.id,
                tipAmount: possibleTip > 0 ? possibleTip : 0
              };
              // Higher confidence if time is very close and tip is reasonable
              if (hoursDiff <= 1 && possibleTip >= 0) {
                matchConfidence = 90;
              } else if (hoursDiff <= 2 && possibleTip >= 0) {
                matchConfidence = 85;
              } else {
                matchConfidence = 75;
              }
              matchReason = possibleTip > 0.50 
                ? `Amount with $${possibleTip.toFixed(2)} tip (${tipPercentage.toFixed(0)}%)`
                : 'Amount match within time window';
              break;
            }
          }
          
          // If no tip match found, try exact amount matches
          if (!bestMatch) {
            const exactAmountMatches = timeWindowMatches.filter((apt: any) => {
              const existingPayment = dayPayments.find((p: any) => p.appointmentId === apt.id);
              if (existingPayment?.helcimPaymentId) return false;
              return Math.abs((apt.totalAmount || 0) - amount) < 0.01;
            });
            
            if (exactAmountMatches.length === 1) {
              bestMatch = {
                type: 'appointment',
                appointment: exactAmountMatches[0],
                appointmentId: exactAmountMatches[0].id
              };
              matchConfidence = 80;
              matchReason = 'Exact amount and time window match';
            } else if (exactAmountMatches.length > 1) {
            // Multiple matches, try to narrow down by cardholder name
            if (cardHolderName) {
              for (const apt of exactAmountMatches) {
                const client = allClients.find((c: any) => c.id === apt.clientId);
                if (client) {
                  const clientName = `${client.firstName} ${client.lastName}`.toLowerCase();
                  if (clientName.includes(cardHolderName) || cardHolderName.includes(clientName)) {
                    bestMatch = {
                      type: 'appointment',
                      appointment: apt,
                      appointmentId: apt.id
                    };
                    matchConfidence = 85;
                    matchReason = 'Amount, time window, and name match';
                    break;
                  }
                }
              }
            }
            
            // If still no match, record as possible matches
            if (!bestMatch && exactAmountMatches.length > 0) {
              possibleMatches.push({
                transaction,
                possibleAppointments: exactAmountMatches.map((apt: any) => ({
                  id: apt.id,
                  clientId: apt.clientId,
                  time: apt.startTime,
                  amount: apt.totalAmount
                })),
                reason: 'Multiple appointments with same amount'
              });
            }
          }
        }
        
        // Strategy 5: Fuzzy amount match (tips)
        if (!bestMatch) {
          const fuzzyMatches = dayAppointments.filter((apt: any) => {
            const aptAmount = apt.totalAmount || 0;
            const diff = amount - aptAmount;
            // Allow up to 30% tip or $20 difference
            return diff >= 0 && diff <= Math.max(aptAmount * 0.3, 20) && 
                   apt.paymentStatus === 'paid';
          });
          
          if (fuzzyMatches.length === 1) {
            bestMatch = {
              type: 'appointment',
              appointment: fuzzyMatches[0],
              appointmentId: fuzzyMatches[0].id
            };
            matchConfidence = 70;
            matchReason = `Amount with possible tip ($${(amount - (fuzzyMatches[0].totalAmount || 0)).toFixed(2)})`;
          }
        }
        
        // Strategy 6: Card last 4 digits match
        if (!bestMatch && cardLast4) {
          const paymentWithCard = dayPayments.find((p: any) => {
            if (p.notes) {
              try {
                const notes = JSON.parse(p.notes);
                return notes.cardLast4 === cardLast4;
              } catch (_e) {
                return false;
              }
            }
            return false;
          });
          
          if (paymentWithCard) {
            bestMatch = {
              type: 'payment',
              payment: paymentWithCard,
              appointmentId: paymentWithCard.appointmentId
            };
            matchConfidence = 75;
            matchReason = 'Card last 4 digits match';
          }
        }
        
        // Process the match
        if (bestMatch) {
          const matchData = {
            transaction,
            appointmentId: bestMatch.appointmentId,
            confidence: matchConfidence,
            matchReason,
            helcimTransactionId: transactionId,
            amount,
            cardLast4,
            cardHolderName: transaction.cardHolderName,
            cardType: transaction.cardType
          };
          
          matched.push(matchData);
          
          // Update the payment/appointment if requested
          if (autoUpdate && matchConfidence >= 70) {
            try {
              // Find or create payment record
              let payment = dayPayments.find((p: any) => 
                p.appointmentId === bestMatch.appointmentId
              );
              
              if (!payment) {
                // Create payment record
                const tipAmount = (bestMatch as any).tipAmount || 0;
                const baseAmount = amount - tipAmount;
                payment = await storage.createPayment({
                  clientId: bestMatch.appointment?.clientId || 0, // Add required clientId
                  appointmentId: bestMatch.appointmentId,
                  amount: baseAmount,
                  tipAmount: tipAmount,
                  totalAmount: amount,
                  method: 'card',
                  status: 'completed',
                  type: 'appointment',
                  helcimPaymentId: transactionId,
                  paymentDate: new Date(transaction.dateCreated || transaction.createdAt),
                  notes: JSON.stringify({
                    cardLast4,
                    cardType: transaction.cardType,
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                    matchConfidence,
                    matchReason,
                    helcimAmount: amount,
                    detectedTip: tipAmount
                  })
                });
              } else {
                // Update existing payment
                const tipAmount = (bestMatch as any).tipAmount || 0;
                await storage.updatePayment(payment.id, {
                  helcimPaymentId: transactionId,
                  status: 'completed',
                  tipAmount: tipAmount > 0 ? tipAmount : (payment.tipAmount || 0),
                  totalAmount: amount,
                  notes: JSON.stringify({
                    ...(payment.notes ? JSON.parse(payment.notes) : {}),
                    cardLast4,
                    cardType: transaction.cardType,
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                    matchConfidence,
                    matchReason,
                    helcimAmount: amount,
                    detectedTip: tipAmount
                  })
                });
              }
              
              // Get the tip amount that was detected/calculated
              const detectedTipAmount = (bestMatch as any).tipAmount || payment.tipAmount || 0;
              
              // Update appointment payment status
              if (bestMatch.appointment) {
                await storage.updateAppointment(bestMatch.appointmentId, {
                  paymentStatus: 'paid',
                  totalAmount: amount
                });
              }
              
              // Create or update sales history record with tip amount
              try {
                // Check if sales history exists for this payment
                const salesHistoryRecords = await storage.getAllSalesHistory();
                const existingSalesHistory = salesHistoryRecords.find((sh: any) => 
                  sh.paymentId === payment.id
                );
                
                if (existingSalesHistory) {
                  // Update existing sales history with tip amount
                  await storage.updateSalesHistory(existingSalesHistory.id, {
                    tipAmount: detectedTipAmount,
                    totalAmount: amount,
                    helcimPaymentId: transactionId,
                    notes: `Matched from Helcim terminal. Tip: $${(detectedTipAmount).toFixed(2)}`
                  });
                  console.log('📊 Updated sales history with tip:', { 
                    salesHistoryId: existingSalesHistory.id, 
                    tipAmount: detectedTipAmount,
                    totalAmount: amount
                  });
                } else {
                  // Create new sales history record
                  await createSalesHistoryRecord(storage, payment, 'appointment', {
                    checkoutTime: new Date(transaction.dateCreated || transaction.createdAt)
                  });
                  console.log('📊 Created sales history with tip:', { 
                    paymentId: payment.id, 
                    tipAmount: detectedTipAmount,
                    totalAmount: amount
                  });
                }
              } catch (salesError) {
                console.error('Failed to create/update sales history:', salesError);
                // Don't fail the entire operation if sales history fails
              }
              
              (matchData as any).updated = true;
            } catch (updateError: any) {
              LoggerService.error("Failed to update payment record", {
                ...context,
                appointmentId: bestMatch.appointmentId,
                error: updateError.message
              });
              (matchData as any).updateError = updateError.message;
            }
          }
        } else {
          unmatched.push({
            transaction,
            amount,
            cardLast4,
            cardHolderName: transaction.cardHolderName,
            invoiceNumber,
            customerCode,
            dateCreated: transaction.dateCreated
          });
        }
      }
      
      // Find unverified appointments
      const unverifiedAppointments: any[] = [];
      for (const apt of dayAppointments) {
        if (apt.paymentStatus === 'paid') {
          const hasMatch = matched.some(m => m.appointmentId === apt.id);
          const payment = dayPayments.find((p: any) => p.appointmentId === apt.id);
          
          // Skip cash and gift card payments
          if (payment?.method === 'cash' || payment?.method === 'gift_card') {
            continue;
          }
          
          if (!hasMatch) {
            const client = allClients.find((c: any) => c.id === apt.clientId);
            unverifiedAppointments.push({
              appointmentId: apt.id,
              clientId: apt.clientId,
              clientName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Unknown',
              totalAmount: apt.totalAmount,
              startTime: apt.startTime,
              paymentId: payment?.id,
              paymentMethod: payment?.method || (apt as any).paymentMethod
            });
          }
        }
      }
      
      // Summary statistics
      const summary = {
        helcimTransactions: transactions.length,
        matched: matched.length,
        unmatched: unmatched.length,
        possibleMatches: possibleMatches.length,
        unverifiedAppointments: unverifiedAppointments.length,
        matchRates: {
          high: matched.filter(m => m.confidence >= 90).length,
          medium: matched.filter(m => m.confidence >= 70 && m.confidence < 90).length,
          low: matched.filter(m => m.confidence < 70).length
        }
      };
      
      LoggerService.info("Payment matching completed", { 
        ...context,
        ...summary
      });
      
      return res.json({
        success: true,
        date: dateFrom,
        summary,
        matched,
        unmatched,
        possibleMatches,
        unverifiedAppointments,
        autoUpdate
      });
    }
  }));
  
  // Manual match endpoint
  app.post("/api/manual-match-payment", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { transactionId, appointmentId, amount, cardLast4 } = req.body;
    
    try {
      // Get appointment
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found"
        });
      }
      
      // Find or create payment
      const allPayments = await storage.getAllPayments();
      let payment = allPayments.find((p: any) => p.appointmentId === appointmentId);
      
      if (!payment) {
        payment = await storage.createPayment({
          clientId: appointment.clientId || 0,
          appointmentId,
          amount: amount || appointment.totalAmount,
          totalAmount: amount || appointment.totalAmount,
          method: 'card',
          status: 'completed',
          type: 'appointment',
          helcimPaymentId: transactionId,
          paymentDate: new Date(),
          notes: JSON.stringify({
            cardLast4,
            verified: true,
            verifiedAt: new Date().toISOString(),
            matchType: 'manual'
          })
        });
      } else {
        await storage.updatePayment(payment.id, {
          helcimPaymentId: transactionId,
          status: 'completed',
          notes: JSON.stringify({
            ...(payment.notes ? JSON.parse(payment.notes) : {}),
            cardLast4,
            verified: true,
            verifiedAt: new Date().toISOString(),
            matchType: 'manual'
          })
        });
      }
      
      // Update appointment
      await storage.updateAppointment(appointmentId, {
        paymentStatus: 'paid'
      });
      
      LoggerService.info("Manual payment match completed", {
        ...context,
        transactionId,
        appointmentId
      });
      
      return res.json({
        success: true,
        message: "Payment matched successfully",
        payment
      });
      
    } catch (error: any) {
      LoggerService.error("Manual payment match failed", {
        ...context,
        error: error.message
      });
      return res.status(500).json({
        success: false,
        message: "Failed to match payment",
        error: error.message
      });
    }
  }));
}
