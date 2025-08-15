import { config } from './config';

interface HelcimDevice {
  id: string;
  code: string;
  name: string;
  status: string;
  lastSeen: string;
}

interface HelcimPurchaseRequest {
  currency: string;
  transactionAmount: number;
  invoiceNumber: string;
  customerCode?: string;
}

interface HelcimPurchaseResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  customerCode?: string;
  deviceCode: string;
  createdAt: string;
}

interface HelcimApiResponse<T> {
  data: T;
  message?: string;
}

class HelcimSmartTerminalService {
  private apiToken: string;
  private apiUrl: string;

  constructor() {
    this.apiToken = config.HELCIM_API_TOKEN;
    this.apiUrl = config.HELCIM_API_URL;
  }

  async getDevices(): Promise<HelcimDevice[]> {
    try {
      console.log('🔍 Fetching devices from Helcim API...');
      
      const response = await fetch(`${this.apiUrl}/devices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: HelcimApiResponse<HelcimDevice[]> = await response.json();
      
      if (!result.data || !Array.isArray(result.data)) {
        console.log('⚠️ No devices data received from Helcim API');
        return [];
      }

      // Filter to only include UOJS device (case-insensitive)
      const filteredDevices = result.data.filter((device: any) => {
        const deviceCode = device.code || device.deviceCode || '';
        return deviceCode.toLowerCase() === 'uojs';
      });

      console.log(`✅ Found ${filteredDevices.length} UOJS device(s)`);
      
      // Map the response to our interface format
      return filteredDevices.map((device: any) => ({
        id: device.id || device.code || device.deviceCode || '',
        code: device.code || device.deviceCode || '',
        name: device.name || device.deviceName || 'UOJS Terminal',
        status: 'active', // Assume active since we're filtering for UOJS
        lastSeen: device.dateCreated || new Date().toISOString()
      }));

    } catch (error) {
      console.error('❌ Error fetching devices:', error);
      throw new Error(`Failed to fetch devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async pingDevice(deviceCode: string): Promise<boolean> {
    // Only allow UOJS device
    if (deviceCode.toUpperCase() !== 'UOJS') {
      throw new Error(`Device ${deviceCode} is not supported. Only UOJS device is allowed.`);
    }

    try {
      console.log(`🔍 Pinging UOJS device...`);
      
      const response = await fetch(`${this.apiUrl}/devices/${deviceCode}/ping`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ UOJS device ping successful');
        return true;
      } else {
        console.log(`⚠️ UOJS device ping failed: ${response.status} ${response.statusText}`);
        return false;
      }

    } catch (error) {
      console.error('❌ Error pinging UOJS device:', error);
      return false;
    }
  }

  async initiatePurchase(deviceCode: string, purchaseData: HelcimPurchaseRequest): Promise<HelcimPurchaseResponse> {
    // Only allow UOJS device
    if (deviceCode.toUpperCase() !== 'UOJS') {
      throw new Error(`Device ${deviceCode} is not supported. Only UOJS device is allowed.`);
    }

    // Validate purchase data
    if (!purchaseData.transactionAmount || purchaseData.transactionAmount <= 0) {
      throw new Error('Transaction amount must be greater than 0');
    }

    if (!purchaseData.currency) {
      throw new Error('Currency is required');
    }

    // Ensure transaction amount is formatted to two decimal places
    const formattedAmount = Math.round(purchaseData.transactionAmount * 100) / 100;

    try {
      console.log(`🔍 Initiating purchase on UOJS device: $${formattedAmount} ${purchaseData.currency}`);
      
      const response = await fetch(`${this.apiUrl}/devices/${deviceCode}/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...purchaseData,
          transactionAmount: formattedAmount
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Purchase failed: ${response.status} ${response.statusText}`, errorText);
        
        if (response.status === 409) {
          throw new Error('Device conflict: Device may be offline, sleeping, or processing another transaction');
        }
        
        throw new Error(this.getErrorMessage(response.status, errorText));
      }

      const result: HelcimApiResponse<HelcimPurchaseResponse> = await response.json();
      
      if (!result.data) {
        throw new Error('No purchase data received from Helcim API');
      }

      console.log('✅ Purchase initiated successfully on UOJS device');
      return result.data;

    } catch (error) {
      console.error('❌ Error initiating purchase:', error);
      throw error;
    }
  }

  async getDeviceInfo(deviceCode: string): Promise<HelcimDevice | null> {
    // Only allow UOJS device
    if (deviceCode.toUpperCase() !== 'UOJS') {
      throw new Error(`Device ${deviceCode} is not supported. Only UOJS device is allowed.`);
    }

    try {
      const devices = await this.getDevices();
      return devices.find(device => device.code.toUpperCase() === 'UOJS') || null;
    } catch (error) {
      console.error('❌ Error getting device info:', error);
      return null;
    }
  }

  async checkDeviceReadiness(deviceCode: string): Promise<boolean> {
    // Only allow UOJS device
    if (deviceCode.toUpperCase() !== 'UOJS') {
      throw new Error(`Device ${deviceCode} is not supported. Only UOJS device is allowed.`);
    }

    try {
      console.log(`🔍 Checking UOJS device readiness...`);
      
      // First check if device exists
      const device = await this.getDeviceInfo(deviceCode);
      if (!device) {
        console.log('❌ UOJS device not found');
        return false;
      }

      // Try to ping the device first
      const pingSuccess = await this.pingDevice(deviceCode);
      if (pingSuccess) {
        console.log('✅ UOJS device is ready (ping successful)');
        return true;
      }

      // If ping fails, check if device was created recently (within 30 days)
      // This is a fallback since the ping endpoint might be unreliable
      const deviceDate = new Date(device.lastSeen);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (deviceDate > thirtyDaysAgo) {
        console.log('✅ UOJS device appears ready (recently created)');
        return true;
      }

      console.log('❌ UOJS device may not be ready');
      return false;

    } catch (error) {
      console.error('❌ Error checking device readiness:', error);
      return false;
    }
  }

  private getErrorMessage(status: number, responseText?: string): string {
    switch (status) {
      case 400:
        return 'Bad request: Invalid data sent to Helcim API';
      case 401:
        return 'Unauthorized: Invalid API token or authentication failed';
      case 403:
        return 'Forbidden: Access denied to Helcim API';
      case 404:
        return 'Device not found or endpoint does not exist';
      case 409:
        return 'Device conflict: Device may be offline, sleeping, or processing another transaction';
      case 422:
        return 'Validation error: Invalid transaction data';
      case 429:
        return 'Rate limited: Too many requests to Helcim API';
      case 500:
        return 'Internal server error: Helcim API server error';
      case 503:
        return 'Service unavailable: Helcim API temporarily unavailable';
      default:
        return responseText || `HTTP ${status}: Unknown error`;
    }
  }
}

export const helcimSmartTerminalService = new HelcimSmartTerminalService();
export type { HelcimDevice, HelcimPurchaseRequest, HelcimPurchaseResponse };
