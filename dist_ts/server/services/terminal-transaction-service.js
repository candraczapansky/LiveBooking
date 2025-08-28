import { db } from '../db.js';
import { sql } from 'drizzle-orm';
export class TerminalTransactionService {
    constructor(storage) {
        this.storage = storage;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async pollTransactionStatus(transactionId, terminalId) {
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
            }
            catch (error) {
                console.error(`❌ Error polling transaction ${transactionId}:`, error);
                throw error;
            }
        }
        throw new Error('Transaction polling timed out');
    }
    async checkTransactionStatus(transactionId, terminalId) {
        // Simulated check - replace with real Helcim API call
        const result = await db.execute(sql `SELECT 1`);
        return {
            isComplete: Math.random() > 0.7,
            result
        };
    }
    // Store transaction in database
    async storeTransaction(transactionData) {
        try {
            const insertSql = sql `INSERT INTO terminal_transactions (
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
            const result = await db.execute(insertSql);
            const row = result?.rows?.[0] ?? result?.[0] ?? null;
            console.log('✅ Transaction stored in database:', row ?? transactionData);
            return row ?? transactionData;
        }
        catch (error) {
            console.error('❌ Error storing transaction:', error);
            throw error;
        }
    }
    // Update transaction status
    async updateTransactionStatus(transactionId, status) {
        try {
            const updateSql = sql `UPDATE terminal_transactions
        SET status = ${status}, updated_at = NOW()
        WHERE transaction_id = ${transactionId}
        RETURNING *`;
            const result = await db.execute(updateSql);
            const row = result?.rows?.[0] ?? result?.[0] ?? null;
            console.log('✅ Transaction status updated:', row ?? { transactionId, status });
            return row ?? { transactionId, status };
        }
        catch (error) {
            console.error('❌ Error updating transaction status:', error);
            throw error;
        }
    }
}
