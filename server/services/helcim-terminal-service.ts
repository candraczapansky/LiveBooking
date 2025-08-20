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

      // Test terminal connection using the provided token
      const response = await this.makeRequest('POST', `/terminal/${config.terminalId}/test`, {
        deviceCode: config.deviceCode,
      }, config.apiToken);

      if (response.data.success) {
        // Store config if test is successful
        await this.configService.saveTerminalConfig({
          ...config,
          isActive: true
        });
        console.log(`✅ Terminal ${config.terminalId} initialized for location ${config.locationId}`);
        return true;
      }

      console.error(`❌ Failed to initialize terminal ${config.terminalId}:`, response.data);
      return false;
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
      const response = await this.makeRequest('POST', `/terminal/${config.terminalId}/payment`, {
        deviceCode: config.deviceCode,
        amount: amount.toFixed(2),
        tipAmount: options.tipAmount?.toFixed(2),
        reference: options.reference,
        description: options.description,
      }, config.apiToken);

      return response.data;
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
      const response = await this.makeRequest('GET', `/terminal/${config.terminalId}/payment/${paymentId}`, undefined, config.apiToken);
      return response.data;
    } catch (error: any) {
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
      const response = await this.makeRequest('POST', `/terminal/${config.terminalId}/payment/${paymentId}/cancel`, undefined, config.apiToken);
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
      const response = await this.makeRequest('GET', `/terminal/${config.terminalId}/status`, undefined, config.apiToken);
      return response.data;
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
