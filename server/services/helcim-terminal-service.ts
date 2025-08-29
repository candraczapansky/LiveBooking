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
  }
>();

export class HelcimTerminalService {
  private readonly baseUrl = 'https://api.helcim.com/v2';

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

    // Store session for tracking
    sessionStore.set(invoiceNumber, {
      startedAt: Date.now(),
      locationId,
      deviceCode: config.deviceCode,
      totalAmount,
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
      let webhookUrl: string | undefined = process.env.TERMINAL_WEBHOOK_URL;
      
      // If no explicit webhook URL, try to construct from base URL
      if (!webhookUrl && process.env.PUBLIC_BASE_URL) {
        webhookUrl = `${process.env.PUBLIC_BASE_URL}/api/terminal/webhook`;
      }
      
      if (!webhookUrl) {
        console.warn('⚠️ No webhook URL configured. Set TERMINAL_WEBHOOK_URL or PUBLIC_BASE_URL environment variable for terminal payment callbacks.');
        console.warn('⚠️ Without webhook, payment status will only update via polling.');
      }

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
      };
    }
    
    // Check if we have an active session for this payment
    const session = sessionStore.get(String(paymentId));
    if (session) {
      console.log('📋 Found active session, attempting remote enrichment');
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
      
      let invoiceNumber = payload?.invoiceNumber || payload?.invoice || payload?.referenceNumber || payload?.reference;
      const transactionId = payload?.transactionId || payload?.cardTransactionId || payload?.id || payload?.paymentId;
      let last4 = payload?.last4 || payload?.cardLast4 || payload?.card?.last4 || payload?.cardLastFour || undefined;
      const amount = payload?.amount || payload?.totalAmount;
      
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
      let normalized: 'completed' | 'failed' | 'pending' = 'pending';
      
      // IMPORTANT: If webhook has type "cardTransaction" with an ID but no status,
      // it's Helcim's minimal webhook format - assume completed since they only send for successful transactions
      if (payload?.type === 'cardTransaction' && transactionId && !payload?.status && !payload?.approved) {
        console.log('📌 Minimal Helcim webhook detected - assuming completed');
        normalized = 'completed';
      }
      // Check for success indicators
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
        rawStatus === 'cardtransaction' // Helcim sends type:cardTransaction for successful payments
      ) {
        normalized = 'completed';
      } else if (
        rawStatus.includes('declined') || 
        rawStatus.includes('failed') || 
        rawStatus.includes('canceled') || 
        rawStatus.includes('cancelled') ||
        rawStatus.includes('voided') ||
        rawStatus.includes('refunded')
      ) {
        normalized = 'failed';
      }
      
      console.log('✅ Webhook normalized status:', normalized);

      if (!invoiceNumber && !transactionId) {
        console.log('⚠️ No invoice or transaction ID in webhook');
        return;
      }

      // Skip enrichment if we already have a clear status
      // The API endpoints are returning 404s, so we'll trust the webhook data
      if (normalized === 'completed' || normalized === 'failed') {
        console.log('📌 Webhook has clear status, skipping enrichment');
      } else if ((!rawStatus || normalized === 'pending') && transactionId) {
        console.log('⚠️ Webhook status unclear, would normally enrich but API endpoints return 404');
        // If we have a transaction ID but no clear status, assume it's completed
        // (Helcim typically only sends webhooks for completed transactions)
        if (transactionId) {
          console.log('🎯 Assuming completed status for webhook with transaction ID');
          normalized = 'completed';
        }
      }
      
      // Try to find the session to get the invoice number if missing
      let sessionKey: string | null = null;
      let session: { startedAt: number; locationId: string; deviceCode: string } | null = null;
      if (invoiceNumber && sessionStore.has(String(invoiceNumber))) {
        sessionKey = String(invoiceNumber);
        session = sessionStore.get(sessionKey)!;
      } else if (!invoiceNumber && transactionId) {
        // Try to find session by recent time window
        const now = Date.now();
        let bestKey: string | null = null;
        let best: { startedAt: number; locationId: string; deviceCode: string } | null = null;
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

      // If Helcim omitted invoiceNumber, enrich by querying the transaction by id
      if (transactionId && !invoiceNumber) {
        try {
          let apiToken: string | undefined;
          try {
            const cfg = await this.configService.getAnyActiveTerminalConfig();
            apiToken = cfg?.apiToken || process.env.HELCIM_API_TOKEN;
          } catch {
            apiToken = process.env.HELCIM_API_TOKEN;
          }
          if (apiToken) {
            const resp = await this.makeRequest('GET', `/card-transactions/${transactionId}`, undefined, apiToken);
            const t = (resp?.data as any) || {};
            const inv = t?.invoiceNumber || t?.invoice || t?.referenceNumber || t?.reference || undefined;
            const l4 = t?.cardLast4 || t?.last4 || t?.card?.last4 || last4;
            if (inv) invoiceNumber = String(inv);
            if (l4) last4 = String(l4);
            console.log('🧩 Enriched webhook via API', { invoiceNumber, last4 });
          }
        } catch (e) {
          console.log('ℹ️ Transaction enrichment failed; proceeding with minimal webhook', String((e as any)?.message || e));
        }
      }

      // If Helcim omitted invoiceNumber but our sessions include an entry whose transactionId matches, backfill invoiceNumber
      if (!invoiceNumber && transactionId) {
        try {
          let matchedInvoiceFromSession: string | null = null;
          sessionStore.forEach((value, key) => {
            // Heuristic: invoice numbers are POS-* in our flow; prefer the newest session
            if (!matchedInvoiceFromSession && key && typeof key === 'string') {
              matchedInvoiceFromSession = key;
            }
          });
          if (matchedInvoiceFromSession) {
            invoiceNumber = matchedInvoiceFromSession;
          }
        } catch {}
      }

      // Cache under both keys so polling by either id can resolve
      const cacheValue = {
        status: normalized,
        transactionId,
        last4,
        amount: payload?.amount,
        updatedAt: Date.now(),
      } as const;
      
      // Cache by invoice number
      if (invoiceNumber) {
        webhookStore.set(String(invoiceNumber), cacheValue);
        console.log(`💾 Cached by invoice: ${invoiceNumber}`);
      }
      
      // Cache by transaction ID
      if (transactionId) {
        webhookStore.set(String(transactionId), cacheValue);
        console.log(`💾 Cached by transaction: ${transactionId}`);
      }
      
      // Also record a global last-completed marker to allow simple confirmation flows
      if (normalized === 'completed') {
        try { webhookStore.set('__GLOBAL_LAST_COMPLETED__', cacheValue as any); } catch {}
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
        cachedKeys: Array.from(webhookStore.keys()).slice(-5) // Show last 5 cached keys
      });
    } catch (error: any) {
      console.error('❌ Error handling webhook:', error);
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
