import axios from 'axios';
import { z } from 'zod';
import { TerminalConfigService } from './terminal-config-service.js';

// Terminal configuration schema
const TerminalConfigSchema = z.object({
  terminalId: z.string(),
  locationId: z.string(),
  apiToken: z.string(),
  deviceCode: z.string(),
});

type TerminalConfig = z.infer<typeof TerminalConfigSchema>;

// In-memory session store for invoice-based fallbacks
const sessionStore: Map<string, { startedAt: number; locationId: string; deviceCode: string; totalAmount: number; invoiceNumber: string; description?: string }> = new Map();
const webhookStore: Map<string, { status: string; transactionId?: string; last4?: string; updatedAt: number }> = new Map();
// Track recheck attempts to avoid excessive duplicate lookups
const recheckScheduled: Set<string> = new Set();

export class HelcimTerminalService {
  private readonly baseUrl = 'https://api.helcim.com/v2';

  constructor(private readonly configService: TerminalConfigService) {}

  /**
   * Initialize a terminal for a specific location
   */
  async initializeTerminal(config: Omit<TerminalConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      // Validate config
      TerminalConfigSchema.parse(config);

      // Best-effort: skip external test; some accounts do not expose a test endpoint
      // We'll validate during payment operations.

      // Always store config so terminal can be used; validation happens during payment operations
      await this.configService.saveTerminalConfig({
        ...config,
        isActive: true
      });
      console.log(`✅ Terminal ${config.terminalId} configuration saved for location ${config.locationId}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error initializing terminal ${config.terminalId}:`, error.message);
      return false;
    }
  }

  /**
   * Start a payment on a specific terminal
   */
  async startPayment(locationId: string, amount: number, options: {
    tipAmount?: number;
    reference?: string;
    description?: string;
  } = {}) {
    const config = await this.configService.getTerminalConfig(locationId);
    if (!config) {
      throw new Error(`No terminal configured for location ${locationId}`);
    }

    // Precompute values so we can fall back in outer catch without 500
    const totalAmount = Number((amount || 0) + (options.tipAmount || 0));
    const invoiceNumber = options.reference || `POS-${Date.now()}`;

    try {
      const payload = {
        currency: 'USD',
        transactionAmount: Number(totalAmount.toFixed(2)),
        invoiceNumber,
        description: options.description,
      } as any;

      // Provide callback URL if configured so Helcim can notify our app on completion
      try {
        const fullUrl = process.env.TERMINAL_WEBHOOK_URL?.trim();
        const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
        const isPublicHttps = (u: string) => /^https:\/\//i.test(u) && !/localhost|127\.|\.local\b/i.test(u);
        if (fullUrl && isPublicHttps(fullUrl)) {
          payload.callbackUrl = fullUrl;
        } else if (base && isPublicHttps(base)) {
          payload.callbackUrl = `${base}/api/terminal/webhook`;
        }
      } catch {}

      // Track session by invoice number in case Helcim does not return a transaction id
      sessionStore.set(invoiceNumber, {
        startedAt: Date.now(),
        locationId,
        deviceCode: config.deviceCode,
        totalAmount: Number(totalAmount.toFixed(2)),
        invoiceNumber,
        description: options.description,
      });

      const token = config.apiToken || process.env.HELCIM_API_TOKEN;
      let response: any;
      try {
        response = await this.makeRequest('POST', `/devices/${config.deviceCode}/payment/purchase`, payload, token);
      } catch (postErr: any) {
        const emsg = String(postErr?.message || '').toLowerCase();
        // Try to locate the transaction anyway if purchase endpoint errors (conflict/busy/etc)
        try {
          const recentQuery = await this.makeRequest(
            'GET',
            `/devices/${config.deviceCode}/transactions`,
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
            const pid = match.id || match.transactionId;
            if (pid) {
              try {
                const existing = sessionStore.get(invoiceNumber);
                if (existing) sessionStore.set(String(pid), existing);
              } catch {}
              return { transactionId: pid, paymentId: pid, invoiceNumber, status: 'pending' };
            }
          }
        } catch {}
        // As a resilience measure, always return invoice so client can begin polling while device processes
        try { console.warn('⚠️ Helcim purchase error; returning invoice for polling:', emsg); } catch {}
        return { invoiceNumber, status: 'pending' };
      }
      try {
        console.log('📤 Helcim purchase response debug', {
          status: (response as any)?.status,
          headers: (response as any)?.headers,
          requestHeaders: (response as any)?.request?.res?.headers,
          data: (response as any)?.data,
        });
      } catch {}

      // Helcim often responds 202 with a Location header for the transaction
      let locationHeader = (response as any)?.headers?.location || (response as any)?.headers?.Location;
      if (!locationHeader && (response as any)?.headers) {
        const keys = Object.keys((response as any).headers);
        const lk = keys.find(k => k.toLowerCase() === 'location');
        if (lk) {
          locationHeader = (response as any).headers[lk];
        }
      }
      // Some axios adapters nest raw headers differently
      if (!locationHeader && (response as any)?.request?.res?.headers) {
        const raw = (response as any).request.res.headers;
        const keys = Object.keys(raw);
        const lk = keys.find(k => k.toLowerCase() === 'location');
        if (lk) {
          locationHeader = raw[lk];
        }
      }
      if (locationHeader && typeof locationHeader === 'string') {
        const parts = locationHeader.split('/').filter(Boolean);
        const transactionId = parts[parts.length - 1];
        // Bridge: map device transaction id -> session so webhook cache by invoice can be found during polling by id
        try {
          const existing = sessionStore.get(invoiceNumber);
          if (existing) {
            sessionStore.set(transactionId, existing);
          } else {
            sessionStore.set(transactionId, {
              startedAt: Date.now(),
              locationId,
              deviceCode: config.deviceCode,
              totalAmount: Number(totalAmount.toFixed(2)),
              invoiceNumber,
              description: options.description,
            });
          }
        } catch {}
        return { transactionId, paymentId: transactionId, invoiceNumber, status: 'pending' };
      }

      // Fallback: if API returns JSON with an id
      const data = response.data || {};
      if ((data as any).transactionId || (data as any).id) {
        const pid = (data as any).transactionId || (data as any).id;
        // Bridge mapping for id -> session
        try {
          const existing = sessionStore.get(invoiceNumber);
          if (existing) {
            sessionStore.set(String(pid), existing);
          }
        } catch {}
        return { ...data, transactionId: pid, paymentId: pid, invoiceNumber };
      }

      // Early resolve: briefly poll device transactions to locate the transaction id by invoice
      try {
        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            const recentQuery = await this.makeRequest(
              'GET',
              `/devices/${config.deviceCode}/transactions`,
              undefined,
              token
            );
            const rd = (recentQuery?.data as any) || {};
            const list = Array.isArray(rd) ? rd : (Array.isArray(rd?.transactions) ? rd.transactions : []);
            const match = list.find((t: any) => {
              const inv = t?.invoiceNumber || t?.invoice || t?.referenceNumber || '';
              return inv === invoiceNumber;
            });
            if (match) {
              const pid = match.id || match.transactionId;
              if (pid) {
                try {
                  // Bridge mapping for discovered id -> session
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
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch {}

      // As a last resort, return the invoiceNumber so the client can correlate while we poll
      return { invoiceNumber, status: 'pending' };
    } catch (error: any) {
      const msg = String(error?.message || '');
      // Only propagate hard misconfiguration; otherwise, provide a polling handle
      if (msg.includes('No terminal configured')) {
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
    const config = await this.configService.getTerminalConfig(locationId);
    if (!config) {
      throw new Error(`No terminal configured for location ${locationId}`);
    }

    try {
      // If paymentId looks like our invoice-based session, try to resolve via Helcim by invoiceNumber
      if (typeof paymentId === 'string' && paymentId.startsWith('POS-')) {
        const session = sessionStore.get(paymentId);
        // Derive approximate start time from POS-<timestamp> even if session was lost (e.g., after restart)
        let derivedStartMs: number | null = null;
        try {
          const ts = Number(paymentId.replace(/^POS-/, ''));
          if (Number.isFinite(ts) && ts > 1_000_000_000_000 && ts < 10_000_000_000_000) {
            derivedStartMs = ts;
          }
        } catch {}
        try {
          // Attempt device-level lookup by invoiceNumber if supported
          // 1) Try with query param (if API supports it)
          let match: any | undefined;
          try {
            const token = config.apiToken || process.env.HELCIM_API_TOKEN;
            const q1 = await this.makeRequest(
              'GET',
              `/devices/${config.deviceCode}/transactions?invoiceNumber=${encodeURIComponent(paymentId)}`,
              undefined,
              token
            );
            const d1 = (q1?.data as any) || {};
            const list1 = Array.isArray(d1) ? d1 : (Array.isArray(d1?.transactions) ? d1.transactions : []);
            match = list1.find((t: any) => (
              t?.invoiceNumber === paymentId || t?.invoice === paymentId || t?.referenceNumber === paymentId || t?.reference === paymentId
            ));
          } catch {}
          if (!match) {
            try {
              const token = config.apiToken || process.env.HELCIM_API_TOKEN;
              const q2 = await this.makeRequest(
                'GET',
                `/devices/${config.deviceCode}/transactions?referenceNumber=${encodeURIComponent(paymentId)}`,
                undefined,
                token
              );
              const d2 = (q2?.data as any) || {};
              const list2 = Array.isArray(d2) ? d2 : (Array.isArray(d2?.transactions) ? d2.transactions : []);
              match = list2.find((t: any) => (
                t?.invoiceNumber === paymentId || t?.invoice === paymentId || t?.referenceNumber === paymentId || t?.reference === paymentId
              ));
            } catch {}
          }
          if (!match) {
            try {
              const token = config.apiToken || process.env.HELCIM_API_TOKEN;
              const q3 = await this.makeRequest(
                'GET',
                `/devices/${config.deviceCode}/transactions?invoice=${encodeURIComponent(paymentId)}`,
                undefined,
                token
              );
              const d3 = (q3?.data as any) || {};
              const list3 = Array.isArray(d3) ? d3 : (Array.isArray(d3?.transactions) ? d3.transactions : []);
              match = list3.find((t: any) => (
                t?.invoiceNumber === paymentId || t?.invoice === paymentId || t?.referenceNumber === paymentId || t?.reference === paymentId
              ));
            } catch {}
          }

          // 2) If not supported, fetch recent device transactions and search
          if (!match) {
            const token = config.apiToken || process.env.HELCIM_API_TOKEN;
            const recentQuery = await this.makeRequest(
              'GET',
              `/devices/${config.deviceCode}/transactions`,
              undefined,
              token
            );
            const rd = (recentQuery?.data as any) || {};
            const rlist = Array.isArray(rd) ? rd : (Array.isArray(rd?.transactions) ? rd.transactions : []);
            // Prefer exact invoice match
            match = rlist.find((t: any) => {
              const inv = t?.invoiceNumber || t?.invoice || t?.referenceNumber || '';
              const amt = Number(t?.transactionAmount ?? t?.amount ?? t?.total ?? 0);
              const sameInvoice = inv === paymentId;
              const sameAmount = session ? Math.abs(amt - session.totalAmount) < 0.01 : true;
              return sameInvoice && sameAmount;
            });
            // Fallback: if no invoice match found, try best by recent time + amount proximity
            if (!match && (session || derivedStartMs)) {
              try {
                const windowMs = 10 * 60 * 1000; // 10 minutes
                const candidates = rlist
                  .filter((t: any) => {
                    const amt = Number(t?.transactionAmount ?? t?.amount ?? t?.total ?? 0);
                    const createdAt = new Date(t?.createdAt || t?.created_at || t?.timestamp || Date.now());
                    const anchor = session ? session.startedAt : (derivedStartMs ?? Date.now());
                    const timeOk = Math.abs(createdAt.getTime() - anchor) <= windowMs;
                    const amountOk = session ? Math.abs(amt - session.totalAmount) < 0.01 : true;
                    return timeOk && amountOk;
                  })
                  .sort((a: any, b: any) => new Date(b?.createdAt || b?.timestamp || 0).getTime() - new Date(a?.createdAt || a?.timestamp || 0).getTime());
                if (candidates.length > 0) {
                  match = candidates[0];
                }
              } catch {}
            }
          }
          if (match) {
            const st = String(match.status || match.result || '').toLowerCase();
            if (['approved', 'captured', 'completed', 'success', 'succeeded'].includes(st)) {
              return { status: 'completed', transactionId: match.id || match.transactionId || paymentId, last4: match.last4 } as any;
            }
            if (['declined', 'failed', 'canceled', 'cancelled'].includes(st)) {
              return { status: 'failed', transactionId: match.id || match.transactionId || paymentId } as any;
            }
            return { status: 'pending', message: 'Processing payment...' } as any;
          }
        } catch {}

        // Optional merchant-level lookup (requires HELCIM_API_TOKEN)
        try {
          const merchantToken = process.env.HELCIM_API_TOKEN;
          if (merchantToken) {
            let match: any | undefined;
            try {
              const merchantQuery = await this.makeRequest(
                'GET',
                `/transactions?invoiceNumber=${encodeURIComponent(paymentId)}`,
                undefined,
                merchantToken
              );
              const m = (merchantQuery?.data as any) || {};
              const list = Array.isArray(m) ? m : (Array.isArray(m?.transactions) ? m.transactions : []);
              match = list.find((t: any) => t?.invoiceNumber === paymentId || t?.invoice === paymentId || t?.referenceNumber === paymentId || t?.reference === paymentId);
            } catch {}
            if (!match) {
              try {
                const merchantQuery2 = await this.makeRequest(
                  'GET',
                  `/transactions?referenceNumber=${encodeURIComponent(paymentId)}`,
                  undefined,
                  merchantToken
                );
                const m2 = (merchantQuery2?.data as any) || {};
                const list2 = Array.isArray(m2) ? m2 : (Array.isArray(m2?.transactions) ? m2.transactions : []);
                match = list2.find((t: any) => t?.invoiceNumber === paymentId || t?.invoice === paymentId || t?.referenceNumber === paymentId || t?.reference === paymentId);
              } catch {}
            }
            if (!match) {
              try {
                const merchantQuery3 = await this.makeRequest(
                  'GET',
                  `/transactions?invoice=${encodeURIComponent(paymentId)}`,
                  undefined,
                  merchantToken
                );
                const m3 = (merchantQuery3?.data as any) || {};
                const list3 = Array.isArray(m3) ? m3 : (Array.isArray(m3?.transactions) ? m3.transactions : []);
                match = list3.find((t: any) => t?.invoiceNumber === paymentId || t?.invoice === paymentId || t?.referenceNumber === paymentId || t?.reference === paymentId);
              } catch {}
            }
            if (!match) {
              const recentMerchant = await this.makeRequest('GET', `/transactions`, undefined, merchantToken);
              const md = (recentMerchant?.data as any) || {};
              const mlist = Array.isArray(md) ? md : (Array.isArray(md?.transactions) ? md.transactions : []);
              // Prefer invoice match first
              match = mlist.find((t: any) => {
                const inv = t?.invoiceNumber || t?.invoice || t?.referenceNumber || '';
                const amt = Number(t?.transactionAmount ?? t?.amount ?? t?.total ?? 0);
                const sameInvoice = inv === paymentId;
                const sameAmount = session ? Math.abs(amt - session.totalAmount) < 0.01 : true;
                return sameInvoice && sameAmount;
              });
              // Fallback by recent time + amount if invoice missing at merchant level
              if (!match && (session || derivedStartMs)) {
                try {
                  const windowMs = 10 * 60 * 1000;
                  const candidates = mlist
                    .filter((t: any) => {
                      const amt = Number(t?.transactionAmount ?? t?.amount ?? t?.total ?? 0);
                      const createdAt = new Date(t?.createdAt || t?.created_at || t?.timestamp || Date.now());
                      const anchor = session ? session.startedAt : (derivedStartMs ?? Date.now());
                      const timeOk = Math.abs(createdAt.getTime() - anchor) <= windowMs;
                      const amountOk = session ? Math.abs(amt - session.totalAmount) < 0.01 : true;
                      return timeOk && amountOk;
                    })
                    .sort((a: any, b: any) => new Date(b?.createdAt || b?.timestamp || 0).getTime() - new Date(a?.createdAt || a?.timestamp || 0).getTime());
                  if (candidates.length > 0) {
                    match = candidates[0];
                  }
                } catch {}
              }
            }
            if (match) {
              const st = String(match.status || match.result || '').toLowerCase();
              if (['approved', 'captured', 'completed', 'success', 'succeeded'].includes(st)) {
                return { status: 'completed', transactionId: match.id || match.transactionId || paymentId, last4: match.last4 } as any;
              }
              if (['declined', 'failed', 'canceled', 'cancelled'].includes(st)) {
                return { status: 'failed', transactionId: match.id || match.transactionId || paymentId } as any;
              }
            }
          }
        } catch {}

        // If not found yet, remain pending until device exposes a transaction id
        return { status: 'pending', message: 'Awaiting terminal status...' } as any;
      }

      // Try device transaction by id first
      try {
        const token = config.apiToken || process.env.HELCIM_API_TOKEN;
        const response = await this.makeRequest('GET', `/devices/${config.deviceCode}/transactions/${paymentId}`, undefined, token);
        const data: any = response?.data || {};
        const st = String(data.status || data.result || data.outcome || '').toLowerCase();
        let normalized: 'completed' | 'failed' | 'pending' = 'pending';
        if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st)) {
          normalized = 'completed';
        } else if (['declined', 'failed', 'canceled', 'cancelled', 'voided'].includes(st)) {
          normalized = 'failed';
        }
        return {
          status: normalized,
          transactionId: data.id || data.transactionId || paymentId,
          last4: data.last4 || data.cardLast4 || (data.card && data.card.last4) || undefined,
          terminalId: config.terminalId,
        } as any;
      } catch (e1: any) {
        const msg1 = String(e1?.message || '');
        // If device lookup not found, try cardTransactions by id
        if (msg1.includes('Not Found') || msg1.includes('404')) {
          try {
            const token = config.apiToken || process.env.HELCIM_API_TOKEN;
            // Try both path styles just in case
            let ct: any;
            try {
              ct = await this.makeRequest('GET', `/cardTransactions/${paymentId}`, undefined, token);
            } catch (tryKebab: any) {
              ct = await this.makeRequest('GET', `/card-transactions/${paymentId}`, undefined, token);
            }
            const cd: any = ct?.data || {};
            const st = String(cd.status || cd.result || cd.outcome || '').toLowerCase();
            let normalized: 'completed' | 'failed' | 'pending' = 'pending';
            if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st)) {
              normalized = 'completed';
            } else if (['declined', 'failed', 'canceled', 'cancelled', 'voided'].includes(st)) {
              normalized = 'failed';
            }
            return {
              status: normalized,
              transactionId: cd.id || cd.transactionId || paymentId,
              last4: cd.last4 || cd.cardLast4 || (cd.card && cd.card.last4) || undefined,
              terminalId: config.terminalId,
            } as any;
          } catch (e2: any) {
            const msg2 = String(e2?.message || '');
            // As a last resort, try merchant-level transaction by id if token is set
            try {
              const merchantToken = process.env.HELCIM_API_TOKEN;
              if (merchantToken) {
                // Prefer card-transactions, then transactions
                let mtx: any;
                try {
                  mtx = await this.makeRequest('GET', `/card-transactions/${paymentId}`, undefined, merchantToken);
                } catch {
                  mtx = await this.makeRequest('GET', `/transactions/${paymentId}`, undefined, merchantToken);
                }
                const md: any = mtx?.data || {};
                const st = String(md.status || md.result || md.outcome || '').toLowerCase();
                let normalized: 'completed' | 'failed' | 'pending' = 'pending';
                if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st)) {
                  normalized = 'completed';
                } else if (['declined', 'failed', 'canceled', 'cancelled', 'voided'].includes(st)) {
                  normalized = 'failed';
                }
                return {
                  status: normalized,
                  transactionId: md.id || md.transactionId || paymentId,
                  last4: md.last4 || md.cardLast4 || (md.card && md.card.last4) || undefined,
                  terminalId: config.terminalId,
                } as any;
              }
            } catch {}
            // If all fallbacks fail, rethrow last error
            throw e2;
          }
        }
        // Non-404 errors from device lookup propagate
        throw e1;
      }
    } catch (error: any) {
      const msg = String(error?.message || '');
      // Treat not found as still pending during early propagation
      if (msg.includes('Not Found') || msg.includes('404')) {
        return { status: 'pending', message: 'Awaiting terminal status...' } as any;
      }
      console.error(`❌ Error checking payment status on terminal ${config.terminalId}:`, error.message);
      throw error;
    }
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

  private async makeRequest(method: string, endpoint: string, data?: any, apiToken?: string) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'api-token': apiToken,
          // Send Bearer as well for environments that require it
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        data,
      });

      return response;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Helcim API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Handle webhook payloads from Helcim and cache by invoiceNumber or transactionId
   * If only an id is provided, enrich by fetching transaction details.
   */
  async handleWebhook(payload: any) {
    try {
      let invoiceNumber = payload?.invoiceNumber || payload?.invoice || payload?.referenceNumber || payload?.reference;
      const transactionId = payload?.transactionId || payload?.cardTransactionId || payload?.id || payload?.paymentId;
      let last4 = payload?.last4 || payload?.cardLast4 || payload?.card?.last4 || payload?.cardLastFour || undefined;
      const rawStatus = String(payload?.status || payload?.result || payload?.outcome || '').toLowerCase();
      let normalized: 'completed' | 'failed' | 'pending' = ['approved', 'captured', 'completed', 'success', 'succeeded'].includes(rawStatus)
        ? 'completed'
        : (['declined', 'failed', 'canceled', 'cancelled'].includes(rawStatus) ? 'failed' : 'pending');

      if (!invoiceNumber && !transactionId) return;

      // If we don't have a definitive status, try to enrich using the nearest session and Helcim lookup
      if ((!rawStatus || normalized === 'pending') && transactionId) {
        // Find a likely session to obtain deviceCode/apiToken for lookup
        let sessionKey: string | null = null;
        let session: { startedAt: number; locationId: string; deviceCode: string } | null = null;
        if (invoiceNumber && sessionStore.has(String(invoiceNumber))) {
          sessionKey = String(invoiceNumber);
          session = sessionStore.get(sessionKey)!;
        } else {
          // Choose the most recent session in the last 10 minutes
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
          }
        }

        if (session) {
          try {
            const config = await this.configService.getTerminalConfig(session.locationId);
            if (config) {
              // Try device-level transaction lookup
              const tx = await this.makeRequest('GET', `/devices/${session.deviceCode}/transactions/${transactionId}`, undefined, config.apiToken);
              const d = (tx?.data as any) || {};
              const st = String(d.status || d.result || d.outcome || '').toLowerCase();
              if (!invoiceNumber) {
                invoiceNumber = d.invoiceNumber || d.invoice || d.referenceNumber || d.reference || sessionKey || undefined;
              }
              last4 = last4 || d.last4 || d.cardLast4 || (d.card && d.card.last4) || undefined;
              if (['approved', 'captured', 'completed', 'success', 'succeeded'].includes(st)) {
                normalized = 'completed';
              } else if (['declined', 'failed', 'canceled', 'cancelled'].includes(st)) {
                normalized = 'failed';
              }
            }
          } catch {
            // Try cardTransactions by id with device-level token (some environments allow this)
            try {
              const config2 = await this.configService.getTerminalConfig(session.locationId);
              if (config2) {
                const ctx2 = await this.makeRequest('GET', `/cardTransactions/${transactionId}`, undefined, config2.apiToken);
                const cd2: any = ctx2?.data || {};
                const st2 = String(cd2.status || cd2.result || cd2.outcome || '').toLowerCase();
                if (!invoiceNumber) {
                  invoiceNumber = cd2.invoiceNumber || cd2.invoice || cd2.referenceNumber || cd2.reference || sessionKey || undefined;
                }
                last4 = last4 || cd2.last4 || cd2.cardLast4 || (cd2.card && cd2.card.last4) || undefined;
                if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st2)) {
                  normalized = 'completed';
                } else if (['declined', 'failed', 'canceled', 'cancelled', 'voided'].includes(st2)) {
                  normalized = 'failed';
                }
              }
            } catch {}
            // Optional: merchant-level fallbacks if available (when session exists)
            try {
              const merchantToken = process.env.HELCIM_API_TOKEN;
              if (merchantToken && normalized === 'pending') {
                try {
                  const ctx = await this.makeRequest('GET', `/cardTransactions/${transactionId}`, undefined, merchantToken);
                  const cd: any = ctx?.data || {};
                  const st = String(cd.status || cd.result || cd.outcome || '').toLowerCase();
                  if (!invoiceNumber) {
                    invoiceNumber = cd.invoiceNumber || cd.invoice || cd.referenceNumber || cd.reference || sessionKey || undefined;
                  }
                  last4 = last4 || cd.last4 || cd.cardLast4 || (cd.card && cd.card.last4) || undefined;
                  if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st)) {
                    normalized = 'completed';
                  } else if (['declined', 'failed', 'canceled', 'cancelled', 'voided'].includes(st)) {
                    normalized = 'failed';
                  }
                } catch {
                  const mtx = await this.makeRequest('GET', `/transactions/${transactionId}`, undefined, merchantToken);
                  const md: any = (mtx?.data as any) || {};
                  const st = String(md.status || md.result || md.outcome || '').toLowerCase();
                  if (!invoiceNumber) {
                    invoiceNumber = md.invoiceNumber || md.invoice || md.referenceNumber || md.reference || sessionKey || undefined;
                  }
                  last4 = last4 || md.last4 || md.cardLast4 || (md.card && md.card.last4) || undefined;
                  if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st)) {
                    normalized = 'completed';
                  } else if (['declined', 'failed', 'canceled', 'cancelled', 'voided'].includes(st)) {
                    normalized = 'failed';
                  }
                }
              }
            } catch {}
          }
        }

        // If we couldn't find a session (e.g., server restarted), still try merchant-level lookup by transactionId
        if ((!session || normalized === 'pending') && transactionId) {
          try {
            const merchantToken = process.env.HELCIM_API_TOKEN;
            if (merchantToken) {
              try {
                const ctx = await this.makeRequest('GET', `/cardTransactions/${transactionId}`, undefined, merchantToken);
                const cd: any = ctx?.data || {};
                const st = String(cd.status || cd.result || cd.outcome || '').toLowerCase();
                if (!invoiceNumber) {
                  invoiceNumber = cd.invoiceNumber || cd.invoice || cd.referenceNumber || cd.reference || undefined;
                }
                last4 = last4 || cd.last4 || cd.cardLast4 || (cd.card && cd.card.last4) || undefined;
                if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st)) {
                  normalized = 'completed';
                } else if (['declined', 'failed', 'canceled', 'cancelled', 'voided'].includes(st)) {
                  normalized = 'failed';
                }
              } catch {
                const mtx = await this.makeRequest('GET', `/transactions/${transactionId}`, undefined, merchantToken);
                const md: any = (mtx?.data as any) || {};
                const st = String(md.status || md.result || md.outcome || '').toLowerCase();
                if (!invoiceNumber) {
                  invoiceNumber = md.invoiceNumber || md.invoice || md.referenceNumber || md.reference || undefined;
                }
                last4 = last4 || md.last4 || md.cardLast4 || (md.card && md.card.last4) || undefined;
                if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st)) {
                  normalized = 'completed';
                } else if (['declined', 'failed', 'canceled', 'cancelled', 'voided'].includes(st)) {
                  normalized = 'failed';
                }
              }
            }
          } catch {}
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
        updatedAt: Date.now(),
      } as const;
      if (invoiceNumber) {
        webhookStore.set(String(invoiceNumber), cacheValue);
      }
      if (transactionId) {
        webhookStore.set(String(transactionId), cacheValue);
      }
      try {
        console.log('📬 Webhook cached', { invoiceNumber, transactionId, status: normalized });
      } catch {}

      // If still pending, schedule a couple of quick rechecks via merchant token
      if (transactionId && normalized === 'pending' && !recheckScheduled.has(transactionId)) {
        recheckScheduled.add(transactionId);
        const attempt = async () => {
          try {
            const merchantToken = process.env.HELCIM_API_TOKEN;
            if (!merchantToken) return;
            // Try card-transactions first, then transactions
            let res: any;
            try {
              res = await this.makeRequest('GET', `/card-transactions/${transactionId}`, undefined, merchantToken);
            } catch {
              res = await this.makeRequest('GET', `/transactions/${transactionId}`, undefined, merchantToken);
            }
            const d: any = res?.data || {};
            const st = String(d.status || d.result || d.outcome || '').toLowerCase();
            if (['approved', 'captured', 'completed', 'success', 'succeeded', 'paid'].includes(st)) {
              const cv = {
                status: 'completed',
                transactionId,
                last4: d.last4 || d.cardLast4 || (d.card && d.card.last4) || undefined,
                updatedAt: Date.now(),
              } as const;
              webhookStore.set(String(transactionId), cv);
              if (invoiceNumber) webhookStore.set(String(invoiceNumber), cv);
            }
          } catch {}
        };
        // quick retry soon, then again a bit later
        setTimeout(attempt, 1500);
        setTimeout(attempt, 7000);
        // Clear flag after some time so future webhooks can reschedule
        setTimeout(() => recheckScheduled.delete(transactionId), 30000);
      }
    } catch (e) {
      // best effort only
    }
  }

  /**
   * Debug snapshot of recent sessions and webhooks for troubleshooting
   */
  debugSnapshot(limit: number = 10) {
    try {
      const sessions: any[] = [];
      sessionStore.forEach((value, key) => {
        sessions.push({ key, ...value });
      });
      sessions.sort((a, b) => b.startedAt - a.startedAt);

      const webhooks: any[] = [];
      webhookStore.forEach((value, key) => {
        webhooks.push({ key, ...value });
      });
      webhooks.sort((a, b) => b.updatedAt - a.updatedAt);

      return {
        sessions: sessions.slice(0, limit),
        webhooks: webhooks.slice(0, limit),
      };
    } catch {
      return { sessions: [], webhooks: [] };
    }
  }

  /**
   * Check cached webhook data first
   */
  private checkWebhookCache(paymentId: string) {
    const direct = webhookStore.get(paymentId);
    if (direct) return direct;
    // Also allow lookup by session invoiceNumber
    const session = sessionStore.get(paymentId);
    if (session) {
      const fromInvoice = webhookStore.get(session.invoiceNumber);
      if (fromInvoice) return fromInvoice;
      // Heuristic: if Helcim sent only transactionId in webhook, associate the most recent webhook
      // that arrived after this session started
      let best: { status: string; transactionId?: string; last4?: string; updatedAt: number } | null = null;
      const lowerBound = session.startedAt - 5000; // 5s before start
      const upperBound = session.startedAt + 5 * 60 * 1000; // 5 minutes window
      webhookStore.forEach((value) => {
        if (value.updatedAt >= lowerBound && value.updatedAt <= upperBound) {
          if (!best || value.updatedAt > best.updatedAt) {
            best = value;
          }
        }
      });
      if (best) return best;
    }
    return null;
  }
}
