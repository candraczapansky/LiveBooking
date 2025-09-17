#!/usr/bin/env node
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const HELCIM_API_TOKEN = process.env.HELCIM_API_TOKEN;
const HELCIM_ACCOUNT_ID = process.env.HELCIM_ACCOUNT_ID;

async function checkHelcimTransactions() {
  if (!HELCIM_API_TOKEN) {
    console.error('❌ HELCIM_API_TOKEN not configured in .env');
    process.exit(1);
  }
  
  console.log('🔍 Fetching today\'s Helcim transactions...');
  console.log('API Token:', HELCIM_API_TOKEN.substring(0, 10) + '...');
  
  try {
    // Get today's date range
    const today = new Date();
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];
    
    console.log(`Date range: ${dateFrom} to ${dateTo}`);
    
    // Fetch transactions from Helcim
    const queryParams = new URLSearchParams({
      dateFrom,
      dateTo,
      ...(HELCIM_ACCOUNT_ID ? { accountId: HELCIM_ACCOUNT_ID } : {})
    });
    
    const url = `https://api.helcim.com/v2/card-transactions?${queryParams}`;
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-token': HELCIM_API_TOKEN,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Helcim API Error:', response.status, error);
      throw new Error(`Helcim API returned ${response.status}`);
    }
    
    const data = await response.json();
    const transactions = data.transactions || data.data || [];
    
    console.log(`\n✅ Found ${transactions.length} transactions today\n`);
    
    if (transactions.length > 0) {
      console.log('Transaction Details:');
      console.log('='.repeat(80));
      
      let totalAmount = 0;
      transactions.forEach((tx, index) => {
        const amount = tx.amount || 0;
        const cardLast4 = tx.cardNumber?.slice(-4) || tx.cardLast4 || tx.card?.last4 || '????';
        const transactionId = tx.id || tx.transactionId;
        const dateTime = tx.dateCreated || tx.dateTime || tx.date;
        const status = tx.status || tx.state || 'unknown';
        const cardType = tx.cardType || tx.card?.type || 'unknown';
        
        totalAmount += amount;
        
        console.log(`\n${index + 1}. Transaction #${transactionId}`);
        console.log(`   Amount: $${amount.toFixed(2)}`);
        console.log(`   Card: ${cardType} ****${cardLast4}`);
        console.log(`   Status: ${status}`);
        console.log(`   Time: ${dateTime}`);
      });
      
      console.log('\n' + '='.repeat(80));
      console.log(`TOTAL: $${totalAmount.toFixed(2)} from ${transactions.length} transactions`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

checkHelcimTransactions();



