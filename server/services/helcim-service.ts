import axios from 'axios';

export class HelcimService {
  private apiToken: string;
  private apiUrl: string;
  private defaultCurrency: string;

  constructor() {
    this.apiToken = process.env.HELCIM_API_TOKEN || '';
    this.apiUrl = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
    this.defaultCurrency = process.env.HELCIM_CURRENCY || 'USD';
    
    // Don't throw error in constructor - check when making requests instead
    // This allows the service to be imported even when API is not configured
  }

  async makeRequest(endpoint: string, method: string, data?: any) {
    if (!this.apiToken) {
      console.error('[HelcimService] HELCIM_API_TOKEN is not configured');
      throw new Error('HELCIM_API_TOKEN is not configured');
    }
    
    const url = `${this.apiUrl}${endpoint}`;
    console.log(`[HelcimService] Making ${method} request to: ${url}`);
    if (data) {
      console.log('[HelcimService] Request data:', JSON.stringify(data, null, 2));
    }
    
    try {
      const response = await axios({
        method,
        url,
        headers: {
          'api-token': this.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data
      });

      console.log('[HelcimService] Response success:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('[HelcimService] Request failed:', {
        endpoint,
        method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 
                           error.response.data?.error || 
                           error.response.data?.errors?.[0]?.message ||
                           `Helcim API request failed with status ${error.response.status}`;
        throw new Error(errorMessage);
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
      currency: this.defaultCurrency,
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
    businessName?: string;
  }) {
    // Helcim requires either contactName or businessName
    // If we have firstName/lastName, combine them as contactName
    const contactName = (params.firstName || params.lastName) 
      ? `${params.firstName || ''} ${params.lastName || ''}`.trim()
      : undefined;
    
    const payload: any = {
      contactName: contactName || params.businessName || 'Customer',
      businessName: params.businessName,
      email: params.email,
      phone: params.phone,
    };
    
    // Remove undefined fields
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    
    return this.makeRequest('/customers', 'POST', payload);
  }

  // Save a card on file for a Helcim customer using a Pay.js token
  // Helcim saves cards by processing a payment/verification with the token
  async saveCardToCustomer(params: { customerId: string; token: string; transactionId?: string }) {
    // In Helcim v2, cards are saved by processing a transaction
    // We'll use the /payment/purchase endpoint with a verify type
    console.log('[HelcimService] Attempting to save card for customer:', params.customerId, 'with transactionId:', params.transactionId);
    
    // Try the main purchase endpoint with card verification
    // Using UUID v4 format for idempotencyKey
    
    // Generate a proper UUID v4 format idempotencyKey
    const generateUUID = () => {
      // crypto.randomUUID() generates a proper UUID v4
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback to manual generation if crypto.randomUUID is not available
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const idempotencyKey = generateUUID();
    
    try {
      // First attempt: Try with UUID format idempotencyKey
      const payload = {
        paymentType: 'verify', // Card verification transaction
        amount: 0.01, // Minimum amount for verification  
        currency: this.defaultCurrency,
        customerCode: params.customerId, // Link to customer
        cardData: {
          cardToken: params.token
        },
        ipAddress: '127.0.0.1',
        idempotencyKey: idempotencyKey
      };
      console.log('[HelcimService] Trying /payment/purchase with UUID idempotencyKey:', idempotencyKey);
      const response = await this.makeRequest('/payment/purchase', 'POST', payload);
      console.log('[HelcimService] Verify response:', response);
      
      // Extract card information from verify response
      // The response should contain the saved card information
      const cardInfo = {
        id: response?.cardId || response?.cardBatchId || response?.id,
        cardId: response?.cardId || response?.cardBatchId,
        brand: response?.cardType || response?.cardBrand || response?.brand,
        last4: response?.cardNumber?.slice(-4) || response?.cardLast4 || response?.last4,
        expMonth: response?.expiryMonth || response?.cardExpMonth,
        expYear: response?.expiryYear || response?.cardExpYear,
        transactionId: response?.transactionId || response?.id,
        ...response // Include all response fields
      };
      
      return cardInfo;
    } catch (e1) {
      console.log('[HelcimService] First attempt failed, trying without nested cardData');
      
      // Try without nested cardData
      try {
        const newIdempotencyKey = generateUUID(); // Generate new UUID for retry
        const payload = {
          paymentType: 'verify',
          amount: 0.01,
          currency: this.defaultCurrency,
          customerCode: params.customerId,
          cardToken: params.token,
          ipAddress: '127.0.0.1',
          idempotencyKey: newIdempotencyKey
        };
        console.log('[HelcimService] Trying /payment/purchase without nested cardData, UUID:', newIdempotencyKey);
        const response = await this.makeRequest('/payment/purchase', 'POST', payload);
        console.log('[HelcimService] Verify response (attempt 2):', response);
        
        // Extract card information from verify response
        const cardInfo = {
          id: response?.cardId || response?.cardBatchId || response?.id,
          cardId: response?.cardId || response?.cardBatchId,
          brand: response?.cardType || response?.cardBrand || response?.brand,
          last4: response?.cardNumber?.slice(-4) || response?.cardLast4 || response?.last4,
          expMonth: response?.expiryMonth || response?.cardExpMonth,
          expYear: response?.expiryYear || response?.cardExpYear,
          transactionId: response?.transactionId || response?.id,
          ...response
        };
        
        return cardInfo;
      } catch (e2) {
        console.log('[HelcimService] Second attempt failed');
        
        // Last attempt - try card-transactions endpoint
        const payload = {
          type: 'verify',
          amount: 1,
          currency: this.defaultCurrency, 
          customerCode: params.customerId,
          cardToken: params.token
        };
        console.log('[HelcimService] Final attempt with /card-transactions:', payload);
        const response = await this.makeRequest('/card-transactions', 'POST', payload);
        console.log('[HelcimService] Verify response (card-transactions):', response);
        
        // Extract card information from verify response
        const cardInfo = {
          id: response?.cardId || response?.cardBatchId || response?.id,
          cardId: response?.cardId || response?.cardBatchId,
          brand: response?.cardType || response?.cardBrand || response?.brand,
          last4: response?.cardNumber?.slice(-4) || response?.cardLast4 || response?.last4,
          expMonth: response?.expiryMonth || response?.cardExpMonth,
          expYear: response?.expiryYear || response?.cardExpYear,
          transactionId: response?.transactionId || response?.id,
          ...response
        };
        
        return cardInfo;
      }
    }
  }

  // Process a payment using a saved card
  async processSavedCardPayment(params: {
    customerId: string;
    cardId: string;
    amount: number;
    description?: string;
    appointmentId?: number;
    clientId?: number;
    tipAmount?: number;
  }) {
    const { customerId, cardId, amount, description } = params;
    
    console.log('[HelcimService] Processing saved card payment:', {
      customerId,
      cardId,
      amount,
      description
    });

    // For saved card payments, Helcim uses the customer code and card ID
    // The payment needs to reference the stored card on file
    
    // Generate proper UUID v4 for idempotencyKey
    const generateUUID = () => {
      // crypto.randomUUID() generates a proper UUID v4
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback to manual generation if crypto.randomUUID is not available
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const idempotencyKey = generateUUID();
    
    try {
      // Try the /payment/purchase endpoint with the saved card
      // For saved cards in Helcim, we need to use the cardToken that was returned when the card was saved
      // The cardId is actually the token that represents the saved card
      const payload: any = {
        paymentType: 'purchase',
        amount: amount, // Amount in dollars
        currency: 'CAD',
        customerCode: customerId,
        // For saved cards, use the cardToken in cardData
        cardData: {
          cardToken: cardId  // The cardId stored in our DB is actually the Helcim card token
        },
        ipAddress: '127.0.0.1',
        idempotencyKey: idempotencyKey
      };
      
      console.log('[HelcimService] Attempting payment with saved card');
      const result = await this.makeRequest('/payment/purchase', 'POST', payload);
      
      console.log('[HelcimService] Saved card payment successful:', result);
      return result;
      
    } catch (error: any) {
      console.error('[HelcimService] Saved card payment failed:', error);
      
      // Try an alternative approach - using the card token stored with the customer
      try {
        console.log('[HelcimService] Trying alternative approach with customer cards');
        
        // First, get the customer's saved cards
        const customerCards = await this.makeRequest(`/customers/${customerId}/cards`, 'GET');
        console.log('[HelcimService] Customer cards:', customerCards);
        
        // Find the specific card
        const card = Array.isArray(customerCards) 
          ? customerCards.find((c: any) => String(c.id) === String(cardId) || String(c.cardId) === String(cardId))
          : customerCards;
          
        if (!card) {
          throw new Error(`Card ${cardId} not found for customer ${customerId}`);
        }
        
        // Process payment with the card details
        // Reuse the same generateUUID function
        const retryIdempotencyKey = generateUUID();
        const paymentPayload: any = {
          paymentType: 'purchase',
          amount: amount,
          currency: 'CAD',
          customerCode: customerId,
          cardData: {
            // Use the card token for payment - this is the key for saved cards
            cardToken: card.cardToken || card.token || card.id || card.cardId
          },
          ipAddress: '127.0.0.1',
          idempotencyKey: retryIdempotencyKey
        };
        
        const paymentResult = await this.makeRequest('/payment/purchase', 'POST', paymentPayload);
        console.log('[HelcimService] Alternative payment successful:', paymentResult);
        return paymentResult;
        
      } catch (retryError: any) {
        console.error('[HelcimService] Alternative payment approach also failed:', retryError);
        throw error; // Throw the original error
      }
    }
  }
}

// Create singleton instance
export const helcimService = new HelcimService();

// Default export for better compatibility with dynamic imports
export default helcimService;
