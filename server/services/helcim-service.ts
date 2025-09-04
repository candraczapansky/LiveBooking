import axios from 'axios';

export class HelcimService {
  private apiToken: string;
  private apiUrl: string;

  constructor() {
    this.apiToken = process.env.HELCIM_API_TOKEN || '';
    this.apiUrl = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
    
    // Don't throw error in constructor - check when making requests instead
    // This allows the service to be imported even when API is not configured
  }

  private async makeRequest(endpoint: string, method: string, data?: any) {
    if (!this.apiToken) {
      throw new Error('HELCIM_API_TOKEN is not configured');
    }
    
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

  // Create or update a Helcim customer profile
  async createCustomer(params: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) {
    const payload: any = {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
    };
    return this.makeRequest('/customers', 'POST', payload);
  }

  // Save a card on file for a Helcim customer using a Pay.js token
  async saveCardToCustomer(params: { customerId: string; token: string }) {
    const payload: any = {
      customerId: params.customerId,
      token: params.token,
    };
    // Some environments may require /customers/{id}/cards; try /cards with customerId
    try {
      return await this.makeRequest('/cards', 'POST', payload);
    } catch (e) {
      // Fallback to scoped endpoint if available
      return this.makeRequest(`/customers/${params.customerId}/cards`, 'POST', { token: params.token });
    }
  }
}

export const helcimService = new HelcimService();


