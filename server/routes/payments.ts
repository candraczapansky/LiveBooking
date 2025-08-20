import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage";
import { z } from "zod";
import { insertPaymentSchema, insertSavedPaymentMethodSchema } from "../../shared/schema";
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  ExternalServiceError,
  asyncHandler 
} from "../utils/errors";
import LoggerService, { getLogContext } from "../utils/logger";
import { validateRequest, requireAuth } from "../middleware/error-handler";

import cache, { invalidateCache } from "../utils/cache";

// Move this function to the top level
async function createSalesHistoryRecord(storage: IStorage, paymentData: any, transactionType: string, additionalData?: any) {
  console.log('createSalesHistoryRecord called with:', { paymentData: paymentData.id, transactionType });
  try {
    const transactionDate = new Date();
    const businessDate = transactionDate.toISOString().split('T')[0];
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][transactionDate.getDay()];
    const monthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
    const quarter = `${transactionDate.getFullYear()}-Q${Math.ceil((transactionDate.getMonth() + 1) / 3)}`;

    let clientInfo = null;
    let staffInfo = null;
    let appointmentInfo = null;
    let serviceInfo = null;

    // Get client information if clientId exists
    if (paymentData.clientId) {
      clientInfo = await storage.getUser(paymentData.clientId);
    }

    // Get appointment and service information for appointment payments
    if (paymentData.appointmentId && transactionType === 'appointment') {
      appointmentInfo = await storage.getAppointment(paymentData.appointmentId);
      if (appointmentInfo) {
        serviceInfo = await storage.getService(appointmentInfo.serviceId);
        if (appointmentInfo.staffId) {
          const staffData = await storage.getStaff(appointmentInfo.staffId);
          if (staffData) {
            const staffUser = await storage.getUser(staffData.userId);
            staffInfo = { ...staffData, user: staffUser };
          }
        }
      }
    }

    const salesHistoryData = {
      transactionType,
      transactionDate,
      paymentId: paymentData.id,
      totalAmount: paymentData.totalAmount || paymentData.amount,
      paymentMethod: paymentData.method,
      paymentStatus: paymentData.status,
      
      // Client information
      clientId: clientInfo?.id || null,
      clientName: clientInfo ? `${clientInfo.firstName || ''} ${clientInfo.lastName || ''}`.trim() : null,
      clientEmail: clientInfo?.email || null,
      clientPhone: clientInfo?.phone || null,
      
      // Staff information
      staffId: staffInfo?.id || null,
      staffName: staffInfo?.user ? `${staffInfo.user.firstName || ''} ${staffInfo.user.lastName || ''}`.trim() : null,
      
      // Appointment and service information
      appointmentId: appointmentInfo?.id || null,
      serviceIds: serviceInfo ? JSON.stringify([serviceInfo.id]) : null,
      serviceNames: serviceInfo ? JSON.stringify([serviceInfo.name]) : null,
      serviceTotalAmount: transactionType === 'appointment' ? (paymentData.totalAmount || paymentData.amount) : null,
      
      // POS information
      productIds: additionalData?.productIds || null,
      productNames: additionalData?.productNames || null,
      productQuantities: additionalData?.productQuantities || null,
      productUnitPrices: additionalData?.productUnitPrices || null,
      productTotalAmount: transactionType === 'pos_sale' ? (paymentData.totalAmount || paymentData.amount) : null,
      
      // Membership information
      membershipId: additionalData?.membershipId || null,
      membershipName: additionalData?.membershipName || null,
      membershipDuration: additionalData?.membershipDuration || null,
      
      // Business insights
      businessDate,
      dayOfWeek,
      monthYear,
      quarter,
      
      // External tracking
      helcimPaymentId: paymentData.helcimPaymentId || null,
      
      // Audit
      createdBy: null, // Could be set to current user ID if available
      notes: paymentData.notes || null
    };

    const salesHistory = await storage.createSalesHistory(salesHistoryData);
    console.log('Sales history record created:', salesHistory.id);
    return salesHistory;
  } catch (error) {
    console.error('Error creating sales history record:', error);
    // Don't throw error to prevent breaking payment flow
  }
}

export function registerPaymentRoutes(app: Express, storage: IStorage) {
  // Helcim payment processing is handled in the main routes

  // Create payment
  app.post("/api/payments", validateRequest(insertPaymentSchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const paymentData = req.body;

    LoggerService.logPayment("create", paymentData.amount, context);

    const newPayment = await storage.createPayment(paymentData);

    // Invalidate relevant caches
    invalidateCache('payments');
    invalidateCache(`user:${paymentData.clientId}`);

    res.status(201).json(newPayment);
  }));

  // Get all payments
  app.get("/api/payments", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { clientId, staffId, startDate, endDate, status } = req.query;

    LoggerService.debug("Fetching payments", { ...context, filters: { clientId, staffId, startDate, endDate, status } });

    let payments;
    if (clientId) {
      payments = await storage.getPaymentsByClient(parseInt(clientId as string));
    } else if (staffId) {
      // Note: getPaymentsByStaff doesn't exist, so we'll get all payments and filter
      const allPayments = await storage.getAllPayments();
      payments = allPayments.filter(p => p.staffId === parseInt(staffId as string));
    } else if (startDate && endDate) {
      // Note: getPaymentsByDateRange doesn't exist, so we'll get all payments and filter
      const allPayments = await storage.getAllPayments();
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      payments = allPayments.filter(p => {
        const paymentDate = p.paymentDate ? new Date(p.paymentDate) : new Date();
        return paymentDate >= start && paymentDate <= end;
      });
    } else if (status) {
      // Note: getPaymentsByStatus doesn't exist, so we'll get all payments and filter
      const allPayments = await storage.getAllPayments();
      payments = allPayments.filter(p => p.status === status);
    } else {
      payments = await storage.getAllPayments();
    }

    LoggerService.info("Payments fetched", { ...context, count: payments.length });
    res.json(payments);
  }));

  // Update payment
  app.put("/api/payments/:id", validateRequest(insertPaymentSchema.partial()), asyncHandler(async (req: Request, res: Response) => {
    const paymentId = parseInt(req.params.id);
    const context = getLogContext(req);
    const updateData = req.body;

    LoggerService.logPayment("update", updateData.amount, context);

    const existingPayment = await storage.getPayment(paymentId);
    if (!existingPayment) {
      throw new NotFoundError("Payment");
    }

    const updatedPayment = await storage.updatePayment(paymentId, updateData);

    // Invalidate relevant caches
    invalidateCache('payments');
    invalidateCache(`payment:${paymentId}`);

    res.json(updatedPayment);
  }));

  // Confirm cash payment
  app.post("/api/confirm-cash-payment", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { appointmentId, amount, notes } = req.body;

    LoggerService.logPayment("cash_payment", amount, context);

    // Get appointment details
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    // Create payment record
    const payment = await storage.createPayment({
      appointmentId,
      clientId: appointment.clientId,
      amount,
      totalAmount: amount,
      method: 'cash',
      status: 'completed',
      notes: notes || 'Cash payment',
      processedAt: new Date(),
    });

    // Update appointment payment status
    await storage.updateAppointment(appointmentId, {
      paymentStatus: 'paid',
      totalAmount: amount,
    });

    // Create staff earnings record for payroll
    try {
      const service = await storage.getService(appointment.serviceId);
      const staffMember = await storage.getStaff(appointment.staffId);
      
      if (service && staffMember) {
        // Calculate staff earnings
        let earningsAmount = 0;
        let rateType = 'commission';
        let rateUsed = 0;
        let calculationDetails = '';

        switch (staffMember.commissionType) {
          case 'commission': {
            const commissionRate = staffMember.commissionRate || 0;
            earningsAmount = service.price * commissionRate;
            rateUsed = commissionRate;
            calculationDetails = JSON.stringify({
              type: 'commission',
              servicePrice: service.price,
              commissionRate: commissionRate,
              earnings: earningsAmount
            });
            break;
          }
          case 'hourly': {
            const hourlyRate = staffMember.hourlyRate || 0;
            const serviceDuration = service.duration || 60;
            const hours = serviceDuration / 60;
            earningsAmount = hourlyRate * hours;
            rateType = 'hourly';
            rateUsed = hourlyRate;
            calculationDetails = JSON.stringify({
              type: 'hourly',
              servicePrice: service.price,
              hourlyRate: hourlyRate,
              serviceDuration: serviceDuration,
              hours: hours,
              earnings: earningsAmount
            });
            break;
          }
          case 'fixed': {
            const fixedRate = staffMember.fixedRate || 0;
            earningsAmount = fixedRate;
            rateType = 'fixed';
            rateUsed = fixedRate;
            calculationDetails = JSON.stringify({
              type: 'fixed',
              servicePrice: service.price,
              fixedRate: fixedRate,
              earnings: earningsAmount
            });
            break;
          }
          case 'hourly_plus_commission': {
            const hourlyRate = staffMember.hourlyRate || 0;
            const commissionRate = staffMember.commissionRate || 0;
            const serviceDuration = service.duration || 60;
            const hours = serviceDuration / 60;
            const hourlyPortion = hourlyRate * hours;
            const commissionPortion = service.price * commissionRate;
            earningsAmount = hourlyPortion + commissionPortion;
            rateType = 'hourly_plus_commission';
            rateUsed = hourlyRate;
            calculationDetails = JSON.stringify({
              type: 'hourly_plus_commission',
              servicePrice: service.price,
              hourlyRate: hourlyRate,
              commissionRate: commissionRate,
              serviceDuration: serviceDuration,
              hours: hours,
              hourlyPortion: hourlyPortion,
              commissionPortion: commissionPortion,
              earnings: earningsAmount
            });
            break;
          }
          default:
            earningsAmount = 0;
            calculationDetails = JSON.stringify({
              type: 'unknown',
              servicePrice: service.price,
              earnings: 0
            });
        }

        // Create staff earnings record
        if (earningsAmount > 0) {
          await storage.createStaffEarnings({
            staffId: appointment.staffId,
            appointmentId: appointmentId,
            serviceId: appointment.serviceId,
            paymentId: payment.id,
            earningsAmount: earningsAmount,
            rateType: rateType,
            rateUsed: rateUsed,
            isCustomRate: false,
            servicePrice: service.price,
            calculationDetails: calculationDetails,
            earningsDate: new Date()
          });

          LoggerService.logPayment("staff_earnings_created", earningsAmount, { 
            ...context, 
            paymentId: payment.id, 
            staffId: appointment.staffId,
            appointmentId 
          });
        }
      }
    } catch (error) {
      LoggerService.error("Failed to create staff earnings record", { 
        ...context, 
        paymentId: payment.id, 
        appointmentId, 
        error: error.message 
      });
      // Don't fail the payment confirmation if earnings creation fails
    }

    LoggerService.logPayment("cash_payment_confirmed", amount, { ...context, paymentId: payment.id });

    res.json({ success: true, payment });
  }));

  // Confirm gift card payment
  app.post("/api/confirm-gift-card-payment", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { appointmentId, giftCardCode, amount, notes } = req.body;

    LoggerService.logPayment("gift_card_payment", amount, context);

    // Validate gift card
    const giftCard = await storage.getGiftCardByCode(giftCardCode);
    if (!giftCard) {
      throw new ValidationError("Invalid gift card code");
    }

    if (giftCard.currentBalance < amount) {
      throw new ValidationError("Insufficient gift card balance");
    }

    // Get appointment details
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    // Create payment record
    const payment = await storage.createPayment({
      appointmentId,
      clientId: appointment.clientId,
      amount,
      totalAmount: amount,
      method: 'gift_card',
      status: 'completed',
      notes: notes || `Gift card payment - Code: ${giftCardCode}`,
      processedAt: new Date(),
    });

    // Update gift card balance
    await storage.updateGiftCard(giftCard.id, {
      currentBalance: giftCard.currentBalance - amount,
    });

    // Update appointment payment status
    await storage.updateAppointment(appointmentId, {
      paymentStatus: 'paid',
      totalAmount: amount,
    });

    // Create staff earnings record for payroll
    try {
      const service = await storage.getService(appointment.serviceId);
      const staffMember = await storage.getStaff(appointment.staffId);
      
      if (service && staffMember) {
        // Calculate staff earnings
        let earningsAmount = 0;
        let rateType = 'commission';
        let rateUsed = 0;
        let calculationDetails = '';

        switch (staffMember.commissionType) {
          case 'commission': {
            const commissionRate = staffMember.commissionRate || 0;
            earningsAmount = service.price * commissionRate;
            rateUsed = commissionRate;
            calculationDetails = JSON.stringify({
              type: 'commission',
              servicePrice: service.price,
              commissionRate: commissionRate,
              earnings: earningsAmount
            });
            break;
          }
          case 'hourly': {
            const hourlyRate = staffMember.hourlyRate || 0;
            const serviceDuration = service.duration || 60;
            const hours = serviceDuration / 60;
            earningsAmount = hourlyRate * hours;
            rateType = 'hourly';
            rateUsed = hourlyRate;
            calculationDetails = JSON.stringify({
              type: 'hourly',
              servicePrice: service.price,
              hourlyRate: hourlyRate,
              serviceDuration: serviceDuration,
              hours: hours,
              earnings: earningsAmount
            });
            break;
          }
          case 'fixed': {
            const fixedRate = staffMember.fixedRate || 0;
            earningsAmount = fixedRate;
            rateType = 'fixed';
            rateUsed = fixedRate;
            calculationDetails = JSON.stringify({
              type: 'fixed',
              servicePrice: service.price,
              fixedRate: fixedRate,
              earnings: earningsAmount
            });
            break;
          }
          case 'hourly_plus_commission': {
            const hourlyRate = staffMember.hourlyRate || 0;
            const commissionRate = staffMember.commissionRate || 0;
            const serviceDuration = service.duration || 60;
            const hours = serviceDuration / 60;
            const hourlyPortion = hourlyRate * hours;
            const commissionPortion = service.price * commissionRate;
            earningsAmount = hourlyPortion + commissionPortion;
            rateType = 'hourly_plus_commission';
            rateUsed = hourlyRate;
            calculationDetails = JSON.stringify({
              type: 'hourly_plus_commission',
              servicePrice: service.price,
              hourlyRate: hourlyRate,
              commissionRate: commissionRate,
              serviceDuration: serviceDuration,
              hours: hours,
              hourlyPortion: hourlyPortion,
              commissionPortion: commissionPortion,
              earnings: earningsAmount
            });
            break;
          }
          default:
            earningsAmount = 0;
            calculationDetails = JSON.stringify({
              type: 'unknown',
              servicePrice: service.price,
              earnings: 0
            });
        }

        // Create staff earnings record
        if (earningsAmount > 0) {
          await storage.createStaffEarnings({
            staffId: appointment.staffId,
            appointmentId: appointmentId,
            serviceId: appointment.serviceId,
            paymentId: payment.id,
            earningsAmount: earningsAmount,
            rateType: rateType,
            rateUsed: rateUsed,
            isCustomRate: false,
            servicePrice: service.price,
            calculationDetails: calculationDetails,
            earningsDate: new Date()
          });

          LoggerService.logPayment("staff_earnings_created", earningsAmount, { 
            ...context, 
            paymentId: payment.id, 
            staffId: appointment.staffId,
            appointmentId 
          });
        }
      }
    } catch (error) {
      LoggerService.error("Failed to create staff earnings record", { 
        ...context, 
        paymentId: payment.id, 
        appointmentId, 
        error: error.message 
      });
      // Don't fail the payment confirmation if earnings creation fails
    }

    LoggerService.logPayment("gift_card_payment_confirmed", amount, { ...context, paymentId: payment.id });

    res.json({ success: true, payment, remainingBalance: giftCard.currentBalance - amount });
  }));

  // Add gift card
  app.post("/api/add-gift-card", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { code, balance, clientId, notes } = req.body;

    LoggerService.info("Adding gift card", { ...context, code, balance, clientId });

    // Check if gift card already exists
    const existingGiftCard = await storage.getGiftCardByCode(code);
    if (existingGiftCard) {
      throw new ConflictError("Gift card with this code already exists");
    }

    const giftCard = await storage.createGiftCard({
      code,
      initialAmount: balance,
      currentBalance: balance,
      // clientId,
      // notes,
      status: 'active',
    });

    LoggerService.info("Gift card added", { ...context, giftCardId: giftCard.id });

    res.status(201).json(giftCard);
  }));

  // Get saved gift cards
  app.get("/api/saved-gift-cards", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { clientId } = req.query;

    LoggerService.debug("Fetching saved gift cards", { ...context, clientId });

    const giftCards = clientId 
      ? await storage.getSavedGiftCardsByClient(parseInt(clientId as string))
      : await storage.getAllGiftCards();

    res.json(giftCards);
  }));

  // Delete saved gift card
  app.delete("/api/saved-gift-cards/:id", asyncHandler(async (req: Request, res: Response) => {
    const giftCardId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Deleting gift card", { ...context, giftCardId });

    const giftCard = await storage.getGiftCard(giftCardId);
    if (!giftCard) {
      throw new NotFoundError("Gift card");
    }

    await storage.deleteGiftCard(giftCardId);

    res.json({ success: true, message: "Gift card deleted successfully" });
  }));

  // Purchase gift certificate
  app.post("/api/gift-certificates/purchase", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { recipientName, recipientEmail, amount, message, purchaserName, purchaserEmail } = req.body;

    LoggerService.logPayment("gift_certificate_purchase", amount, context);

    // Generate unique gift certificate code
    const code = `GC${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create gift card (used for gift certificates)
    const giftCard = await storage.createGiftCard({
      code,
      issuedToName: recipientName,
      issuedToEmail: recipientEmail,
      initialAmount: amount,
      currentBalance: amount,
      purchasedByUserId: 1, // Default user for gift certificate purchases
      status: 'active',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    // Create payment record
    const payment = await storage.createPayment({
      amount,
      totalAmount: amount,
      clientId: 1, // Default client for gift certificate purchases
      method: 'gift_certificate',
      status: 'completed',
      notes: `Gift certificate purchase - Code: ${code}`,
      processedAt: new Date(),
    });

    LoggerService.logPayment("gift_certificate_created", amount, { ...context, giftCardId: giftCard.id });

    res.status(201).json({ success: true, giftCard, payment });
  }));

  // Get gift card balance
  app.get("/api/gift-card-balance/:code", asyncHandler(async (req: Request, res: Response) => {
    const code = req.params.code;
    const context = getLogContext(req);

    LoggerService.debug("Checking gift card balance", { ...context, code });

    const giftCard = await storage.getGiftCardByCode(code);
    if (!giftCard) {
      throw new NotFoundError("Gift card");
    }

    res.json({ 
      balance: giftCard.currentBalance, 
      isActive: giftCard.status === 'active',
      initialAmount: giftCard.initialAmount,
      status: giftCard.status,
      expiryDate: giftCard.expiryDate
    });
  }));

  // Legacy create-payment endpoint retained for cash only; card moves to HelcimPay.js
  app.post("/api/create-payment", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { sourceId, amount, tipAmount = 0, currency = 'USD', appointmentId, clientId, cardData } = req.body;

    LoggerService.logPayment("helcim_payment_create", amount, context);

    try {
      // Import HelcimService
      const { HelcimService } = await import('../services/helcim-service');

      // Card payments are now handled via HelcimPay.js. This legacy route should not process cards.
      throw new ExternalServiceError('Helcim', 'Card payments are handled via HelcimPay.js. Use /api/helcim-pay/initialize.');

      // This code is unreachable due to the throw above, but kept for reference
      // LoggerService.logPayment("helcim_payment_success", amount, { ...context, paymentId: dbPayment.id });

      // res.json({ 
      //   success: true, 
      //   payment: dbPayment, 
      //   helcimPayment: {
      //     id: helcimResponse.paymentId,
      //     status: helcimResponse.status,
      //     transactionId: helcimResponse.transactionId
      //   }
      // });
    } catch (error: any) {
      LoggerService.logPayment("helcim_payment_failed", amount, { ...context, error });
      throw new ExternalServiceError('Helcim', error.message);
    }
  }));



  // Confirm payment
  app.post("/api/confirm-payment", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { paymentId, appointmentId } = req.body;

    LoggerService.logPayment("payment_confirmation", undefined, context);

    // Get payment details
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      throw new NotFoundError("Payment");
    }

    // Update payment status
    const updatedPayment = await storage.updatePayment(paymentId, {
      status: 'completed',
    });

    // Update appointment payment status if appointmentId provided
    if (appointmentId) {
      await storage.updateAppointment(appointmentId, {
        paymentStatus: 'paid',
        totalAmount: payment.amount,
      });

      // Create staff earnings record for payroll
      try {
        const appointment = await storage.getAppointment(appointmentId);
        if (appointment) {
          const service = await storage.getService(appointment.serviceId);
          const staffMember = await storage.getStaff(appointment.staffId);
          
          if (service && staffMember) {
            // Calculate staff earnings
            let earningsAmount = 0;
            let rateType = 'commission';
            let rateUsed = 0;
            let calculationDetails = '';

            switch (staffMember.commissionType) {
              case 'commission': {
                const commissionRate = staffMember.commissionRate || 0;
                earningsAmount = service.price * commissionRate;
                rateUsed = commissionRate;
                calculationDetails = JSON.stringify({
                  type: 'commission',
                  servicePrice: service.price,
                  commissionRate: commissionRate,
                  earnings: earningsAmount
                });
                break;
              }
              case 'hourly': {
                const hourlyRate = staffMember.hourlyRate || 0;
                const serviceDuration = service.duration || 60;
                const hours = serviceDuration / 60;
                earningsAmount = hourlyRate * hours;
                rateType = 'hourly';
                rateUsed = hourlyRate;
                calculationDetails = JSON.stringify({
                  type: 'hourly',
                  servicePrice: service.price,
                  hourlyRate: hourlyRate,
                  serviceDuration: serviceDuration,
                  hours: hours,
                  earnings: earningsAmount
                });
                break;
              }
              case 'fixed': {
                const fixedRate = staffMember.fixedRate || 0;
                earningsAmount = fixedRate;
                rateType = 'fixed';
                rateUsed = fixedRate;
                calculationDetails = JSON.stringify({
                  type: 'fixed',
                  servicePrice: service.price,
                  fixedRate: fixedRate,
                  earnings: earningsAmount
                });
                break;
              }
              case 'hourly_plus_commission': {
                const hourlyRate = staffMember.hourlyRate || 0;
                const commissionRate = staffMember.commissionRate || 0;
                const serviceDuration = service.duration || 60;
                const hours = serviceDuration / 60;
                const hourlyPortion = hourlyRate * hours;
                const commissionPortion = service.price * commissionRate;
                earningsAmount = hourlyPortion + commissionPortion;
                rateType = 'hourly_plus_commission';
                rateUsed = hourlyRate;
                calculationDetails = JSON.stringify({
                  type: 'hourly_plus_commission',
                  servicePrice: service.price,
                  hourlyRate: hourlyRate,
                  commissionRate: commissionRate,
                  serviceDuration: serviceDuration,
                  hours: hours,
                  hourlyPortion: hourlyPortion,
                  commissionPortion: commissionPortion,
                  earnings: earningsAmount
                });
                break;
              }
              default:
                earningsAmount = 0;
                calculationDetails = JSON.stringify({
                  type: 'unknown',
                  servicePrice: service.price,
                  earnings: 0
                });
            }

            // Create staff earnings record
            if (earningsAmount > 0) {
              await storage.createStaffEarnings({
                staffId: appointment.staffId,
                appointmentId: appointmentId,
                serviceId: appointment.serviceId,
                paymentId: payment.id,
                earningsAmount: earningsAmount,
                rateType: rateType,
                rateUsed: rateUsed,
                isCustomRate: false,
                servicePrice: service.price,
                calculationDetails: calculationDetails,
                earningsDate: new Date()
              });

              LoggerService.logPayment("staff_earnings_created", earningsAmount, { 
                ...context, 
                paymentId, 
                staffId: appointment.staffId,
                appointmentId 
              });
            }
          }
        }
      } catch (error) {
        LoggerService.error("Failed to create staff earnings record", { 
          ...context, 
          paymentId, 
          appointmentId, 
          error: error.message 
        });
        // Don't fail the payment confirmation if earnings creation fails
      }
    }

    LoggerService.logPayment("payment_confirmed", payment.amount, { ...context, paymentId });

    res.json({ success: true, payment: updatedPayment });
  }));

  // Get saved payment methods
  app.get("/api/saved-payment-methods", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { clientId } = req.query;

    LoggerService.debug("Fetching saved payment methods", { ...context, clientId });

    const paymentMethods = clientId 
      ? await storage.getSavedPaymentMethodsByClient(parseInt(clientId as string))
      : await storage.getSavedPaymentMethodsByClient(0); // Get all by using 0 as clientId

    res.json(paymentMethods);
  }));

  // Save payment method
  app.post("/api/saved-payment-methods", validateRequest(insertSavedPaymentMethodSchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const paymentMethodData = req.body;

    LoggerService.info("Saving payment method", { ...context, clientId: paymentMethodData.clientId });

    const paymentMethod = await storage.createSavedPaymentMethod(paymentMethodData);

    res.status(201).json(paymentMethod);
  }));

  // Delete saved payment method
  app.delete("/api/saved-payment-methods/:id", asyncHandler(async (req: Request, res: Response) => {
    const paymentMethodId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Deleting saved payment method", { ...context, paymentMethodId });

    const paymentMethod = await storage.getSavedPaymentMethod(paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundError("Payment method");
    }

    await storage.deleteSavedPaymentMethod(paymentMethodId);

    res.json({ success: true, message: "Payment method deleted successfully" });
  }));

  // Set default payment method
  app.put("/api/saved-payment-methods/:id/default", asyncHandler(async (req: Request, res: Response) => {
    const paymentMethodId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Setting default payment method", { ...context, paymentMethodId });

    const paymentMethod = await storage.getSavedPaymentMethod(paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundError("Payment method");
    }

    // Remove default from other payment methods for this client
    await storage.setDefaultPaymentMethod(paymentMethod.clientId, paymentMethodId);

    // Set this payment method as default
    const updatedPaymentMethod = await storage.updateSavedPaymentMethod(paymentMethodId, {
      isDefault: true,
    });

    res.json(updatedPaymentMethod);
  }));
} 