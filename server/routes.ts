import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import type { IStorage } from "./storage.js";
import { z } from "zod";
import { LLMService } from "./llm-service.js";
import { SMSAutoRespondService } from "./sms-auto-respond-service.js";
import { AutoRespondService } from "./auto-respond-service.js";

// speakeasy and qrcode are optional; remove imports if not used in this module
import {
  insertClientSchema,
  insertServiceCategorySchema,
  insertRoomSchema,
  insertDeviceSchema,
  insertServiceSchema,
  insertProductSchema,
  insertStaffSchema,
  insertStaffServiceSchema,
  insertAppointmentSchema,
  insertAppointmentHistorySchema,
  insertMembershipSchema,
  insertClientMembershipSchema,
  insertStaffScheduleSchema,
} from "../shared/schema.js";

// Import route registration functions
// Route modules are loaded dynamically in registerRoutes to avoid hard runtime
// dependencies on files that may not be emitted in production builds.
import createTerminalRoutes from "./routes/terminal-routes.js";
import createHelcimWebhookRoutes from "./routes/helcim-webhooks.js";
import createReceiptRoutes from "./routes/receipt-routes.js";
// Import helcim payments router dynamically to avoid missing compiled file failures
import { CheckSoftwareService } from "./check-software-service.js";
import { registerExternalRoutes } from "./external-api.js";
// Statically import route registration functions so TypeScript can resolve them during build
import { registerAuthRoutes } from "./routes/auth.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerAppointmentRoutes } from "./routes/appointments.js";
import { registerAppointmentPhotoRoutes } from "./routes/appointment-photos.js";
import { registerServiceRoutes } from "./routes/services.js";
import { registerProductRoutes } from "./routes/products.js";
import { registerLocationRoutes } from "./routes/locations.js";
import { registerPermissionRoutes } from "./routes/permissions.js";
import { registerBusinessSettingsRoutes } from "./routes/business-settings.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerPaymentRoutes } from "./routes/payments.js";
import { registerPaymentVerificationRoutes } from "./routes/verify-payments.js";
import { registerPaymentMatchingRoutes } from "./routes/match-payments.js";
import { registerMarketingRoutes } from "./routes/marketing.js";
import { registerFormsRoutes } from "./routes/forms.js";
import { registerDocumentsRoutes } from "./routes/documents.js";
import { registerBusinessKnowledgeRoutes } from "./routes/business-knowledge.js";
import { registerLLMRoutes } from "./routes/llm.js";
import { registerSmsAutoRespondRoutes } from "./routes/sms-auto-respond.js";
import { registerAutomationRuleRoutes } from "./routes/automation-rules.js";
import { registerMembershipRoutes } from "./routes/memberships.js";
import { registerNoteTemplateRoutes } from "./routes/note-templates.js";
import { registerNoteHistoryRoutes } from "./routes/note-history.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerPayrollSalesHistoryRoutes } from "./routes/payroll-sales-history.js";
import { registerTimeClockRoutes } from "./routes/time-clock.js";
import { registerClassRoutes } from "./routes/classes.js";
import { registerBookingDesignRoutes } from "./routes/booking-design.js";

// Custom schema for staff service with custom rates
const staffServiceWithRatesSchema = insertStaffServiceSchema.extend({
  customRate: z.number().nullable().optional(),
  customCommissionRate: z.number().nullable().optional(),
});

// Helcim is now the primary payment processor

export async function registerRoutes(app: Express, storage: IStorage, autoRenewalService?: any): Promise<Server> {
  if (!app || !storage) {
    throw new Error('App and storage are required');
  }

  // Create HTTP server
  const server = createServer(app);

  // Initialize LLM Service
  const llmService = new LLMService(storage);
  
  // Initialize SMS Auto-Respond Service
  const smsAutoRespondService = SMSAutoRespondService.getInstance(storage);
  
  // Initialize Email Auto-Respond Service
  const autoRespondService = new AutoRespondService(storage);
  
  // Initialize Check Software Service (for payroll checks)
  const checkSoftwareService = new CheckSoftwareService(storage);

  // Register all route modules
  registerAuthRoutes(app, storage);
  registerUserRoutes(app, storage);
  registerAppointmentRoutes(app, storage);
  // Register appointment photos routes (used by AppointmentPhotos component)
  registerAppointmentPhotoRoutes(app, storage);
  registerServiceRoutes(app, storage);
  registerProductRoutes(app, storage);
  registerLocationRoutes(app, storage);
  registerPermissionRoutes(app);
  registerBusinessSettingsRoutes(app, storage);
  registerNotificationRoutes(app, storage);
  registerPaymentRoutes(app, storage);
  registerPaymentVerificationRoutes(app, storage);
  registerPaymentMatchingRoutes(app, storage);
  registerMarketingRoutes(app, storage);
  registerFormsRoutes(app, storage);
  registerDocumentsRoutes(app, storage);
  registerBusinessKnowledgeRoutes(app, storage);
  registerLLMRoutes(app, storage);
  registerSmsAutoRespondRoutes(app, storage);
  // Automations
  registerAutomationRuleRoutes(app, storage);
  // Memberships
  registerMembershipRoutes(app, storage);
  // Notes
  registerNoteTemplateRoutes(app, storage);
  registerNoteHistoryRoutes(app, storage);
  registerReportRoutes(app, storage);
  // Payroll routes using sales history
  registerPayrollSalesHistoryRoutes(app, storage);
  // Time clock routes
  registerTimeClockRoutes(app, storage);
  // Classes routes
  registerClassRoutes(app, storage);
  // Booking design routes
  registerBookingDesignRoutes(app, storage);
  // Register external API routes (health, services, staff availability, webhook)
  registerExternalRoutes(app, storage);

  // Register terminal routes
  app.use('/api/terminal', createTerminalRoutes(storage));
  // Helcim admin-level webhooks (aliases) -> reuse terminal webhook handler
  app.use('/api/helcim', createHelcimWebhookRoutes(storage));
  // Legacy alias used by some Helcim configurations
  app.use('/api/helcim-smart-terminal', createHelcimWebhookRoutes(storage));
  // Register receipt routes
  app.use('/api', createReceiptRoutes(storage));
  // Enable helcim payment routes; attempt multiple resolutions to support dev (.ts) and prod (.js)
  try {
    let helcimModule: any;
    try {
      // Try TypeScript file first for tsx execution
      helcimModule = await import('./routes/payments/helcim.js');
    } catch (e1) {
      try {
        // Try without extension (will resolve to .ts in tsx, .js in Node)
        helcimModule = await import('./routes/payments/helcim');
      } catch (e2) {
        // If both attempts fail, throw the original error
        throw e2;
      }
    }
    const modDefault = helcimModule?.default || helcimModule;
    if (typeof modDefault === 'function') {
      // Factory that accepts storage and returns a Router
      const helcimPaymentsRouter = modDefault(storage);
      app.use('/api/payments/helcim', helcimPaymentsRouter);
    } else {
      app.use('/api/payments/helcim', modDefault);
    }
  } catch (e) {
    console.warn('Helcim payments routes not available:', (e as any)?.message || e);
    // Fallback minimal endpoints to prevent 404s in dev or environments where dynamic import fails
    try {
      // Initialize Helcim Pay.js session (fallback)
      app.post('/api/payments/helcim/initialize', async (req: Request, res: Response) => {
        try {
          const { amount, description, customerId, cardId } = req.body || {};
          if (amount === undefined || amount === null) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
          }

          const apiToken = process.env.HELCIM_API_TOKEN;
          const apiUrlV2 = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
          if (!apiToken) {
            return res.status(500).json({ success: false, message: 'Helcim API token not configured' });
          }
          
          console.log('[Helcim Initialize] Request params:', { amount, description, customerId, cardId });

          const isCardSaveOnly = Number(amount) === 0 || (description && String(description).toLowerCase().includes('save card'));
          const payload: any = {
            amount: isCardSaveOnly ? 0 : Number(amount),
            currency: 'USD',
            paymentType: isCardSaveOnly ? 'verify' : 'purchase',
            test: false,  // Use real mode to create actual customers and cards
            description: description || 'Payment',
            idempotencyKey: `hpjs_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          };
          
          // Add customer and card info if provided (for saved card payments)
          if (customerId) {
            payload.customerCode = customerId;
          }
          if (cardId) {
            payload.cardId = cardId;
          }

          const tryV2 = async () => {
            const r = await fetch(`${apiUrlV2}/helcim-pay/initialize`, {
              method: 'POST',
              headers: {
                'api-token': apiToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(payload),
            });
            const j = await r.json().catch(() => ({}));
            return { ok: r.ok, status: r.status, data: j } as const;
          };

          const tryV1 = async () => {
            const r = await fetch(`https://api.helcim.com/v1/helcim-pay/initialize`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(payload),
            });
            const j = await r.json().catch(() => ({}));
            return { ok: r.ok, status: r.status, data: j } as const;
          };

          let result = await tryV2();
          if (!result.ok || !result.data?.checkoutToken) {
            const v1 = await tryV1();
            if (!v1.ok || !v1.data?.checkoutToken) {
              return res.status(502).json({
                success: false,
                message: v1.data?.message || v1.data?.error || 'Helcim initialization failed',
                details: v1.data,
              });
            }
            result = v1;
          }

          res.json({ success: true, token: result.data.checkoutToken, secretToken: result.data.secretToken, data: result.data });
        } catch (err: any) {
          res.status(500).json({ success: false, message: err?.message || 'Failed to initialize Helcim Pay session' });
        }
      });

      // Save card on file (fallback)
      app.post('/api/payments/helcim/save-card', async (req: Request, res: Response) => {
        try {
          const { token, customerId, clientId, customerEmail, customerName } = req.body || {};
          if (!token) {
            return res.status(400).json({ success: false, message: 'token is required' });
          }

          const isDevelopment = process.env.NODE_ENV === 'development';
          const mockMode = req.body?.mockMode === true; // explicit-only; do not auto-mock in dev

          if (mockMode && clientId) {
            const mockCardLast4 = String(token).slice(-4).padStart(4, '0');
            const mockCardBrand = ['Visa', 'Mastercard', 'Amex'][Math.floor(Math.random() * 3)];
            const mockHelcimCardId = `mock_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            if (storage) {
              try {
                await storage.createSavedPaymentMethod({
                  clientId: Number(clientId),
                  squareCardId: mockHelcimCardId,
                  helcimCardId: mockHelcimCardId,
                  helcimCustomerId: `mock_customer_${clientId}`, // Store mock customer ID
                  cardBrand: mockCardBrand,
                  cardLast4: mockCardLast4,
                  cardExpMonth: 12,
                  cardExpYear: 2026,
                  isDefault: true,
                });
              } catch {}
            }
            return res.status(201).json({
              success: true,
              helcimCustomerId: `mock_customer_${clientId}`,
              helcimCardId: mockHelcimCardId,
              cardBrand: mockCardBrand,
              cardLast4: mockCardLast4,
              cardExpMonth: 12,
              cardExpYear: 2026,
              mockMode: true,
            });
          }

          let helcimCustomerId: string | null = customerId || null;
          if (!helcimCustomerId && (clientId || customerEmail)) {
            const mod = await import('./services/helcim-service.js');
            const service: any = (mod as any)?.helcimService || (mod as any)?.default || mod;
            const created = await service.createCustomer({
              firstName: (customerName || '').split(' ')[0] || undefined,
              lastName: (customerName || '').split(' ').slice(1).join(' ') || undefined,
              email: customerEmail,
            });
            helcimCustomerId = String(created?.id || created?.customerId || created?.customer?.id || '');
          }
          if (!helcimCustomerId) {
            return res.status(400).json({ success: false, message: 'Unable to determine customer for card save' });
          }

          const mod2 = await import('./services/helcim-service.js');
          const service2: any = (mod2 as any)?.helcimService || (mod2 as any)?.default || mod2;
          let saved: any;
          try {
            saved = await service2.saveCardToCustomer({ customerId: helcimCustomerId, token });
          } catch (e: any) {
            // If Helcim attach fails, persist Pay.js token so purchases can use cardToken
            if (clientId && storage) {
              try {
                await storage.createSavedPaymentMethod({
                  clientId: Number(clientId),
                  squareCardId: String(token),
                  helcimCardId: String(token),
                  helcimCustomerId: String(helcimCustomerId),
                  cardBrand: 'card',
                  cardLast4: String(token).slice(-4).padStart(4, '0'),
                  cardExpMonth: 0,
                  cardExpYear: 0,
                  isDefault: true,
                });
              } catch {}
              return res.status(201).json({
                success: true,
                helcimCustomerId: String(helcimCustomerId),
                helcimCardId: String(token),
                cardBrand: 'card',
                cardLast4: String(token).slice(-4).padStart(4, '0'),
                cardExpMonth: 0,
                cardExpYear: 0,
                warning: 'Saved Pay.js token; Helcim attach failed.'
              });
            }
            throw e;
          }
          const helcimCardId = saved?.id || saved?.cardId || saved?.card?.id || token;
          const brand = saved?.brand || saved?.cardBrand || 'card';
          const last4 = saved?.last4 || saved?.cardLast4 || '****';
          const expMonth = saved?.expMonth || saved?.cardExpMonth || 0;
          const expYear = saved?.expYear || saved?.cardExpYear || 0;

          if (clientId && storage) {
            try {
              await storage.createSavedPaymentMethod({
                clientId: Number(clientId),
                squareCardId: String(helcimCardId),
                helcimCardId: String(helcimCardId),
                helcimCustomerId: String(helcimCustomerId), // Store Helcim customer ID
                cardBrand: brand,
                cardLast4: last4,
                cardExpMonth: Number(expMonth),
                cardExpYear: Number(expYear),
                isDefault: true,
              });
            } catch {}
          }

          res.status(201).json({
            success: true,
            helcimCustomerId,
            helcimCardId: String(helcimCardId),
            cardBrand: brand,
            cardLast4: last4,
            cardExpMonth: Number(expMonth),
            cardExpYear: Number(expYear),
          });
        } catch (err: any) {
          res.status(500).json({ success: false, message: err?.message || 'Failed to save card' });
        }
      });
    } catch {}
  }

  // Test endpoint to create a customer directly
  app.post('/api/helcim-pay/test-create-customer', async (req: Request, res: Response) => {
    try {
      const mod = await import('./services/helcim-service.js');
      const service: any = (mod as any)?.helcimService || (mod as any)?.default || mod;
      
      if (!service) {
        return res.status(500).json({ success: false, message: 'Helcim service not available' });
      }
      
      // Create a test customer
      const testCustomer = await service.createCustomer({
        firstName: 'Test',
        lastName: 'Customer',
        email: `test${Date.now()}@example.com`
      });
      
      console.log('[Test Create Customer] Result:', testCustomer);
      
      return res.json({
        success: true,
        customer: testCustomer,
        customerCode: testCustomer?.customerCode,
        customerId: testCustomer?.id || testCustomer?.customerId,
        isCST: testCustomer?.customerCode?.startsWith('CST')
      });
      
    } catch (error: any) {
      console.error('[Test Create Customer] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create test customer',
        error: error.message,
        details: error?.response?.data
      });
    }
  });
  
  // Diagnostic endpoint to check Helcim API status
  app.get('/api/helcim-pay/diagnostic', async (req: Request, res: Response) => {
    try {
      const apiToken = process.env.HELCIM_API_TOKEN;
      const apiUrl = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
      
      if (!apiToken) {
        return res.json({
          success: false,
          message: 'No API token configured',
          hasToken: false
        });
      }
      
      // Try to fetch account info to determine if we're in test or live mode
      const response = await fetch(`${apiUrl}/account`, {
        method: 'GET',
        headers: {
          'api-token': apiToken,
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      return res.json({
        success: response.ok,
        hasToken: true,
        tokenPrefix: apiToken.substring(0, 10) + '...',
        apiUrl: apiUrl,
        accountData: data,
        isTestMode: data?.testMode || data?.test || data?.mode === 'test' || false,
        environment: process.env.NODE_ENV,
        status: response.status
      });
      
    } catch (error: any) {
      return res.json({
        success: false,
        message: 'Failed to check API status',
        error: error.message
      });
    }
  });
  
  // Verify saved card exists in Helcim
  app.post('/api/helcim-pay/verify-saved-card', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.body;
      
      if (!customerId) {
        return res.status(400).json({ success: false, message: 'Customer ID required' });
      }
      
      // Check if this customer exists in Helcim
      const apiToken = process.env.HELCIM_API_TOKEN;
      const apiUrl = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
      
      try {
        const mod = await import('./services/helcim-service.js');
        const service: any = (mod as any)?.helcimService || (mod as any)?.default || mod;
        
        // For customer codes (CST format), we need to search by customerCode
        // Helcim's /customers endpoint with a code requires a search, not direct lookup
        let response;
        if (customerId.startsWith('CST')) {
          // Search for customer by code
          try {
            const searchResponse = await service.makeRequest(`/customers?customerCode=${customerId}`, 'GET');
            if (searchResponse?.customers && searchResponse.customers.length > 0) {
              response = searchResponse.customers[0];
            } else {
              throw new Error('Customer not found');
            }
          } catch (e) {
            // If search fails, try direct lookup (some API versions support it)
            response = await service.makeRequest(`/customers/${customerId}`, 'GET');
          }
        } else {
          // Numeric ID - direct lookup
          response = await service.makeRequest(`/customers/${customerId}`, 'GET');
        }
        
        return res.json({
          success: true,
          customerExists: true,
          customerId: customerId,
          customerData: response
        });
      } catch (error: any) {
        if (error.message?.includes('404') || error.message?.includes('Invalid customerId')) {
          return res.json({
            success: false,
            customerExists: false,
            customerId: customerId,
            message: 'Customer does not exist in Helcim. Card needs to be re-added.'
          });
        }
        throw error;
      }
    } catch (err: any) {
      console.error('[Verify Saved Card] Error:', err);
      return res.status(500).json({ 
        success: false, 
        message: err?.message || 'Failed to verify saved card' 
      });
    }
  });

  // Process payment with saved card
  app.post('/api/helcim-pay/process-saved-card', async (req: Request, res: Response) => {
    try {
      const { amount, customerId, cardId, description, appointmentId, clientId, tipAmount } = req.body || {};
      
      console.log('[Process Saved Card] Request received:', {
        customerId,
        cardId,
        amount,
        appointmentId,
        hasApiToken: !!process.env.HELCIM_API_TOKEN,
        apiTokenPrefix: process.env.HELCIM_API_TOKEN?.substring(0, 10) + '...'
      });
      
      if (!amount || !customerId || !cardId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Amount, customerId, and cardId are required for saved card payment' 
        });
      }
      
      console.log('[Helcim Process Saved Card] Processing payment:', { amount, customerId, cardId, description });
      
      // Check if Helcim API is configured
      const apiToken = process.env.HELCIM_API_TOKEN;
      if (!apiToken) {
        console.error('[Helcim Process Saved Card] HELCIM_API_TOKEN not configured');
        return res.status(500).json({ 
          success: false, 
          message: 'Payment processing not configured. Please contact support.' 
        });
      }
      
      try {
        // Process real payment through Helcim API
        const mod = await import('./services/helcim-service.js');
        const service: any = (mod as any)?.helcimService || (mod as any)?.default || mod;
        
        const paymentResult = await service.processSavedCardPayment({
          customerId,
          cardId, // This should be the Helcim cardToken we saved
          amount,
          description: description || 'Payment',
          appointmentId,
          clientId,
          tipAmount
        });
        
        console.log('[Helcim Process Saved Card] Payment successful:', paymentResult);
        
        // Extract payment details from Helcim response
        const paymentId = paymentResult?.id || paymentResult?.paymentId || paymentResult?.transactionId;
        const transactionId = paymentResult?.transactionId || paymentResult?.id || `${Date.now()}`;
        const status = paymentResult?.status || paymentResult?.state || 'completed';
        
        // Try to get card last 4 from saved payment method if available
        let cardLast4 = null;
        if (storage && clientId) {
          try {
            const savedMethods = await storage.getSavedPaymentMethodsByClient(parseInt(clientId));
            const savedCard = savedMethods.find((m: any) => m.helcimCardId === cardId || m.helcimCustomerId === customerId);
            if (savedCard && savedCard.cardLast4) {
              cardLast4 = savedCard.cardLast4;
            }
          } catch (err) {
            console.log('[Process Saved Card] Could not fetch saved card details:', err);
          }
        }
        
        return res.json({
          success: true,
          paymentId: String(paymentId),
          transactionId: String(transactionId),
          amount: amount,
          customerId: customerId,
          cardId: cardId,
          cardLast4: cardLast4,
          status: status,
          message: 'Payment processed successfully',
          helcimResponse: paymentResult
        });
        
      } catch (helcimError: any) {
        console.error('[Helcim Process Saved Card] Helcim API error:', helcimError?.message || helcimError);
        console.error('[Helcim Process Saved Card] Full error details:', {
          message: helcimError?.message,
          response: helcimError?.response?.data,
          status: helcimError?.response?.status
        });
        
        // Return the actual error with helpful message
        // If the card was saved in test mode, it won't work with production API
        const isTestModeError = helcimError?.message?.includes('test') || 
                               helcimError?.response?.data?.message?.includes('test') ||
                               helcimError?.response?.status === 404;
        
        const errorMessage = isTestModeError 
          ? 'This card was saved in test mode and cannot be used for real payments. Please add your card again to save it properly.'
          : 'Payment processing failed. The saved card may not be properly configured with Helcim. Please try adding the card again or use a different payment method.';
        
        return res.status(502).json({
          success: false,
          message: errorMessage,
          error: helcimError?.message || 'Helcim API error',
          details: helcimError?.response?.data || null,
          isTestModeError
        });
      }
      
    } catch (err: any) {
      console.error('[Helcim Process Saved Card] Error:', err);
      return res.status(500).json({ 
        success: false, 
        message: err?.message || 'Failed to process saved card payment' 
      });
    }
  });
  
  // Explicit aliases to ensure Helcim init is always available (prevents 404 in some envs)
  app.post('/api/helcim-pay/initialize', async (req: Request, res: Response) => {
    try {
      const { amount, description, customerId, cardId } = req.body || {};
      if (amount === undefined || amount === null) {
        return res.status(400).json({ success: false, message: 'Amount is required' });
      }
      const apiToken = process.env.HELCIM_API_TOKEN;
      const apiUrlV2 = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
      if (!apiToken) {
        return res.status(500).json({ success: false, message: 'Helcim API token not configured' });
      }
      
      console.log('[Helcim Initialize] Request params:', { amount, description, customerId, cardId });
      
      const isCardSaveOnly = Number(amount) === 0 || (description && String(description).toLowerCase().includes('save card'));
      const payload: any = {
        amount: isCardSaveOnly ? 0 : Number(amount),
        currency: 'USD',
        paymentType: isCardSaveOnly ? 'verify' : 'purchase',
        test: false,  // Use real mode to create actual customers and cards
        description: description || 'Payment',
        idempotencyKey: `hpjs_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      };
      
      // Add customer and card info if provided (for saved card payments)
      if (customerId) {
        payload.customerCode = customerId;
      }
      if (cardId) {
        payload.cardId = cardId;
      }
      const tryV2 = async () => {
        const r = await fetch(`${apiUrlV2}/helcim-pay/initialize`, {
          method: 'POST',
          headers: {
            'api-token': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data: j } as const;
      };
      const tryV1 = async () => {
        const r = await fetch(`https://api.helcim.com/v1/helcim-pay/initialize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data: j } as const;
      };
      let result = await tryV2();
      if (!result.ok || !result.data?.checkoutToken) {
        const v1 = await tryV1();
        if (!v1.ok || !v1.data?.checkoutToken) {
          return res.status(502).json({ success: false, message: v1.data?.message || v1.data?.error || 'Helcim initialization failed', details: v1.data });
        }
        result = v1;
      }
      res.json({ success: true, token: result.data.checkoutToken, secretToken: result.data.secretToken, data: result.data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to initialize Helcim Pay session' });
    }
  });

        app.post('/api/payments/helcim/initialize', async (req: Request, res: Response) => {
        try {
          const { amount, description, customerId, cardId } = req.body || {};
          if (amount === undefined || amount === null) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
          }
          const apiToken = process.env.HELCIM_API_TOKEN;
          const apiUrlV2 = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
          if (!apiToken) {
            return res.status(500).json({ success: false, message: 'Helcim API token not configured' });
          }
          
          console.log('[Helcim Initialize] Request params:', { amount, description, customerId, cardId });
          
          const isCardSaveOnly = Number(amount) === 0 || (description && String(description).toLowerCase().includes('save card'));
          const payload: any = {
            amount: isCardSaveOnly ? 0 : Number(amount),
            currency: 'USD',
            paymentType: isCardSaveOnly ? 'verify' : 'purchase',
            test: false,  // Use real mode to create actual customers and cards
            description: description || 'Payment',
            idempotencyKey: `hpjs_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          };
          
          // Add customer and card info if provided (for saved card payments)
          if (customerId) {
            payload.customerCode = customerId;
          }
          if (cardId) {
            payload.cardId = cardId;
          }
      const tryV2 = async () => {
        const r = await fetch(`${apiUrlV2}/helcim-pay/initialize`, {
          method: 'POST',
          headers: {
            'api-token': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data: j } as const;
      };
      const tryV1 = async () => {
        const r = await fetch(`https://api.helcim.com/v1/helcim-pay/initialize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data: j } as const;
      };
      let result = await tryV2();
      if (!result.ok || !result.data?.checkoutToken) {
        const v1 = await tryV1();
        if (!v1.ok || !v1.data?.checkoutToken) {
          return res.status(502).json({ success: false, message: v1.data?.message || v1.data?.error || 'Helcim initialization failed', details: v1.data });
        }
        result = v1;
      }
      res.json({ success: true, token: result.data.checkoutToken, secretToken: result.data.secretToken, data: result.data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to initialize Helcim Pay session' });
    }
  });

  // Staff routes
  app.get("/api/staff", async (req: Request, res: Response) => {
    try {
      const staff = await storage.getAllStaff();

      // Optional filter by locationId
      const locationIdParam = req.query.locationId as string | undefined;
      const filteredByLocation = locationIdParam
        ? staff.filter((s: any) => String(s.locationId) === String(parseInt(locationIdParam)))
        : staff;

      // Enrich staff with linked user info so the client can access email/phone
      // Fetch user data for each staff member individually to ensure we get the data
      const enriched = await Promise.all(
        filteredByLocation.map(async (s: any) => {
          let user = null;
          try {
            user = await storage.getUser(s.userId);
          } catch (e) {
            console.error(`Error fetching user ${s.userId} for staff ${s.id}:`, e);
          }
          
          return {
            ...s,
            user: user
              ? {
                  id: user.id,
                  username: user.username,
                  firstName: user.firstName || '',
                  lastName: user.lastName || '',
                  email: user.email,
                  phone: user.phone || '',
                }
              : null,
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error getting staff:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get staff"
      });
    }
  });

  // Sales history - used by Reports (fallback simple endpoint)
  app.get("/api/sales-history", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query as Record<string, string | undefined>;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const list = await storage.getSalesHistoryByDateRange(start, end);
        return res.json(list);
      }

      const list = await storage.getAllSalesHistory();
      return res.json(list);
    } catch (error) {
      console.error("Error getting sales history:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get sales history",
      });
    }
  });

  // New endpoint to update staff assignment for sales history
  app.put("/api/sales-history/:id/assign-staff", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid sales history id" });
      }

      const { staffId, staffName } = req.body;
      
      // Need at least staffName for the update
      if (!staffName) {
        return res.status(400).json({ error: "Staff name is required" });
      }

      // Update the sales history record with new staff assignment
      const updatedSale = await storage.updateSalesHistory(id, { 
        staffId: staffId || null,
        staffName,
        // Add a note indicating this was manually assigned
        notes: `${req.body.notes || ''} [Manually assigned to ${staffName}]`.trim()
      });
      
      if (!updatedSale) {
        return res.status(404).json({ error: "Sales history record not found" });
      }
      
      res.json(updatedSale);
    } catch (error) {
      console.error("Error updating sales history staff assignment:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update staff assignment",
      });
    }
  });

  // Get a single staff member by id (needed by appointment details)
  app.get("/api/staff/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid staff id" });
      }

      let staffMember = await storage.getStaff(id);
      // Fallback: some data paths may pass userId instead of staff.id
      if (!staffMember && (storage as any).getStaffByUserId) {
        staffMember = await (storage as any).getStaffByUserId(id);
      }
      // Final fallback: search from list
      if (!staffMember && (storage as any).getAllStaff) {
        const list = await (storage as any).getAllStaff();
        staffMember = list.find((s: any) => s?.id === id);
      }

      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Enrich with user data
      let user = null;
      try {
        user = await storage.getUser(staffMember.userId);
      } catch (e) {
        console.error(`Error fetching user ${staffMember.userId} for staff ${staffMember.id}:`, e);
      }

      const enrichedStaff = {
        ...staffMember,
        user: user
          ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email,
              phone: user.phone || '',
            }
          : null,
      };

      res.json(enrichedStaff);
    } catch (error) {
      console.error("Error getting staff member:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get staff member",
      });
    }
  });

  // Return services assigned to a specific staff member (detailed service objects)
  app.get("/api/staff/:staffId/services", async (req: Request, res: Response) => {
    try {
      const staffId = parseInt(req.params.staffId);
      if (Number.isNaN(staffId)) {
        return res.status(400).json({ error: "Invalid staffId" });
      }

      // Get assignments
      const assignments = await storage.getStaffServices(staffId);

      // Map to full service objects and include assignment metadata
      const isPublic = String((req.query as any)?.public) === 'true';
      // Build add-on set from mapping so we can flag add-ons and optionally filter them out for public
      let addOnIdSet = new Set<number>();
      try {
        const addOnMap = await (storage as any).getAddOnMapping?.();
        if (addOnMap && typeof addOnMap === 'object') {
          for (const key of Object.keys(addOnMap)) {
            const id = parseInt(key, 10);
            if (!Number.isNaN(id)) addOnIdSet.add(id);
          }
        }
      } catch {}

      const services = (
        await Promise.all(assignments.map(async (assignment) => {
          const service = await storage.getService(assignment.serviceId);
          if (!service) return null;
          return {
            ...service,
            staffServiceId: assignment.id,
            staffId: assignment.staffId,
            customRate: assignment.customRate ?? null,
            customCommissionRate: assignment.customCommissionRate ?? null,
            // Expose separate flags
            isHidden: !!(service as any)?.isHidden,
            isAddOn: addOnIdSet.has(assignment.serviceId),
          };
        }))
      ).filter(Boolean);

      const filtered = isPublic
        // Public booking should not include add-ons; also exclude hidden and inactive
        ? (services as any[]).filter((s: any) => !s.isAddOn && !s.isHidden && (s.isActive !== false))
        : services;

      return res.json(filtered);
    } catch (error) {
      console.error("Error getting services for staff:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get services for staff",
      });
    }
  });

  app.get("/api/rooms", async (req: Request, res: Response) => {
    try {
      const rooms = await storage.getAllRooms();
      // Optionally enrich with location name for UI display
      let locationsList: any[] = [];
      try {
        locationsList = await (storage as any).getAllLocations?.();
      } catch {}
      const locById = new Map<number, any>((locationsList || []).map((l: any) => [l.id, l]));
      const enriched = (rooms || []).map((r: any) => ({
        ...r,
        location: locById.get(r.locationId) || undefined,
        locationName: locById.get(r.locationId)?.name,
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error getting rooms:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get rooms"
      });
    }
  });

  // Create a room
  app.post("/api/rooms", async (req: Request, res: Response) => {
    try {
      // Ensure rooms table has required columns even if server wasn't restarted after migrations
      try {
        const { db } = await import("./db.js");
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`CREATE TABLE IF NOT EXISTS rooms (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`);
        await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT`);
        await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1`);
        await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
        await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_id INTEGER`);
      } catch {}

      let payload: any;
      try {
        payload = insertRoomSchema.parse(req.body);
      } catch (e: any) {
        // Fallback: coerce and sanitize incoming data, then proceed
        const body = req.body || {};
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) {
          throw e;
        }
        const description = body.description ?? null;
        const capacity = body.capacity != null && !Number.isNaN(Number(body.capacity)) ? Number(body.capacity) : 1;
        const isActive = body.isActive === undefined ? true : !!body.isActive;
        const normalized: any = { name, description, capacity, isActive };
        // Prefer provided location; if omitted, pick default location if available
        if (body.locationId !== undefined && body.locationId !== null && !Number.isNaN(Number(body.locationId))) {
          normalized.locationId = Number(body.locationId);
        } else {
          try {
            const { db } = await import("./db.js");
            const { locations } = await import("../shared/schema.js");
            const locs = await db.select().from(locations);
            const defaultLoc = locs.find((l: any) => l.isDefault) || locs[0];
            if (defaultLoc) normalized.locationId = defaultLoc.id;
          } catch {}
        }
        payload = normalized;
      }

      let created: any;
      try {
        created = await storage.createRoom(payload as any);
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        // If the storage layer failed due to missing columns (e.g., description), perform a minimal insert
        if (/column\s+\"?description\"?.*does\s+not\s+exist/i.test(msg) || /does\s+not\s+exist/i.test(msg)) {
          try {
            const { db } = await import("./db.js");
            const { sql } = await import("drizzle-orm");
            // Ensure table exists
            await db.execute(sql`CREATE TABLE IF NOT EXISTS rooms (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`);
            // Insert with just the required column(s)
            const res: any = await db.execute(sql`INSERT INTO rooms (name) VALUES (${payload.name}) RETURNING id, name`);
            const rows = (res?.rows ?? res) as any[];
            created = rows?.[0];
            // Best-effort: update optional columns if they exist
            try { await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`); } catch {}
            try { await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1`); } catch {}
            try { await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT`); } catch {}
            try { await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_id INTEGER`); } catch {}
            try {
              await db.execute(sql`UPDATE rooms SET is_active = ${!!payload.isActive}, capacity = ${Number(payload.capacity || 1)}, description = ${payload.description ?? null} WHERE id = ${Number(created?.id)}`);
            } catch {}
          } catch {
            throw e;
          }
        } else {
          throw e;
        }
      }

      // If a locationId was provided but didn't persist (older schema insert path), try to persist it now
      if (payload.locationId && (created as any)?.locationId == null) {
        try {
          const { db } = await import("./db.js");
          const { sql } = await import("drizzle-orm");
          await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_id INTEGER`);
          await db.execute(sql`UPDATE rooms SET location_id = ${Number(payload.locationId)} WHERE id = ${Number((created as any).id)}`);
          // Re-fetch the room to include the new column
          try {
            const refreshed = await storage.getRoom((created as any).id);
            if (refreshed) {
              return res.status(201).json(refreshed);
            }
          } catch {}
        } catch (e) {
          console.warn('Failed to backfill room location_id after creation:', (e as any)?.message || e);
        }
      }

      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create room",
      });
    }
  });

  // Update a room
  app.patch("/api/rooms/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid room id" });
      }

      // Validate partial update
      const updateData = insertRoomSchema.partial().parse(req.body);

      const existing = await storage.getRoom(id);
      if (!existing) {
        return res.status(404).json({ error: "Room not found" });
      }

      const updated = await storage.updateRoom(id, updateData as any);
      res.json(updated);
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update room",
      });
    }
  });

  // Delete a room (idempotent: returns 200 even if already deleted)
  app.delete("/api/rooms/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid room id" });
      }

      const ok = await storage.deleteRoom(id);
      // Always return 200 to avoid client errors on already-deleted items
      res.json({ success: !!ok });
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete room",
      });
    }
  });

  app.get("/api/devices", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getAllDevices();
      res.json(devices);
    } catch (error) {
      console.error("Error getting devices:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get devices"
      });
    }
  });

  app.post("/api/staff", async (req: Request, res: Response) => {
    try {
      const staffData = req.body;
      
      // Validate the staff data using the schema
      const validatedData = insertStaffSchema.parse({
        userId: staffData.userId,
        title: staffData.title,
        bio: staffData.bio ?? null,
        locationId: staffData.locationId ?? null,
        commissionType: staffData.commissionType,
        commissionRate: staffData.commissionRate ?? null,
        hourlyRate: staffData.hourlyRate ?? null,
        fixedRate: staffData.fixedRate ?? null,
        // Intentionally omit photoUrl to avoid failing on DBs without this column
      });
      
      // Create the staff record
      const staff = await storage.createStaff(validatedData);
      
      res.status(201).json(staff);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create staff member"
      });
    }
  });

  // Update a staff member
  app.patch("/api/staff/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid staff id" });
      }

      const existing = await storage.getStaff(id);
      if (!existing) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Accept both snake_case and camelCase from client
      const body = req.body || {};
      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.bio !== undefined) updateData.bio = body.bio;
      if (body.locationId !== undefined) updateData.locationId = body.locationId;
      if (body.commission_type !== undefined || body.commissionType !== undefined) {
        updateData.commissionType = body.commission_type ?? body.commissionType;
      }
      if (body.commission_rate !== undefined || body.commissionRate !== undefined) {
        updateData.commissionRate = body.commission_rate ?? body.commissionRate;
      }
      if (body.hourly_rate !== undefined || body.hourlyRate !== undefined) {
        updateData.hourlyRate = body.hourly_rate ?? body.hourlyRate;
      }
      if (body.fixed_rate !== undefined || body.fixedRate !== undefined) {
        updateData.fixedRate = body.fixed_rate ?? body.fixedRate;
      }
      if (body.is_active !== undefined || body.isActive !== undefined) {
        updateData.isActive = body.is_active ?? body.isActive;
      }
      // Omit photoUrl to avoid touching a column that may not exist in some deployments

      const updated = await storage.updateStaff(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update staff"
      });
    }
  });

  // Delete a staff member (appointments remain intact)
  app.delete("/api/staff/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid staff id" });
      }

      const existing = await storage.getStaff(id);
      if (!existing) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Try a hard delete first; leave appointments intact.
      const ok = await storage.deleteStaff(id);
      if (ok) {
        return res.json({ success: true, deleted: true });
      }

      // If hard delete fails due to related records, perform a soft delete instead
      try {
        const updated = await storage.updateStaff(id, { isActive: false } as any);
        return res.json({ success: true, deleted: false, deactivated: true, staffId: updated.id });
      } catch (e) {
        return res.status(500).json({ error: "Failed to delete staff member" });
      }
    } catch (error) {
      console.error("Error deleting staff member:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete staff member",
      });
    }
  });

  // Staff-services assignments
  app.get("/api/staff-services", async (req: Request, res: Response) => {
    try {
      const staffIdParam = req.query.staffId as string | undefined;
      if (staffIdParam) {
        const staffId = parseInt(staffIdParam);
        const list = await storage.getStaffServices(staffId);
        return res.json(list);
      }
      const list = await storage.getAllStaffServices();
      return res.json(list);
    } catch (error) {
      console.error("Error getting staff services:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get staff services",
      });
    }
  });

  app.post("/api/staff-services", async (req: Request, res: Response) => {
    try {
      // Validate input (staffId, serviceId required; custom fields optional)
      const data = staffServiceWithRatesSchema.parse(req.body);

      // If an assignment already exists, update custom rates instead of duplicating
      const existing = await storage.getStaffServiceAssignment(data.staffId, data.serviceId);
      if (existing) {
        const updated = await storage.updateStaffService(existing.id, {
          customRate: data.customRate ?? null,
          customCommissionRate: data.customCommissionRate ?? null,
        } as any);
        return res.status(200).json(updated);
      }

      const created = await storage.assignServiceToStaff({
        staffId: data.staffId,
        serviceId: data.serviceId,
        customRate: data.customRate ?? null,
        customCommissionRate: data.customCommissionRate ?? null,
      } as any);
      return res.status(201).json(created);
    } catch (error) {
      console.error("Error creating staff service assignment:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create staff service assignment",
      });
    }
  });

  app.delete("/api/staff-services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getStaffServiceById(id);
      if (!existing) {
        return res.status(404).json({ error: "Staff service assignment not found" });
      }

      const ok = await storage.removeServiceFromStaff(existing.staffId, existing.serviceId);
      if (!ok) {
        return res.status(500).json({ error: "Failed to delete staff service assignment" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting staff service assignment:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete staff service assignment",
      });
    }
  });

  // Staff schedules
  app.get("/api/schedules", async (req: Request, res: Response) => {
    try {
      const staffIdParam = req.query.staffId as string | undefined;
      const locationIdParam = req.query.locationId as string | undefined;

      let schedules = await storage.getAllStaffSchedules();

      if (staffIdParam) {
        const staffId = parseInt(staffIdParam);
        schedules = schedules.filter(s => s.staffId === staffId);
      }

      if (locationIdParam) {
        const locationId = parseInt(locationIdParam);
        // Include global schedules (null location) along with the specified location
        schedules = schedules.filter(s => s.locationId == null || s.locationId === locationId);
      }

      return res.json(schedules);
    } catch (error) {
      console.error("Error getting schedules:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get schedules",
      });
    }
  });

  app.post("/api/schedules", async (req: Request, res: Response) => {
    try {
      // Clean empty endDate string to null; keep date strings as strings for schema compatibility
      const raw = (req.body || {}) as any;
      const normalized: any = { ...raw };
      if (normalized?.endDate === '') normalized.endDate = null;
      const data = insertStaffScheduleSchema.parse(normalized);

      try {
        console.log("[POST /api/schedules] payload", {
          staffId: (data as any)?.staffId,
          locationId: (data as any)?.locationId,
          dayOfWeek: (data as any)?.dayOfWeek,
          startTime: (data as any)?.startTime,
          endTime: (data as any)?.endTime,
          startDate: (data as any)?.startDate,
          endDate: (data as any)?.endDate,
          isBlocked: (data as any)?.isBlocked,
        });
      } catch {}

      // Validate basic time ordering
      const toMinutes = (t: string) => {
        const [h, m] = String(t).split(":").map((n) => parseInt(n, 10));
        return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
      };
      const newStartMin = toMinutes(data.startTime);
      const newEndMin = toMinutes(data.endTime);
      if (newEndMin <= newStartMin) {
        return res.status(400).json({ error: "End time must be after start time" });
      }

      const toDate = (d: any) => (d ? new Date(d) : undefined);
      const rangeOverlaps = (
        aStart?: Date,
        aEnd?: Date | null,
        bStart?: Date,
        bEnd?: Date | null
      ) => {
        const aS = aStart ? new Date(aStart) : undefined;
        const aE = aEnd ? new Date(aEnd) : new Date("9999-12-31");
        const bS = bStart ? new Date(bStart) : undefined;
        const bE = bEnd ? new Date(bEnd) : new Date("9999-12-31");
        if (!aS || !bS) return true; // if either start missing, treat as overlapping
        return aS <= (bE as Date) && bS <= (aE as Date);
      };

      // Prevent overlapping schedules on the same day for the same staff/location
      // Exception: if creating a blocked schedule, allow overlaps so staff can block off time
      const allSchedules = await storage.getAllStaffSchedules();
      const hasOverlap = (allSchedules || []).some((s: any) => {
        // If the new schedule is a block, we permit overlaps
        if (data.isBlocked) return false;
        if (s.staffId !== data.staffId) return false;
        if (s.locationId !== data.locationId) return false;
        if (String(s.dayOfWeek) !== String(data.dayOfWeek)) return false;

        // Check date range overlap
        const datesOverlap = rangeOverlaps(
          toDate(s.startDate),
          s.endDate ? toDate(s.endDate) : null,
          toDate(data.startDate),
          data.endDate ? toDate(data.endDate) : null
        );
        if (!datesOverlap) return false;

        // Time overlap (treat as half-open intervals to allow back-to-back)
        const sStart = toMinutes(s.startTime);
        const sEnd = toMinutes(s.endTime);
        const timeOverlap = sStart < newEndMin && sEnd > newStartMin;
        return timeOverlap;
      });

      if (hasOverlap) {
        return res.status(409).json({
          error: "Schedule conflicts with an existing schedule for this day",
        });
      }

      const created = await storage.createStaffSchedule(data as any);
      return res.status(201).json(created);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create schedule",
      });
    }
  });

  app.put("/api/schedules/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Allow partial updates
      const partialSchema = insertStaffScheduleSchema.partial();
      // Clean empty endDate string to null; keep date strings as strings for schema compatibility
      const raw = (req.body || {}) as any;
      const normalized: any = { ...raw };
      if (normalized?.endDate === '') normalized.endDate = null;
      const updateData = partialSchema.parse(normalized);

      try {
        console.log("[PUT /api/schedules/:id] payload", {
          id,
          staffId: (updateData as any)?.staffId,
          locationId: (updateData as any)?.locationId,
          dayOfWeek: (updateData as any)?.dayOfWeek,
          startTime: (updateData as any)?.startTime,
          endTime: (updateData as any)?.endTime,
          startDate: (updateData as any)?.startDate,
          endDate: (updateData as any)?.endDate,
          isBlocked: (updateData as any)?.isBlocked,
        });
      } catch {}

      const existing = await (storage as any).getStaffSchedule?.(id);
      if (!existing) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      // Build effective schedule after update
      const effective = {
        staffId: updateData.staffId ?? existing.staffId,
        locationId: updateData.locationId ?? existing.locationId,
        dayOfWeek: updateData.dayOfWeek ?? existing.dayOfWeek,
        startTime: updateData.startTime ?? existing.startTime,
        endTime: updateData.endTime ?? existing.endTime,
        startDate: updateData.startDate ?? existing.startDate,
        endDate: updateData.endDate ?? existing.endDate,
        isBlocked: updateData.isBlocked ?? existing.isBlocked,
      } as any;

      const toMinutes = (t: string) => {
        const [h, m] = String(t).split(":").map((n) => parseInt(n, 10));
        return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
      };
      const effStart = toMinutes(effective.startTime);
      const effEnd = toMinutes(effective.endTime);
      if (effEnd <= effStart) {
        return res.status(400).json({ error: "End time must be after start time" });
      }

      const toDate = (d: any) => (d ? new Date(d) : undefined);
      const rangeOverlaps = (
        aStart?: Date,
        aEnd?: Date | null,
        bStart?: Date,
        bEnd?: Date | null
      ) => {
        const aS = aStart ? new Date(aStart) : undefined;
        const aE = aEnd ? new Date(aEnd) : new Date("9999-12-31");
        const bS = bStart ? new Date(bStart) : undefined;
        const bE = bEnd ? new Date(bEnd) : new Date("9999-12-31");
        if (!aS || !bS) return true;
        return aS <= (bE as Date) && bS <= (aE as Date);
      };

      const allSchedules = await storage.getAllStaffSchedules();
      const hasOverlap = (allSchedules || []).some((s: any) => {
        // If the effective schedule is a block, we permit overlaps
        if (effective.isBlocked) return false;
        if (s.id === id) return false; // exclude self
        if (s.staffId !== effective.staffId) return false;
        if (s.locationId !== effective.locationId) return false;
        if (String(s.dayOfWeek) !== String(effective.dayOfWeek)) return false;

        const datesOverlap = rangeOverlaps(
          toDate(s.startDate),
          s.endDate ? toDate(s.endDate) : null,
          toDate(effective.startDate),
          effective.endDate ? toDate(effective.endDate) : null
        );
        if (!datesOverlap) return false;

        const sStart = toMinutes(s.startTime);
        const sEnd = toMinutes(s.endTime);
        const timeOverlap = sStart < effEnd && sEnd > effStart;
        return timeOverlap;
      });

      if (hasOverlap) {
        return res.status(409).json({
          error: "Updated schedule conflicts with an existing schedule for this day",
        });
      }

      const updated = await storage.updateStaffSchedule(id, updateData as any);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to update schedule",
      });
    }
  });

  app.delete("/api/schedules/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteStaffSchedule(id);
      if (!ok) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete schedule",
      });
    }
  });

  // ----------------------
  // Payroll-related routes
  // ----------------------

  // Detailed payroll view for a single staff member and month
  app.get("/api/payroll/:staffId/detailed", async (req: Request, res: Response) => {
    try {
      const staffId = parseInt(req.params.staffId);
      if (Number.isNaN(staffId)) {
        return res.status(400).json({ error: "Invalid staffId" });
      }

      const monthParam = (req.query.month as string) || new Date().toISOString();
      const monthDate = new Date(monthParam);
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const staffMember = await storage.getStaff(staffId);
      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Load related info up front
      const [user, appts, allPayments] = await Promise.all([
        storage.getUser(staffMember.userId),
        storage.getAppointmentsByStaffAndDateRange(staffId, start, end),
        storage.getAllPayments(),
      ]);

      const staffName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown";

      // Build appointment-level rows
      const detailedAppointments: any[] = [];
      let totalRevenue = 0;
      let totalCommission = 0;

      for (const apt of appts) {
        try {
          const [service, client] = await Promise.all([
            storage.getService(apt.serviceId),
            storage.getUser(apt.clientId || 0),
          ]);

          if (!service) continue;

          // Prefer paid base amount from payment records; exclude tips from revenue
          const payment = allPayments.find((p: any) => p.appointmentId === apt.id && p.status === 'completed');
          const baseAmount = payment?.amount ?? (payment ? Math.max((payment.totalAmount || 0) - (payment.tipAmount || 0), 0) : undefined);
          const servicePrice = baseAmount !== undefined ? baseAmount : (service.price || 0);

          // Check for a custom commission for this staff+service
          const assignment = await storage.getStaffServiceAssignment(staffId, service.id);
          let commissionRate = assignment?.customCommissionRate;
          if (commissionRate !== undefined && commissionRate !== null) {
            // Interpret customCommissionRate as a percentage value if it's > 1 (e.g., 20 => 0.20)
            commissionRate = commissionRate > 1 ? commissionRate / 100 : commissionRate;
          } else {
            commissionRate = staffMember.commissionRate ?? 0;
          }

          let commissionAmount = 0;
          switch (staffMember.commissionType) {
            case 'commission': {
              commissionAmount = servicePrice * (commissionRate || 0);
              break;
            }
            case 'hourly': {
              commissionAmount = 0; // hourly handled elsewhere in UI
              break;
            }
            case 'fixed': {
              commissionAmount = staffMember.fixedRate || 0;
              break;
            }
            case 'hourly_plus_commission': {
              commissionAmount = servicePrice * (commissionRate || 0);
              break;
            }
            default:
              commissionAmount = 0;
          }

          totalRevenue += servicePrice;
          totalCommission += commissionAmount;

          detailedAppointments.push({
            appointmentId: apt.id,
            date: apt.startTime,
            clientName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Unknown',
            serviceName: service.name,
            duration: service.duration || 60,
            servicePrice,
            commissionRate,
            commissionAmount,
            paymentStatus: apt.paymentStatus || 'unpaid',
          });
        } catch (e) {
          // Skip problematic appointment but continue building the report
          continue;
        }
      }

      const summary = {
        totalAppointments: detailedAppointments.length,
        totalRevenue,
        totalCommission,
        averageCommissionPerService: detailedAppointments.length > 0 ? (totalCommission / detailedAppointments.length) : 0,
      };

      return res.json({
        staffName,
        title: staffMember.title,
        commissionType: staffMember.commissionType,
        baseCommissionRate: staffMember.commissionRate ?? 0,
        hourlyRate: staffMember.hourlyRate ?? null,
        summary,
        appointments: detailedAppointments,
      });
    } catch (error) {
      console.error("Error generating detailed payroll view:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load payroll details" });
    }
  });

  // Staff earnings (with optional date range filtering)
  app.get("/api/staff-earnings", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, staffId } = req.query as Record<string, string | undefined>;

      const all = await storage.getAllStaffEarnings();

      const filtered = all.filter((e: any) => {
        if (staffId && String(e.staffId) !== String(staffId)) return false;
        const d = e.earningsDate ? new Date(e.earningsDate) : undefined;
        if (!d) return false;
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
        return true;
      });

      res.json(filtered);
    } catch (error) {
      console.error("Error getting staff earnings:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get staff earnings",
      });
    }
  });

  // Payroll history - list by optional staffId and/or date range
  app.get("/api/payroll-history", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, staffId } = req.query as Record<string, string | undefined>;

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      let histories: any[] = [];

      if (staffId) {
        histories = await storage.getPayrollHistoryByStaff(parseInt(staffId));
      } else {
        // Aggregate across all staff when not specified
        const staffList = await storage.getAllStaff();
        const results = await Promise.all(
          staffList.map((s: any) => storage.getPayrollHistoryByStaff(s.id))
        );
        histories = results.flat();
      }

      if (start || end) {
        histories = histories.filter((h: any) => {
          const ps = h.periodStart ? new Date(h.periodStart) : undefined;
          const pe = h.periodEnd ? new Date(h.periodEnd) : undefined;
          if (!ps || !pe) return false;
          if (start && pe < start) return false; // ends before start
          if (end && ps > end) return false; // starts after end
          return true;
        });
      }

      res.json(histories);
    } catch (error) {
      console.error("Error getting payroll history:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get payroll history",
      });
    }
  });

  // Process payroll for a staff member within a period
  app.post("/api/payroll/process", async (req: Request, res: Response) => {
    try {
      const { staffId, periodStart, periodEnd, periodType } = req.body || {};
      if (!staffId || !periodStart || !periodEnd) {
        return res.status(400).json({ error: "staffId, periodStart, and periodEnd are required" });
      }

      const staffMember = await storage.getStaff(parseInt(staffId));
      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Gather earnings within the specified period
      const allEarnings = await storage.getAllStaffEarnings();
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      const earnings = allEarnings.filter((e: any) => {
        return (
          e.staffId === parseInt(staffId) &&
          e.earningsDate && new Date(e.earningsDate) >= start && new Date(e.earningsDate) <= end
        );
      });

      const totalServices = earnings.length;
      const totalRevenue = earnings.reduce((sum: number, e: any) => sum + (e.servicePrice || 0), 0);
      const totalCommission = earnings.reduce((sum: number, e: any) => sum + (e.earningsAmount || 0), 0);
      const totalHourlyPay = 0; // Not tracked separately here
      const totalFixedPay = 0; // Not tracked separately here
      const totalEarnings = totalCommission + totalHourlyPay + totalFixedPay;

      const record = await storage.createPayrollHistory({
        staffId: parseInt(staffId),
        periodStart: start,
        periodEnd: end,
        periodType: periodType || "monthly",
        totalHours: 0,
        totalServices,
        totalRevenue,
        totalCommission,
        totalHourlyPay,
        totalFixedPay,
        totalEarnings,
        commissionType: staffMember.commissionType,
        baseCommissionRate: staffMember.commissionRate ?? null,
        hourlyRate: staffMember.hourlyRate ?? null,
        fixedRate: staffMember.fixedRate ?? null,
        earningsBreakdown: JSON.stringify({ totalCommission, totalHourlyPay, totalServices, totalRevenue }),
        timeEntriesData: JSON.stringify([]),
        appointmentsData: JSON.stringify([]),
        payrollStatus: "generated",
        notes: undefined,
      } as any);

      res.json({ success: true, payroll: record });
    } catch (error) {
      console.error("Error processing payroll:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process payroll",
      });
    }
  });

  // Check software: list checks
  app.get("/api/check-software/checks", async (req: Request, res: Response) => {
    try {
      const { staffId, status } = req.query as Record<string, string | undefined>;
      const checks = await storage.getPayrollChecks(
        staffId ? parseInt(staffId) : undefined,
        status
      );
      res.json(checks);
    } catch (error) {
      console.error("Error getting payroll checks:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get payroll checks",
      });
    }
  });

  // Check software: issue a payroll check
  app.post("/api/check-software/issue-check", async (req: Request, res: Response) => {
    try {
      const { payrollHistoryId, checkData } = req.body || {};
      if (!payrollHistoryId || !checkData) {
        return res.status(400).json({ error: "payrollHistoryId and checkData are required" });
      }

      // Normalize date fields
      const normalized = {
        ...checkData,
        checkDate: checkData.checkDate ? new Date(checkData.checkDate) : new Date(),
        payrollPeriod: checkData.payrollPeriod
          ? {
              startDate: new Date(checkData.payrollPeriod.startDate),
              endDate: new Date(checkData.payrollPeriod.endDate),
            }
          : undefined,
      };

      const result = await checkSoftwareService.issuePayrollCheck(parseInt(payrollHistoryId), normalized);
      res.json(result);
    } catch (error) {
      console.error("Error issuing payroll check:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to issue payroll check",
      });
    }
  });

  // Voice webhook handlers for Yealink phone integration
  
  // Test endpoint to verify webhook is accessible
  app.get('/api/webhook/voice', (req: Request, res: Response) => {
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const message = twilioPhone 
      ? `Voice webhook is active. Caller ID is set to: ${twilioPhone}. Updated: ${new Date().toISOString()}`
      : 'Voice webhook is active. WARNING: No TWILIO_PHONE_NUMBER env variable set!';
    res.send(message);
  });

  // Diagnostic endpoint to see what Twilio sends
  app.post('/api/webhook/voice/debug', (req: Request, res: Response) => {
    console.log('🔍 Debug webhook - Request body:', JSON.stringify(req.body, null, 2));
    const { From, To, CallSid } = req.body;
    
    // Return TwiML that announces what was received
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Debug mode. From: ${From || 'unknown'}. To: ${To || 'unknown'}. Call ID: ${CallSid || 'unknown'}.</Say>
        <Pause length="2"/>
        <Say>Attempting to dial ${To || 'no number'}.</Say>
        <Dial callerId="+19187277348">+19185551234</Dial>
      </Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  });

  // Simple test endpoint - just tries to dial a number
  app.post('/api/webhook/voice/simple', (req: Request, res: Response) => {
    console.log('📞 Simple webhook called with:', req.body);
    let { To } = req.body;
    
    // Clean up the number and ensure it has + prefix
    if (To) {
      To = To.toString().replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parens
      if (!To.startsWith('+')) {
        if (To.length === 10) {
          To = '+1' + To; // US number without country code
        } else if (To.length === 11 && To.startsWith('1')) {
          To = '+' + To; // US number with country code
        } else {
          To = '+' + To; // Add + to whatever was dialed
        }
      }
    }
    
    console.log('📞 Simple endpoint dialing:', To);
    
    // Very simple TwiML - NO caller ID specified
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Connecting your call.</Say>
        <Dial>${To || '+19185551234'}</Dial>
      </Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  });

  // Test endpoint that just plays a message (no dialing)
  app.post('/api/webhook/voice/test-message', (req: Request, res: Response) => {
    console.log('📞 Test message webhook called');
    
    // Just play a message, no dialing - this should always work
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>This is a test message from your webhook. The webhook is working correctly.</Say>
        <Pause length="2"/>
        <Say>If you hear this message, the issue is with Twilio dialing, not the webhook.</Say>
        <Pause length="2"/>
        <Say>Check if you have a Twilio trial account that can only call verified numbers.</Say>
      </Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  });

  app.post('/api/webhook/voice', async (req: Request, res: Response) => {
    try {
      const { From, To, CallSid } = req.body;
      
      console.log('📞 Voice webhook called:', { From, To, CallSid });
      
      // Check if call is from SIP device (your Yealink phone)
      if (From?.includes('sip:')) {
        // Clean up the To number - remove spaces and ensure proper format
        let dialNumber = To?.toString().trim();
        
        // Remove any spaces, dashes, parentheses from the number
        dialNumber = dialNumber.replace(/[\s\-\(\)]/g, '');
        
        // IMPORTANT: Force US format to prevent international routing
        if (dialNumber && !dialNumber.startsWith('+')) {
          // Remove any leading zeros (international format)
          dialNumber = dialNumber.replace(/^0+/, '');
          
          if (dialNumber.startsWith('1') && dialNumber.length === 11) {
            // US number with country code (1XXXXXXXXXX)
            dialNumber = `+${dialNumber}`;
          } else if (dialNumber.length === 10) {
            // US number without country code (XXXXXXXXXX)
            dialNumber = `+1${dialNumber}`;
          } else if (dialNumber.length === 7) {
            // Local number - add US area code (you may need to change this)
            dialNumber = `+1918${dialNumber}`; // Using 918 area code as default
          } else {
            // For any other format, assume US and prepend +1
            console.log('⚠️ Unusual number format:', dialNumber, 'Length:', dialNumber.length);
            if (!dialNumber.startsWith('1')) {
              dialNumber = `+1${dialNumber}`;
            } else {
              dialNumber = `+${dialNumber}`;
            }
          }
        }
        
        console.log('📞 Original To number:', To);
        console.log('📞 Formatted dial number:', dialNumber);
        console.log('📞 Number length:', dialNumber?.length);
        
        // Outbound call from Yealink - connect the call
        // IMPORTANT: This MUST be your actual Twilio phone number or a verified caller ID
        // Check your Twilio console for your actual number
        let twilioPhone = process.env.TWILIO_PHONE_NUMBER || '+19187277348';
        
        // Clean up the phone number format - remove spaces, parentheses, dashes
        // Convert (918) 727-7348 to +19187277348
        if (twilioPhone && !twilioPhone.startsWith('+')) {
          twilioPhone = twilioPhone.replace(/\D/g, ''); // Remove all non-digits
          if (!twilioPhone.startsWith('1')) {
            twilioPhone = '1' + twilioPhone; // Add country code if missing
          }
          twilioPhone = '+' + twilioPhone; // Add plus sign
        }
        
        console.log('📞 Using caller ID:', twilioPhone);
        
        // For SIP calls, we MUST use a valid Twilio number or verified caller ID
        // If the env variable is not set, try without callerId (might work for some accounts)
        let dialElement;
        if (process.env.TWILIO_PHONE_NUMBER) {
          // Use the configured caller ID
          dialElement = `
            <Dial callerId="${twilioPhone}">
              <Number>${dialNumber}</Number>
            </Dial>`;
        } else {
          // Try without caller ID - Twilio will use the default
          console.log('⚠️ No TWILIO_PHONE_NUMBER env set, dialing without caller ID');
          dialElement = `
            <Dial>
              <Number>${dialNumber}</Number>
            </Dial>`;
        }
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say>Connecting your call.</Say>
            ${dialElement}
            <Say>The call could not be completed. Please check the number and try again.</Say>
          </Response>`;
        
        res.set('Content-Type', 'text/xml');
        return res.send(twiml);
      } else {
        // Inbound call - route to Yealink phone
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say>Thank you for calling. Please hold while we connect you.</Say>
            <Dial>
              <Sip>sip:yealink1@glo-head-spa-phones.sip.twilio.com</Sip>
            </Dial>
          </Response>`;
        
        res.set('Content-Type', 'text/xml');
        return res.send(twiml);
      }
    } catch (error) {
      console.error('Error in voice webhook:', error);
      res.set('Content-Type', 'text/xml');
      res.send('<Response><Say>Sorry, an error occurred processing your call.</Say></Response>');
    }
  });

  // Voice status webhook
  app.post('/api/webhook/voice/status', async (req: Request, res: Response) => {
    const { CallSid, CallStatus } = req.body;
    console.log('📞 Call status update:', CallSid, CallStatus);
    res.status(200).send('OK');
  });

  // Voice processing webhook (for speech/DTMF input if needed)
  app.post('/api/webhook/voice/process', async (req: Request, res: Response) => {
    console.log('📞 Voice processing:', req.body);
    res.set('Content-Type', 'text/xml');
    res.send('<Response><Say>Thank you.</Say></Response>');
  });

  return server;
}