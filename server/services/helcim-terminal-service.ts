import axios from 'axios';
import { TerminalConfig } from '../../shared/schema.js';
import { TerminalConfigService } from './terminal-config-service.js';

// Simple in-memory cache for webhook data
const webhookStore = new Map<
  string,
  { status: 'completed' | 'failed' | 'pending'; transactionId?: string; last4?: string; updatedAt: number }
>();

// Track recent payment sessions to correlate terminal responses
const sessionStore = new Map<
  string,
  { 
    startedAt: number; 
    locationId: string; 
    deviceCode: string;
    totalAmount?: number;
    baseAmount?: number;  // Base amount before tip
  }
>();

export class HelcimTerminalService {
  private readonly baseUrl = 'https://api.helcim.com/v2';
  // Expose webhookStore as a public property so routes can access it directly
  public readonly webhookStore = webhookStore;

  constructor(private readonly configService: TerminalConfigService) {}

  /**
   * Initialize a terminal for a specific location
   */
  async initializeTerminal(config: Omit<TerminalConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      // Save the configuration to database
      await this.configService.saveTerminalConfig({
        ...config,
        isActive: true
      });
      
      console.log(`✅ Terminal ${config.terminalId} initialized for location ${config.locationId}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error initializing terminal ${config.terminalId}:`, error.message);
      return false;
    }
  }

  /**
   * Start a payment on a specific terminal
   */
  async startPayment(
    locationId: string,
    totalAmount: number,
    options: { 
      invoiceNumber?: string;
      description?: string;
      appointmentId?: number;
      reference?: string;
      tipAmount?: number;
    } = {}
  ) {
    // Resolve config; if locationId is blank or not found, fall back to any active config
    let config = locationId ? await this.configService.getTerminalConfig(locationId) : null;
    if (!config) {
      try {
        const fallback = await this.configService.getAnyActiveTerminalConfig();
        if (fallback) {
          config = fallback as any;
          console.warn('⚠️ Using fallback terminal configuration (no location provided or not found).');
        }
      } catch {}
    }
    if (!config) {
      console.error(`❌ No terminal configured${locationId ? ` for location ${locationId}` : ''}`);
      throw new Error(`No terminal configured${locationId ? ` for location ${locationId}` : ''}`);
    }

    // Generate unique invoice number if not provided; prefer client-provided reference
    const invoiceNumber = options.invoiceNumber || options.reference || `POS-${Date.now()}`;

    // Store session for tracking including base amount for tip calculation
    const sessionData = {
      startedAt: Date.now(),
      locationId,
      deviceCode: config.deviceCode,
      totalAmount,
      baseAmount: totalAmount,  // Store the base amount before tip is added on terminal
    };
    sessionStore.set(invoiceNumber, sessionData);
    console.log(`💾 Stored payment session: ${invoiceNumber}`, {
      ...sessionData,
      sessionCount: sessionStore.size
    });

    // Clean up old sessions (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    sessionStore.forEach((value, key) => {
      if (value.startedAt < oneHourAgo) {
        sessionStore.delete(key);
      }
    });

    try {
      // Include webhook URL in the payment request if available
      let webhookUrl: string | undefined = process.env.TERMINAL_WEBHOOK_URL || process.env.HELCIM_WEBHOOK_URL;
      
      // If no explicit webhook URL, try to construct from base URL
      if (!webhookUrl && process.env.PUBLIC_BASE_URL) {
        // Use /api/terminal/webhook endpoint (without "helcim" in the path)
        webhookUrl = `${process.env.PUBLIC_BASE_URL}/api/terminal/webhook`;
      }
      
      // Fallback to localhost for development if no URL is configured
      if (!webhookUrl) {
        // Try to detect if we're in development mode
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
          const port = process.env.PORT || '3002';
          webhookUrl = `http://localhost:${port}/api/terminal/webhook`;
          console.log('📝 Using localhost webhook URL for development:', webhookUrl);
        } else {
          console.warn('⚠️ No webhook URL configured. Set TERMINAL_WEBHOOK_URL, HELCIM_WEBHOOK_URL, or PUBLIC_BASE_URL environment variable.');
          console.warn('⚠️ Without webhook, payment status will only update via polling, which may timeout.');
        }
      }
      
      console.log('🔗 Webhook URL for terminal payment:', webhookUrl);

      // Prepare the payment payload with correct Helcim field names
      const resolvedCurrency = (process.env.HELCIM_CURRENCY || process.env.CURRENCY || '').toUpperCase() || 'USD';
      const transactionAmount = Number(totalAmount.toFixed(2));
      // Append our internal invoiceNumber as a query param so minimal webhooks can be correlated
      let finalWebhookUrl: string | undefined = webhookUrl;
      try {
        if (webhookUrl) {
          const u = new URL(webhookUrl);
          u.searchParams.set('invoiceNumber', String(invoiceNumber));
          finalWebhookUrl = u.toString();
        }
      } catch {
        if (webhookUrl) {
          finalWebhookUrl = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}invoiceNumber=${encodeURIComponent(String(invoiceNumber))}`;
        }
      }
      const payload: any = {
        // Some Helcim endpoints expect `transactionAmount`, others `amount` – provide both to be safe
        transactionAmount,
        amount: transactionAmount,
        currency: resolvedCurrency,
        invoiceNumber,
        customerCode: (options as any)?.customerCode || '',
        // Add webhook/callback aliases so Helcim can notify completion
        webhookUrl: finalWebhookUrl || webhookUrl,
        callbackUrl: finalWebhookUrl || webhookUrl,
        notificationUrl: finalWebhookUrl || webhookUrl,
      };
      try { console.log('💱 Using currency for Helcim terminal purchase:', resolvedCurrency); } catch {}

      const token = config.apiToken || process.env.HELCIM_API_TOKEN;
      
      console.log('📤 Sending payment to terminal:', {
        deviceCode: config.deviceCode,
        invoiceNumber,
        totalAmount,
        hasToken: !!token
      });
      
      let response: any;
      let paymentSent = false;
      
      // Try multiple endpoints to send payment to terminal
      const endpoints = [
        { 
          path: `/devices/${config.deviceCode}/payment/purchase`,
          name: 'Device Purchase',
          requiresIdempotency: false
        },
        {
          path: `/payment/purchase`,
          name: 'Generic Purchase with terminalId',
          requiresIdempotency: true,
          modifyPayload: (p: any) => ({ ...p, terminalId: config.deviceCode })
        }
      ];
      
      for (const endpoint of endpoints) {
        console.log(`🔄 Attempting ${endpoint.name}:`, {
          endpoint: endpoint.path,
          deviceCode: config.deviceCode,
          invoiceNumber,
          amount: payload.transactionAmount,
          webhookUrl: payload.webhookUrl || 'NOT SET',
          hasToken: !!token
        });
        
        try {
          const endpointPayload = endpoint.modifyPayload ? endpoint.modifyPayload(payload) : payload;
          const headers: Record<string, string> = {};
          
          if (endpoint.requiresIdempotency) {
            // Generate idempotency key for endpoints that require it
            headers['idempotency-key'] = `${invoiceNumber}-${Date.now()}`;
          }
          
          response = await this.makeRequest(
            'POST', 
            endpoint.path, 
            // Add ipAddress for endpoints that require client IP context
            { ipAddress: '0.0.0.0', ...endpointPayload }, 
            token,
            headers
          );
          
          console.log(`✅ Payment sent to terminal via ${endpoint.name}:`, {
            invoiceNumber,
            response: response?.data || response
          });
          
          // Check if the transaction was actually declined
          const responseData = response?.data || response;
          if (responseData?.approved === false || responseData?.status === 'declined' || responseData?.responseMessage?.toLowerCase().includes('decline')) {
            console.warn(`⚠️ Transaction was DECLINED by the processor!`);
            console.warn(`Decline reason: ${responseData?.responseMessage || responseData?.message || 'Unknown'}`);
            console.warn(`Full response:`, responseData);
          }
          
          paymentSent = true;
          break; // Success, exit loop
          
        } catch (err: any) {
          const errorMsg = String(err?.message || err?.response?.data || err).toLowerCase();
          console.error(`❌ ${endpoint.name} failed:`, errorMsg);
          
          // If this is the last endpoint, throw the error
          if (endpoint === endpoints[endpoints.length - 1]) {
            throw err;
          }
        }
      }
      
      // Process the response to extract transaction details
      if (paymentSent && response) {
        const responseData = response?.data || response;
        const transactionId = responseData?.transactionId || responseData?.id || responseData?.paymentId || invoiceNumber;
        
        console.log('💳 Transaction details:', {
          transactionId,
          invoiceNumber,
          approved: responseData?.approved,
          status: responseData?.status,
          message: responseData?.responseMessage || responseData?.message
        });
        
        // Update session with transaction ID
        if (transactionId && transactionId !== invoiceNumber) {
          const session = sessionStore.get(invoiceNumber);
          if (session) {
            sessionStore.set(String(transactionId), session);
          }
        }
        
        // Store in webhook cache if payment was successful
        if (responseData?.approved === true || responseData?.status === 'completed') {
          webhookStore.set(String(transactionId), {
            status: 'completed',
            transactionId: String(transactionId),
            last4: responseData?.cardLast4 || responseData?.last4,
            updatedAt: Date.now(),
          });
          if (invoiceNumber !== transactionId) {
            webhookStore.set(String(invoiceNumber), {
              status: 'completed',
              transactionId: String(transactionId),
              last4: responseData?.cardLast4 || responseData?.last4,
              updatedAt: Date.now(),
            });
          }
        }
        
        return {
          success: true,
          transactionId: String(transactionId),
          message: 'Payment sent to terminal',
        };
      }
      
      if (!paymentSent) {
        // All endpoints failed - try to locate the transaction anyway
        console.error('❌ All payment endpoints failed. Checking for existing transaction...');
        try {
          const recentQuery = await this.makeRequest(
            'GET',
            `/card-transactions`,
            undefined,
            token
          );
          const rd = (recentQuery?.data as any) || {};
          const list = Array.isArray(rd) ? rd : (Array.isArray(rd?.transactions) ? rd.transactions : []);
          const match = list.find((t: any) => {
            const inv = t?.invoiceNumber || t?.invoice || t?.referenceNumber || t?.reference || '';
            return inv === invoiceNumber;
          });
          if (match) {
            const pid = match.id || match.transactionId || match.paymentId || invoiceNumber;
            if (typeof pid === 'string' && pid !== invoiceNumber) {
              try {
                const existing = sessionStore.get(invoiceNumber);
                if (existing) {
                  sessionStore.set(String(pid), existing);
                }
              } catch {}
              return { transactionId: pid, paymentId: pid, invoiceNumber, status: 'pending' };
            }
          }
        } catch {}
        // Return with pending state to enable polling
        try { console.warn('⚠️ Helcim purchase error; returning invoice for polling'); } catch {}
        return { invoiceNumber, status: 'pending' };
      }

      const data = response?.data || {};
      
      // Check for transaction ID in various response formats
      let transactionId = data?.transactionId || data?.id || data?.paymentId;
      
      // Check response headers for Location or transaction ID
      let locationHeader = response?.headers?.location || response?.headers?.Location;
      if (!locationHeader) {
        const raw = (response as any)?.headers || {};
        const lk = Object.keys(raw).find(k => k.toLowerCase() === 'location');
        if (lk) {
          locationHeader = (response as any).headers[lk];
        }
      }
      if (!locationHeader) {
        const raw = (response as any)?.res?.headers || {};
        const lk = Object.keys(raw).find(k => k.toLowerCase() === 'location');
        if (lk) {
          locationHeader = raw[lk];
        }
      }
      if (locationHeader && typeof locationHeader === 'string') {
        const match = locationHeader.match(/\/([^\/]+)$/);
        if (match?.[1]) {
          transactionId = match[1];
        }
      }
      
      // Store the payment in webhook cache with pending status
      if (transactionId) {
        webhookStore.set(String(transactionId), {
          status: 'pending',
          transactionId,
          updatedAt: Date.now(),
        });
        // Also store under invoice number for lookup
        try {
          if (invoiceNumber !== transactionId) {
            sessionStore.set(String(transactionId), {
              startedAt: Date.now(),
              locationId,
              deviceCode: config.deviceCode,
              totalAmount,
              // omit description in session typing to keep types minimal in dist
            });
          }
        } catch {}
        return { transactionId, paymentId: transactionId, invoiceNumber, status: 'pending' };
      }
      
      // If no transaction ID immediately available, check for it in the response
      const pid = data?.paymentId || data?.id || data?.transactionId || invoiceNumber;
      if (pid && typeof pid === 'string' && pid !== invoiceNumber) {
        try {
          const existing = sessionStore.get(invoiceNumber);
          if (existing) {
            sessionStore.set(String(pid), existing);
          }
        } catch {}
        return { ...data, transactionId: pid, paymentId: pid, invoiceNumber };
      }

      // Sometimes the transaction ID is returned after a brief delay
      // Try polling recent transactions for our invoice number
      const maxAttempts = 6;
      const pollDelayMs = 500;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const recentQuery = await this.makeRequest(
            'GET',
            `/card-transactions`,
            undefined,
            token
          );
          const rd = (recentQuery?.data as any) || {};
          const list = Array.isArray(rd) ? rd : (Array.isArray(rd?.transactions) ? rd.transactions : []);
          const match = list.find((t: any) => {
            const inv = t?.invoiceNumber || t?.invoice || t?.referenceNumber || t?.reference || '';
            return inv === invoiceNumber;
          });
          if (match) {
            const pid = match.id || match.transactionId || match.paymentId;
            if (typeof pid === 'string' && pid !== invoiceNumber) {
              try {
                const existing = sessionStore.get(invoiceNumber);
                if (existing) {
                  sessionStore.set(String(pid), existing);
                }
              } catch {}
              try { console.log('⚡ Found transactionId after purchase', { invoiceNumber, transactionId: pid }); } catch {}
              return { transactionId: pid, paymentId: pid, invoiceNumber, status: 'pending' };
            }
          }
        } catch {}
        // wait 500ms before next attempt
        await new Promise((r) => setTimeout(r, pollDelayMs));
      }

      // Return with invoice number for polling
      return { ...data, invoiceNumber, status: 'pending' };
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('Conflict') || msg.includes('busy') || msg.includes('in use')) {
        console.warn('⚠️ Terminal busy, returning invoice for status polling');
        return { invoiceNumber, status: 'pending' };
      }
      if (msg.includes('Not Found') || msg.includes('404') || msg.includes('not configured')) {
        console.error(`❌ Error starting payment on terminal ${config.terminalId}:`, error.message);
        throw error;
      }
      try { console.warn('⚠️ startPayment unexpected error; returning invoice for polling:', { invoiceNumber, msg }); } catch {}
      return { invoiceNumber, status: 'pending' };
    }
  }

  /**
   * Check payment status on a terminal
   */
  async checkPaymentStatus(locationId: string, paymentId: string) {
    console.log('🔍 Checking payment status:', { locationId, paymentId });
    
    // Debug: Show what's in the cache
    const cacheKeys = Array.from(webhookStore.keys()).filter(k => !k.includes('GLOBAL'));
    console.log('🗑️ Current webhook cache keys:', cacheKeys.slice(-5)); // Show last 5 keys
    
    // Strict mode: do not auto-complete from global markers; require explicit cache match.

    // First check webhook cache - this is the most reliable source
    if (webhookStore.has(String(paymentId))) {
      const cached = webhookStore.get(String(paymentId))!;
      console.log('✅ Found payment in webhook cache:', cached);
      return {
        status: cached.status,
        transactionId: cached.transactionId || paymentId,
        last4: cached.last4,
        cardLast4: cached.last4,
        amount: (cached as any).amount,
        tipAmount: (cached as any).tipAmount,
        baseAmount: (cached as any).baseAmount,
      };
    } else {
      console.log(`⚠️ Payment ${paymentId} not found in webhook cache`);
    }
    
    // Check if we have an active session for this payment
    const session = sessionStore.get(String(paymentId));
    if (session) {
      console.log('📋 Found active session for payment');
      // Try to enrich status by querying recent card transactions and matching by invoice or id
      try {
        const looksLikeInvoice = String(paymentId).startsWith('POS-');
        const invoiceNumber = looksLikeInvoice ? String(paymentId) : undefined;
        // Resolve terminal config to obtain API token
        let cfg = session.locationId
          ? await this.configService.getTerminalConfig(session.locationId)
          : null;
        if (!cfg && session.deviceCode) {
          try { cfg = await this.configService.getTerminalConfigByDeviceCode(session.deviceCode); } catch {}
        }
        const apiToken = cfg?.apiToken || process.env.HELCIM_API_TOKEN;
        if (apiToken) {
          // Skip API enrichment - Helcim v2 API doesn't have these endpoints
          // The webhook should provide all needed data
          console.log('⚠️ Skipping API enrichment - relying on webhook data');
          
          // Don't try to call non-existent endpoints
          let combined: any[] = [];

          // Deduplicate entries by id
          const seen = new Set<string>();
          const unique = combined.filter((t: any) => {
            const tid = String(t?.id || t?.transactionId || t?.paymentId || Math.random());
            if (seen.has(tid)) return false;
            seen.add(tid);
            return true;
          });

          // Find match by invoice or id
          const match = unique.find((t: any) => {
            const inv = t?.invoiceNumber || t?.invoice || t?.referenceNumber || t?.reference || '';
            const tid = t?.id || t?.transactionId || t?.paymentId || '';
            return (invoiceNumber && String(inv) === String(invoiceNumber)) || String(tid) === String(paymentId);
          });

          if (match) {
            const approved = match?.approved === true || String(match?.approved).toLowerCase() === 'true';
            const typeOrStatus = String(match?.type || match?.status || '').toLowerCase();
            const isCompleted = approved || typeOrStatus === 'cardtransaction' || typeOrStatus === 'approved' || typeOrStatus === 'completed' || typeOrStatus === 'captured' || typeOrStatus === 'sale';
            if (isCompleted) {
              const tid = String(match?.id || match?.transactionId || match?.paymentId || paymentId);
              const last4 = match?.cardLast4 || match?.last4;
              const cacheVal = { status: 'completed' as const, transactionId: tid, last4, updatedAt: Date.now() };
              webhookStore.set(String(tid), cacheVal);
              if (invoiceNumber && invoiceNumber !== tid) webhookStore.set(String(invoiceNumber), cacheVal);
              return {
                status: 'completed',
                transactionId: tid,
                last4,
                cardLast4: last4,
              };
            }
          }
        }
      } catch {}
      // If not enriched yet, remain pending until webhook or next poll
      return {
        status: 'pending',
        message: 'Waiting for terminal confirmation...',
        transactionId: paymentId,
      };
    }
    
    // No cache or session - payment might be old or webhook was missed
    console.log('⚠️ No status found for payment:', paymentId);
    return {
      status: 'pending',
      message: 'Payment status unknown - check terminal',
      transactionId: paymentId,
    };
  }

  /**
   * Cancel an in-progress payment
   */
  async cancelPayment(locationId: string, paymentId: string) {
    const config = await this.configService.getTerminalConfig(locationId);
    if (!config) {
      throw new Error(`No terminal configured for location ${locationId}`);
    }

    try {
      const response = await this.makeRequest('POST', `/devices/${config.deviceCode}/transactions/${paymentId}/cancel`, undefined, config.apiToken);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error canceling payment on terminal ${config.terminalId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get terminal status
   */
  async getTerminalStatus(locationId: string) {
    const config = await this.configService.getTerminalConfig(locationId);
    if (!config) {
      throw new Error(`No terminal configured for location ${locationId}`);
    }

    try {
      // Return a minimal status; detailed connectivity is exercised during payment
      return { success: true, status: 'configured', terminalId: config.terminalId, deviceCode: config.deviceCode };
    } catch (error: any) {
      console.error(`❌ Error getting terminal status ${config.terminalId}:`, error.message);
      throw error;
    }
  }

  /**
   * Handle webhook payloads from Helcim and cache by invoiceNumber or transactionId
   * If only an id is provided, enrich by fetching transaction details.
   */
  async handleWebhook(payload: any) {
    try {
      console.log('🔍 Processing webhook payload:', JSON.stringify(payload, null, 2));
      console.log('📌 Webhook has transactionId:', payload?.transactionId || payload?.id, 'type:', payload?.type);
      
      // Debug: Show current sessions
      const currentSessions: string[] = [];
      sessionStore.forEach((value, key) => {
        const age = Date.now() - value.startedAt;
        if (age <= 10 * 60 * 1000) { // Sessions from last 10 minutes
          currentSessions.push(`${key} (${Math.round(age / 1000)}s old)`);
        }
      });
      console.log('📋 Active sessions when webhook arrived:', currentSessions.length > 0 ? currentSessions : 'NONE');
      
      // Extract invoice number - check for POS-* pattern in various fields
      let invoiceNumber = payload?.invoiceNumber || payload?.invoice || payload?.referenceNumber || payload?.reference || payload?.invoiceId;
      const transactionId = payload?.transactionId || payload?.cardTransactionId || payload?.id || payload?.paymentId;
      let last4 = payload?.last4 || payload?.cardLast4 || payload?.card?.last4 || payload?.cardLastFour || undefined;
      const amount = payload?.amount || payload?.totalAmount;
      
      // Log what we extracted
      console.log('📝 Extracted from webhook:', {
        invoiceNumber,
        transactionId,
        last4,
        amount,
        type: payload?.type
      });
      
      // Check various status fields from Helcim webhook
      const rawStatus = String(
        payload?.status || 
        payload?.result || 
        payload?.outcome || 
        payload?.type || 
        payload?.approved || 
        ''
      ).toLowerCase();
      
      console.log('📊 Webhook status fields:', {
        invoiceNumber,
        transactionId,
        rawStatus,
        last4,
        amount,
        approved: payload?.approved,
        type: payload?.type
      });
      
      // Be more permissive with status detection
      // DEFAULT TO COMPLETED for cardTransaction type webhooks
      let normalized: 'completed' | 'failed' | 'pending' = 'pending';
      
      // IMPORTANT: Helcim typically only sends webhooks for successful transactions
      // We should default to 'completed' for cardTransaction webhooks unless explicitly failed
      
      // First check for explicitly failed/declined status
      if (
        rawStatus.includes('declined') || 
        rawStatus.includes('failed') || 
        rawStatus.includes('canceled') || 
        rawStatus.includes('cancelled') ||
        rawStatus.includes('voided') ||
        rawStatus.includes('refunded') ||
        rawStatus.includes('error') ||
        payload?.approved === false ||
        payload?.approved === 'false' ||
        payload?.approved === 0 ||
        payload?.approved === '0' ||
        payload?.status === 'failed' ||
        payload?.status === 'cancelled' ||
        payload?.status === 'declined'
      ) {
        console.log('❌ Payment declined/failed status detected in webhook');
        normalized = 'failed';
      } 
      // Check for explicit success indicators
      else if (
        rawStatus.includes('approved') || 
        rawStatus.includes('success') || 
        rawStatus.includes('completed') || 
        rawStatus.includes('captured') || 
        rawStatus.includes('sale') ||
        rawStatus === 'true' || // Sometimes 'approved' field is boolean
        payload?.approved === true ||
        payload?.approved === 'true' ||
        payload?.approved === 1 ||
        payload?.approved === '1' ||
        payload?.status === 'completed' ||
        payload?.status === 'approved'
      ) {
        console.log('✅ Payment approved/completed status detected in webhook');
        normalized = 'completed';
      }
      // For cardTransaction type with no clear status, DEFAULT TO COMPLETED
      else if (payload?.type === 'cardTransaction' && transactionId) {
        // Helcim generally only sends webhooks for successful transactions
        // If there's no explicit failure indicator, treat it as successful
        console.log('✅ CardTransaction webhook without explicit status - treating as successful (Helcim default behavior)');
        normalized = 'completed';
      }
      // Only remain pending if we truly can't determine the type
      else if (!payload?.type) {
        console.log('⚠️ Webhook without type field, keeping as pending');
      }
      
      console.log('✅ Webhook normalized status:', normalized);

      if (!invoiceNumber && !transactionId) {
        console.log('⚠️ No invoice or transaction ID in webhook');
        return;
      }

      // Always try to enrich the webhook data if we have a transaction ID
      // This will help us get the invoice number and card last 4 digits
      let enrichmentAttempted = false;
      let enrichmentSuccess = false;
      
      // Try to find the session to get the invoice number and base amount
      let sessionKey: string | null = null;
      let session: { startedAt: number; locationId: string; deviceCode: string; baseAmount?: number } | null = null;
      if (invoiceNumber && sessionStore.has(String(invoiceNumber))) {
        sessionKey = String(invoiceNumber);
        session = sessionStore.get(sessionKey)!;
      } else if (!invoiceNumber && transactionId) {
        // Try to find session by recent time window
        const now = Date.now();
        let bestKey: string | null = null;
        let best: { startedAt: number; locationId: string; deviceCode: string; baseAmount?: number } | null = null;
        sessionStore.forEach((value, key) => {
          if (now - value.startedAt <= 10 * 60 * 1000) {
            if (!best || value.startedAt > best.startedAt) {
              best = value;
              bestKey = key;
            }
          }
        });
        if (best && bestKey) {
          session = best;
          sessionKey = bestKey;
          if (!invoiceNumber) {
            invoiceNumber = bestKey; // Use session key as invoice number
            console.log('📝 Using session key as invoice number:', invoiceNumber);
          }
        }
      }

      // Try to enrich the webhook data by querying the transaction details
      // This helps us get the invoice number, card last 4 digits, and tip amounts
      // Always enrich if we have a transaction ID to get complete payment details including tips
      if (transactionId) {
        enrichmentAttempted = true;
        try {
          let apiToken: string | undefined;
          try {
            const cfg = await this.configService.getAnyActiveTerminalConfig();
            apiToken = cfg?.apiToken || process.env.HELCIM_API_TOKEN;
          } catch {
            apiToken = process.env.HELCIM_API_TOKEN;
          }
          if (apiToken) {
            console.log('🔄 Attempting to enrich transaction:', transactionId);
            // Try to get transaction details from Helcim API
            // Note: Helcim v2 API doesn't have a direct endpoint to get transaction by ID
            // The enrichment will likely fail, but we'll handle it gracefully
            let t: any = {};
            try {
              // Attempt to get transaction details (this endpoint may not exist in v2)
              const resp = await this.makeRequest('GET', `/payment/transaction/${transactionId}`, undefined, apiToken);
              t = (resp?.data as any) || {};
            } catch (err) {
              // If direct transaction lookup fails, that's okay - we'll use webhook data
              console.log('ℹ️ Transaction details not available via API, using webhook data');
              t = payload; // Use webhook payload as fallback
            }
            
            // Log the full response to debug tip handling
            console.log('💳 Full transaction details from Helcim:', JSON.stringify(t, null, 2));
            
            const inv = t?.invoiceNumber || t?.invoice || t?.referenceNumber || t?.reference || undefined;
            const l4 = t?.cardLast4 || t?.last4 || t?.card?.last4 || t?.cardNumber || last4;
            
            // Extract total amount from Helcim (includes tip)
            const totalAmount = t?.amount || t?.totalAmount || t?.transactionAmount || t?.total || payload?.amount;
            
            // If initial webhook didn't indicate outcome, derive it from enriched details
            if (normalized !== 'completed' && normalized !== 'failed') {
              const enrichedRaw = String(
                t?.status || t?.result || t?.outcome || t?.type || t?.approved || ''
              ).toLowerCase();
              const enrichedApproved = t?.approved === true || String(t?.approved).toLowerCase() === 'true';
              if (
                enrichedApproved ||
                enrichedRaw.includes('approved') ||
                enrichedRaw.includes('success') ||
                enrichedRaw.includes('completed') ||
                enrichedRaw.includes('captured') ||
                enrichedRaw.includes('sale')
              ) {
                console.log('✅ Enriched transaction indicates completion');
                normalized = 'completed';
              } else if (
                enrichedRaw.includes('declined') ||
                enrichedRaw.includes('failed') ||
                enrichedRaw.includes('voided') ||
                enrichedRaw.includes('refunded') ||
                enrichedRaw.includes('canceled') ||
                enrichedRaw.includes('cancelled')
              ) {
                console.log('❌ Enriched transaction indicates failure');
                normalized = 'failed';
              }
            }

            // Helcim doesn't return tip as separate field, so calculate it from session data
            let tipAmount = 0;
            let baseAmount = totalAmount;
            
            // Try to get base amount from session to calculate tip
            if (session && session.baseAmount && totalAmount) {
              baseAmount = session.baseAmount;
              tipAmount = Number((totalAmount - baseAmount).toFixed(2));
              console.log('💰 Calculated tip from session:', { baseAmount, tipAmount, totalAmount });
            }
            
            if (inv) invoiceNumber = String(inv);
            if (l4) last4 = String(l4);
            
            // Store the amounts in the payload for caching
            if (totalAmount) payload.amount = totalAmount;
            if (tipAmount) payload.tipAmount = tipAmount;
            if (baseAmount) payload.baseAmount = baseAmount;
            
            console.log('🧩 Enriched webhook via API', { 
              invoiceNumber, 
              last4, 
              transactionId,
              totalAmount,
              tipAmount,
              baseAmount
            });
            enrichmentSuccess = true;
          }
        } catch (e) {
          const errorMsg = String((e as any)?.message || e);
          // Don't worry about 404 errors - the transaction might not be immediately available
          if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
            console.log('ℹ️ Transaction not yet available in API; proceeding with minimal webhook data');
          } else {
            console.log('⚠️ Transaction enrichment failed:', errorMsg);
          }
        }
      } else {
        console.log('⚠️ No API token available for enrichment');
      }

      // CRITICAL FIX: If Helcim omitted invoiceNumber, match to recent POS-* sessions
      if (!invoiceNumber && transactionId) {
        console.log('⚠️ No invoice number in webhook, attempting to match to recent sessions...');
        try {
          const now = Date.now();
          let bestMatch: { key: string; session: any; age: number } | null = null;
          
          sessionStore.forEach((value, key) => {
            // Only consider POS-* invoice numbers from recent sessions (last 5 minutes)
            if (key && key.startsWith('POS-')) {
              const age = now - value.startedAt;
              if (age <= 5 * 60 * 1000) {
                // Prefer the most recent session
                if (!bestMatch || age < bestMatch.age) {
                  bestMatch = { key, session: value, age };
                }
              }
            }
          });
          
          if (bestMatch) {
            invoiceNumber = bestMatch.key;
            console.log(`✅ Matched webhook to session: ${invoiceNumber} (${Math.round(bestMatch.age / 1000)}s old)`);
            
            // Also update the session to include the transaction ID
            sessionStore.set(String(transactionId), bestMatch.session);
          } else {
            console.log('❌ No matching POS-* session found in last 5 minutes');
          }
        } catch (err) {
          console.error('❌ Error matching webhook to session:', err);
        }
      }

      // If we didn't get tip amount from enrichment but have session with base amount, calculate it
      if (!payload?.tipAmount && session?.baseAmount && payload?.amount) {
        const totalAmount = payload.amount;
        const baseAmount = session.baseAmount;
        const tipAmount = Number((totalAmount - baseAmount).toFixed(2));
        
        payload.baseAmount = baseAmount;
        payload.tipAmount = tipAmount;
        
        console.log('💰 Calculated tip from session (no enrichment):', { 
          baseAmount, 
          tipAmount, 
          totalAmount 
        });
      }
      
      // Cache under both keys so polling by either id can resolve
      const cacheValue = {
        status: normalized,
        transactionId,
        last4,
        amount: payload?.amount,
        tipAmount: payload?.tipAmount,
        baseAmount: payload?.baseAmount,
        updatedAt: Date.now(),
      } as const;
      
      // Cache by invoice number
      if (invoiceNumber) {
        webhookStore.set(String(invoiceNumber), cacheValue);
        console.log(`💾 Cached by invoice: ${invoiceNumber} -> status: ${normalized}`);
      }
      
      // Cache by transaction ID
      if (transactionId) {
        webhookStore.set(String(transactionId), cacheValue);
        console.log(`💾 Cached by transaction: ${transactionId} -> status: ${normalized}`);
      }
      
      // CRITICAL: Always try to match webhooks to recent POS-* sessions
      // This is essential because Helcim doesn't include our invoice number in webhooks
      if (transactionId) {
        console.log('🔍 Looking for recent POS-* sessions to match webhook...');
        const now = Date.now();
        const recentSessions: Array<{ key: string; age: number; session: any }> = [];
        
        sessionStore.forEach((value, key) => {
          if (key && key.startsWith('POS-')) {
            const age = now - value.startedAt;
            // Be more generous with the time window - payments can take a while
            if (age <= 10 * 60 * 1000) { // Last 10 minutes
              recentSessions.push({ key, age, session: value });
            }
          }
        });
        
        if (recentSessions.length > 0) {
          // Sort by most recent first
          recentSessions.sort((a, b) => a.age - b.age);
          
          console.log(`🎯 Found ${recentSessions.length} recent POS-* session(s)`);
          
          // For completed payments, cache under ALL recent sessions
          // For other statuses, cache under the most recent one only
          if (normalized === 'completed') {
            recentSessions.forEach(({ key, age }) => {
              webhookStore.set(key, cacheValue);
              console.log(`✅ Cached completed payment under session: ${key} (${Math.round(age / 1000)}s old)`);
            });
          } else {
            // For failed/pending, only cache under the most recent session
            const mostRecent = recentSessions[0];
            webhookStore.set(mostRecent.key, cacheValue);
            console.log(`💾 Cached ${normalized} payment under most recent session: ${mostRecent.key}`);
          }
          
          // If we didn't have an invoice number before, use the most recent POS session key
          if (!invoiceNumber) {
            invoiceNumber = recentSessions[0].key;
            console.log(`🆕 Using POS session key as invoice number: ${invoiceNumber}`);
          }
        } else {
          console.log('⚠️ No recent POS-* sessions found - webhook may not match any payment!');
        }
      }
      
      // Also record a global last-completed marker to allow simple confirmation flows
      if (normalized === 'completed') {
        try {
          webhookStore.set('__GLOBAL_LAST_COMPLETED__', cacheValue as any);
          (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__ = {
            status: 'completed',
            transactionId: transactionId,
            invoiceNumber: invoiceNumber,
            last4: last4,
            amount: payload?.amount,
            tipAmount: payload?.tipAmount,
            baseAmount: payload?.baseAmount,
            updatedAt: Date.now(),
          };
        } catch {}
      }
      
      // Also try to match with any active sessions that might be waiting
      // This helps when the invoice number format doesn't match exactly
      if (normalized === 'completed' && sessionStore.size > 0) {
        const now = Date.now();
        const recentThreshold = 5 * 60 * 1000; // 5 minutes
        
        sessionStore.forEach((session, sessionKey) => {
          // Check if this is a recent session that might be waiting for this webhook
          if (now - session.startedAt <= recentThreshold) {
            console.log(`🔄 Checking session ${sessionKey} for match...`);
            
            // If we don't have a specific invoice match, consider this might be the payment
            // for the most recent session (especially if it's the only recent one)
            if (!webhookStore.has(sessionKey)) {
              console.log(`📌 Associating webhook with session ${sessionKey}`);
              webhookStore.set(sessionKey, cacheValue);
            }
          }
        });
      }

      console.log('✅ Webhook processing complete:', { 
        invoiceNumber, 
        transactionId, 
        status: normalized, 
        last4,
        cachedKeys: Array.from(webhookStore.keys()).filter(k => !k.includes('GLOBAL')) // Show all non-global keys
      });
    } catch (error: any) {
      console.error('❌ Error handling webhook:', error);
      
      // CRITICAL: Even if there's an error, try to cache the webhook
      // This ensures we don't lose payment status
      try {
        const fallbackTransactionId = payload?.transactionId || payload?.id;
        if (fallbackTransactionId) {
          const fallbackCache = {
            status: 'completed' as const, // Default to completed for cardTransaction
            transactionId: fallbackTransactionId,
            updatedAt: Date.now(),
          };
          
          // Cache by transaction ID
          webhookStore.set(String(fallbackTransactionId), fallbackCache);
          console.log('🆘 Emergency cache: Stored webhook despite error');
          
          // Also try to cache under recent POS sessions
          const now = Date.now();
          sessionStore.forEach((value, key) => {
            if (key && key.startsWith('POS-')) {
              const age = now - value.startedAt;
              if (age <= 10 * 60 * 1000) {
                webhookStore.set(key, fallbackCache);
                console.log(`🆘 Emergency cache: Also cached under ${key}`);
              }
            }
          });
        }
      } catch (emergencyError) {
        console.error('❌❌ Even emergency caching failed:', emergencyError);
      }
    }
  }

  /**
   * Debug snapshot of recent sessions and webhooks for troubleshooting
   */
  getDebugSnapshot() {
    const sessions: any[] = [];
    sessionStore.forEach((value, key) => {
      sessions.push({ key, ...value });
    });
    
    const webhooks: any[] = [];
    webhookStore.forEach((value, key) => {
      webhooks.push({ key, ...value });
    });
    
    return {
      sessions: sessions.slice(-10),
      webhooks: webhooks.slice(-10),
      sessionCount: sessionStore.size,
      webhookCount: webhookStore.size,
    };
  }

  /**
   * Check cached webhook data first
   */
  getCachedWebhookStatus(id: string) {
    return webhookStore.get(String(id));
  }

  /**
   * Alias for getCachedWebhookStatus for backward compatibility
   */
  checkWebhookCache(id: string) {
    return this.getCachedWebhookStatus(id);
  }

  private async makeRequest(method: string, endpoint: string, data?: any, apiToken?: string, extraHeaders?: Record<string, string>) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`🌐 Making ${method} request to: ${url}`);
    
    try {
      const response = await axios({
        method,
        url,
        headers: {
          'api-token': apiToken,
          // Send Bearer as well for environments that require it
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...extraHeaders
        },
        data,
      });

      return response;
    } catch (error: any) {
      console.error('❌ Helcim API request failed:', {
        url: `${this.baseUrl}${endpoint}`,
        method,
        error: error.response?.data || error.message
      });
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error || 
                            error.response.statusText || 
                            'API request failed';
        throw new Error(errorMessage);
      }
      throw error;
    }
  }
}
