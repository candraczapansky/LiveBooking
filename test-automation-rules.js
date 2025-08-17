import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkAutomationRules() {
  try {
    console.log('🔍 Checking automation rules...');
    
    // Open database
    const db = await open({
      filename: './data/app.db',
      driver: sqlite3.Database
    });
    
    // Get all automation rules
    const allRules = await db.all('SELECT * FROM automation_rules');
    console.log(`📊 Total automation rules: ${allRules.length}`);
    
    const bookingConfirmationRules = allRules.filter(rule => 
      rule.trigger === 'booking_confirmation' && rule.active === 1
    );
    
    console.log(`📊 Active booking confirmation rules: ${bookingConfirmationRules.length}`);
    
    bookingConfirmationRules.forEach((rule, index) => {
      console.log(`\n📋 Rule ${index + 1}:`);
      console.log(`   Name: ${rule.name}`);
      console.log(`   Type: ${rule.type}`);
      console.log(`   Active: ${rule.active}`);
      console.log(`   Template: ${rule.template.substring(0, 100)}...`);
    });
    
    const smsRules = allRules.filter(rule => 
      rule.type === 'sms' && rule.active === 1
    );
    
    console.log(`\n📱 Active SMS rules: ${smsRules.length}`);
    smsRules.forEach((rule, index) => {
      console.log(`\n📱 SMS Rule ${index + 1}:`);
      console.log(`   Name: ${rule.name}`);
      console.log(`   Trigger: ${rule.trigger}`);
      console.log(`   Active: ${rule.active}`);
      console.log(`   Template: ${rule.template.substring(0, 100)}...`);
    });
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error checking automation rules:', error);
  }
}

checkAutomationRules(); 