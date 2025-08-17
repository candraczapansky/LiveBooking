#!/usr/bin/env python3
"""
Quick Fix: Update Twilio Phone Number Configuration
Run this script to automatically configure your Twilio phone number.
"""

import os
from twilio.rest import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def update_twilio_config():
    """Update Twilio phone number configuration"""
    
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    phone_number = os.getenv('TWILIO_PHONE_NUMBER')
    
    if not all([account_sid, auth_token, phone_number]):
        print("❌ Missing Twilio credentials")
        return False
    
    try:
        client = Client(account_sid, auth_token)
        
        # Get phone numbers
        numbers = client.incoming_phone_numbers.list()
        
        target_number = None
        for num in numbers:
            if num.phone_number == phone_number:
                target_number = num
                break
        
        if not target_number:
            print(f"❌ Phone number {phone_number} not found")
            return False
        
        # Update configuration
        webhook_url = "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook/voice"
        status_url = "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook/voice/status"
        
        print(f"📞 Updating phone number: {phone_number}")
        print(f"   Voice Webhook URL: {webhook_url}")
        print(f"   Status Callback URL: {status_url}")
        
        # Update the phone number
        updated_number = client.incoming_phone_numbers(target_number.sid).update(
            voice_url=webhook_url,
            voice_method='POST',
            status_callback=status_url,
            status_callback_method='POST',
            status_callback_event=['completed', 'busy', 'failed', 'no-answer']
        )
        
        print("✅ Phone number configuration updated successfully!")
        print(f"   Voice URL: {updated_number.voice_url}")
        print(f"   Status Callback: {updated_number.status_callback_url}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating configuration: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Quick Fix: Updating Twilio Phone Number Configuration")
    print("=" * 60)
    
    success = update_twilio_config()
    
    if success:
        print("
🎉 Configuration updated! Try calling your phone number now.")
        print("   Phone: +19187277348")
    else:
        print("
❌ Failed to update configuration. Please configure manually in Twilio Console.")
