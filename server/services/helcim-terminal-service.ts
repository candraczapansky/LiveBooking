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

    try {
      const totalAmount = Number((amount || 0) + (options.tipAmount || 0));
      const invoiceNumber = options.reference || `POS-${Date.now()}`;
      const payload = {
        currency: 'USD',
        transactionAmount: Number(totalAmount.toFixed(2)),
        invoiceNumber,
        description: options.description,
      } as any;

      const response = await this.makeRequest('POST', `/devices/${config.deviceCode}/payment/purchase`, payload, config.apiToken);
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
        return { transactionId, paymentId: transactionId, status: 'pending' };
      }

      // Fallback: if API returns JSON with an id
      const data = response.data || {};
      if ((data as any).transactionId || (data as any).id) {
        const pid = (data as any).transactionId || (data as any).id;
        return { ...data, transactionId: pid, paymentId: pid };
      }

      return { status: 'pending' };
    } catch (error: any) {
      console.error(`❌ Error starting payment on terminal ${config.terminalId}:`, error.message);
      throw error;
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
      const response = await this.makeRequest('GET', `/devices/${config.deviceCode}/transactions/${paymentId}`, undefined, config.apiToken);
      return response.data;
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
          'Content-Type': 'application/json',
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
}
