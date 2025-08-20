import axios from 'axios';

export class HelcimService {
  private apiToken: string;
  private apiUrl: string;

  constructor() {
    this.apiToken = process.env.HELCIM_API_TOKEN || '';
    this.apiUrl = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';

    if (!this.apiToken) {
      throw new Error('HELCIM_API_TOKEN is not configured');
    }
  }

  private async makeRequest(endpoint: string, method: string, data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          'api-token': this.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Helcim API request failed');
      }
      throw error;
    }
  }

  async processPayment(params: {
    token: string;
    amount: number;
    description?: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    const { token, amount, description, customerEmail, customerName } = params;

    const paymentData = {
      token,
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'USD',
      description,
      customer: customerEmail || customerName ? {
        email: customerEmail,
        name: customerName,
      } : undefined,
    };

    return this.makeRequest('/payments', 'POST', paymentData);
  }

  async verifyPayment(transactionId: string) {
    return this.makeRequest(`/payments/${transactionId}`, 'GET');
  }
}

export const helcimService = new HelcimService();


