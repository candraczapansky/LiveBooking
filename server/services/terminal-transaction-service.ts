import { IStorage } from '../storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export class TerminalTransactionService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async pollTransactionStatus(transactionId: string, terminalId: string): Promise<any> {
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with exponential backoff

    while (attempts < maxAttempts) {
      try {
        const status = await this.checkTransactionStatus(transactionId, terminalId);
        
        if (status.isComplete) {
          console.log('✅ Transaction completed:', transactionId);
          return status;
        }

        // Exponential backoff: 2s, 4s, 8s, etc.
        const delay = Math.min(Math.pow(2, attempts) * 1000, 30000); // Max 30 second delay
        console.log(`🔄 Polling attempt ${attempts + 1}/${maxAttempts}, waiting ${delay}ms...`);
        await this.delay(delay);
        attempts++;

      } catch (error) {
        console.error(`❌ Error polling transaction ${transactionId}:`, error);
        throw error;
      }
    }

    throw new Error(`Transaction ${transactionId} timed out after ${maxAttempts} attempts`);
  }

  private async checkTransactionStatus(transactionId: string, terminalId: string): Promise<any> {
    try {
      // Make API call to Helcim to check status
      const response = await fetch(`${process.env.HELCIM_API_URL}/terminal/${terminalId}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'api-token': process.env.HELCIM_API_TOKEN || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check transaction status: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        isComplete: data.status === 'completed',
        status: data.status,
        amount: data.amount,
        cardType: data.cardType,
        last4: data.last4,
        transactionId: data.transactionId,
        terminalId: data.terminalId,
        timestamp: data.timestamp,
      };

    } catch (error) {
      console.error('❌ Error checking transaction status:', error);
      throw error;
    }
  }

  // Store transaction in database
  async storeTransaction(transactionData: any) {
    try {
      const insertSql = sql`INSERT INTO terminal_transactions (
        transaction_id, terminal_id, status, amount, card_type, last4, timestamp
      ) VALUES (
        ${transactionData.transactionId},
        ${transactionData.terminalId},
        ${transactionData.status},
        ${transactionData.amount},
        ${transactionData.cardType},
        ${transactionData.last4},
        ${transactionData.timestamp || new Date()}
      ) RETURNING *`;

      const result: any = await db.execute(insertSql);
      const row = result?.rows?.[0] ?? result?.[0] ?? null;

      console.log('✅ Transaction stored in database:', row ?? transactionData);
      return row ?? transactionData;
    } catch (error) {
      console.error('❌ Error storing transaction:', error);
      throw error;
    }
  }

  // Update transaction status
  async updateTransactionStatus(transactionId: string, status: string) {
    try {
      const updateSql = sql`UPDATE terminal_transactions
        SET status = ${status}, updated_at = NOW()
        WHERE transaction_id = ${transactionId}
        RETURNING *`;

      const result: any = await db.execute(updateSql);
      const row = result?.rows?.[0] ?? result?.[0] ?? null;

      console.log('✅ Transaction status updated:', row ?? { transactionId, status });
      return row ?? { transactionId, status };
    } catch (error) {
      console.error('❌ Error updating transaction status:', error);
      throw error;
    }
  }
}
