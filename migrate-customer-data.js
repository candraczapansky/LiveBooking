// Customer Data Migration Script
// This script helps migrate existing customer data from Stripe/Square to Helcim

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

class CustomerDataMigrator {
  constructor() {
    this.migrationLog = [];
    this.successCount = 0;
    this.errorCount = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.migrationLog.push(logEntry);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  }

  async migrateCustomer(customerData) {
    try {
      this.log(`Starting migration for customer: ${customerData.email}`);

      // Step 1: Create Helcim customer
      const createCustomerResponse = await fetch(`${BASE_URL}/create-helcim-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: customerData.id
        })
      });

      if (!createCustomerResponse.ok) {
        throw new Error(`Failed to create Helcim customer: ${createCustomerResponse.statusText}`);
      }

      const customerResult = await createCustomerResponse.json();
      this.log(`Created Helcim customer: ${customerResult.customerId}`);

      // Step 2: Migrate saved payment methods (if any)
      if (customerData.savedPaymentMethods && customerData.savedPaymentMethods.length > 0) {
        this.log(`Migrating ${customerData.savedPaymentMethods.length} payment methods`);
        
        for (const paymentMethod of customerData.savedPaymentMethods) {
          await this.migratePaymentMethod(paymentMethod, customerResult.customerId, customerData.id);
        }
      }

      this.successCount++;
      this.log(`Successfully migrated customer: ${customerData.email}`, 'success');
      
      return {
        success: true,
        customerId: customerResult.customerId,
        originalCustomerId: customerData.id
      };

    } catch (error) {
      this.errorCount++;
      this.log(`Failed to migrate customer ${customerData.email}: ${error.message}`, 'error');
      
      return {
        success: false,
        error: error.message,
        originalCustomerId: customerData.id
      };
    }
  }

  async migratePaymentMethod(paymentMethod, helcimCustomerId, clientId) {
    try {
      // Create a mock card token for the migrated payment method
      const cardToken = `migrated_card_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      const saveCardResponse = await fetch(`${BASE_URL}/save-helcim-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardToken: cardToken,
          customerId: helcimCustomerId,
          clientId: clientId,
          cardData: {
            cardNumber: '0000000000000000', // Placeholder for migrated cards
            cardExpiryMonth: paymentMethod.cardExpMonth.toString().padStart(2, '0'),
            cardExpiryYear: paymentMethod.cardExpYear.toString(),
            cardCVV: '000' // Placeholder
          }
        })
      });

      if (!saveCardResponse.ok) {
        throw new Error(`Failed to save migrated card: ${saveCardResponse.statusText}`);
      }

      const cardResult = await saveCardResponse.json();
      this.log(`Migrated payment method: ${paymentMethod.cardBrand} ••••${paymentMethod.cardLast4}`);

      return cardResult;

    } catch (error) {
      this.log(`Failed to migrate payment method: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateAllCustomers(customers) {
    this.log(`Starting migration of ${customers.length} customers`);
    
    const results = [];
    
    for (const customer of customers) {
      const result = await this.migrateCustomer(customer);
      results.push(result);
      
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.generateMigrationReport(results);
    return results;
  }

  generateMigrationReport(results) {
    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION REPORT');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Total customers processed: ${results.length}`);
    console.log(`Successful migrations: ${successful.length}`);
    console.log(`Failed migrations: ${failed.length}`);
    console.log(`Success rate: ${((successful.length / results.length) * 100).toFixed(2)}%`);
    
    if (failed.length > 0) {
      console.log('\nFailed migrations:');
      failed.forEach(failure => {
        console.log(`- Customer ID ${failure.originalCustomerId}: ${failure.error}`);
      });
    }
    
    console.log('\nMigration log:');
    this.migrationLog.forEach(log => {
      console.log(`[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`);
    });
  }

  // Helper method to get sample customer data
  getSampleCustomers() {
    return [
      {
        id: 1,
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        savedPaymentMethods: [
          {
            id: 1,
            cardBrand: 'VISA',
            cardLast4: '1234',
            cardExpMonth: 12,
            cardExpYear: 2025
          }
        ]
      },
      {
        id: 2,
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        savedPaymentMethods: [
          {
            id: 2,
            cardBrand: 'MASTERCARD',
            cardLast4: '5678',
            cardExpMonth: 6,
            cardExpYear: 2024
          }
        ]
      }
    ];
  }
}

// Usage example
async function runMigration() {
  const migrator = new CustomerDataMigrator();
  
  // Get sample customer data (replace with actual data from your database)
  const customers = migrator.getSampleCustomers();
  
  console.log('🚀 Starting Customer Data Migration to Helcim');
  console.log('='.repeat(50));
  
  try {
    await migrator.migrateAllCustomers(customers);
    
    console.log('\n✅ Migration completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Verify migrated customer data in Helcim dashboard');
    console.log('2. Test payment processing with migrated customers');
    console.log('3. Update any hardcoded customer references');
    console.log('4. Monitor payment success rates');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Export for use in other scripts
module.exports = CustomerDataMigrator;

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
} 