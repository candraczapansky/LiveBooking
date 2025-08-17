#!/usr/bin/env python3
"""
Script to fix Twilio webhook URLs for voice system
"""

import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

def fix_twilio_webhooks():
    """Update Twilio phone number webhook URLs"""
    
    # Get credentials
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    phone_number = os.getenv('TWILIO_PHONE_NUMBER')
    
    if not all([account_sid, auth_token, phone_number]):
        print("❌ Missing environment variables:")
        print(f"   TWILIO_ACCOUNT_SID: {'✅' if account_sid else '❌'}")
        print(f"   TWILIO_AUTH_TOKEN: {'✅' if auth_token else '❌'}")
        print(f"   TWILIO_PHONE_NUMBER: {'✅' if phone_number else '❌'}")
        return False
    
    # Clean phone number (remove extra + if present)
    if phone_number.startswith('++'):
        phone_number = phone_number[1:]
    
    print(f"🔧 Fixing webhooks for phone number: {phone_number}")
    
    try:
        # Initialize Twilio client
        client = Client(account_sid, auth_token)
        
        # Get the phone number
        incoming_phone_numbers = client.incoming_phone_numbers.list(phone_number=phone_number)
        
        if not incoming_phone_numbers:
            print(f"❌ Phone number {phone_number} not found in your Twilio account")
            return False
        
        phone_number_sid = incoming_phone_numbers[0].sid
        print(f"✅ Found phone number SID: {phone_number_sid}")
        
        # Update webhook URLs
        new_voice_url = "https://icy-mammals-begin.loca.lt/webhook/voice"
        new_status_url = "https://icy-mammals-begin.loca.lt/webhook/voice/status"
        
        print(f"📞 Setting voice webhook to: {new_voice_url}")
        print(f"📊 Setting status webhook to: {new_status_url}")
        
        # Update the phone number
        updated_number = client.incoming_phone_numbers(phone_number_sid).update(
            voice_url=new_voice_url,
            voice_method='POST',
            status_callback=new_status_url,
            status_callback_method='POST'
        )
        
        print("✅ Successfully updated Twilio webhook URLs!")
        print(f"   Voice URL: {updated_number.voice_url}")
        print(f"   Status URL: {updated_number.status_callback}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating webhooks: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Fixing Twilio Webhook URLs...")
    success = fix_twilio_webhooks()
    
    if success:
        print("\n🎉 Webhooks updated successfully!")
        print("📞 Now call your phone number to test:")
        print("   +19187277348")
    else:
        print("\n❌ Failed to update webhooks")
        print("Please check your environment variables and try again") 