#!/usr/bin/env python3
"""
Configure Twilio Phone Number for Voice Webhooks
This script will help you set up your Twilio phone number correctly.
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_current_twilio_config():
    """Check current Twilio phone number configuration"""
    print("🔍 Checking Current Twilio Configuration")
    print("=" * 50)
    
    try:
        from twilio.rest import Client
        
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        phone_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        if not all([account_sid, auth_token, phone_number]):
            print("❌ Missing Twilio credentials")
            return False
        
        client = Client(account_sid, auth_token)
        
        # Get phone numbers
        numbers = client.incoming_phone_numbers.list()
        
        if not numbers:
            print("❌ No phone numbers found in your account")
            return False
        
        print(f"📱 Found {len(numbers)} phone number(s):")
        
        for num in numbers:
            print(f"\n   Phone: {num.phone_number}")
            print(f"   Voice URL: {num.voice_url or 'NOT CONFIGURED'}")
            print(f"   Voice Method: {num.voice_method or 'NOT CONFIGURED'}")
            print(f"   Status Callback URL: {num.status_callback_url or 'NOT CONFIGURED'}")
            print(f"   Status Callback Method: {num.status_callback_method or 'NOT CONFIGURED'}")
            
            if num.phone_number == phone_number:
                print("   ✅ This is your target phone number")
                
                # Check if voice is configured
                if not num.voice_url:
                    print("   ❌ VOICE WEBHOOK NOT CONFIGURED - This is the problem!")
                else:
                    print("   ✅ Voice webhook is configured")
                    
                if not num.status_callback_url:
                    print("   ⚠️  Status callback not configured")
                else:
                    print("   ✅ Status callback is configured")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking Twilio configuration: {e}")
        return False

def provide_configuration_instructions():
    """Provide step-by-step configuration instructions"""
    print("\n📞 Twilio Phone Number Configuration Instructions")
    print("=" * 60)
    
    print("\n🚨 PROBLEM: Your phone number is not configured for voice webhooks")
    print("   This is why you get 'call cannot be completed as dialed'")
    print()
    
    print("🔧 SOLUTION: Configure your phone number in Twilio Console")
    print()
    print("Step-by-step instructions:")
    print()
    print("1️⃣ **Log into Twilio Console**")
    print("   Go to: https://console.twilio.com")
    print("   Sign in with your Twilio account")
    print()
    print("2️⃣ **Navigate to Phone Numbers**")
    print("   Click: Phone Numbers → Manage → Active numbers")
    print("   Find your phone number: +19187277348")
    print("   Click on the phone number to edit it")
    print()
    print("3️⃣ **Configure Voice Settings**")
    print("   In the 'Voice Configuration' section:")
    print("   - Set 'Voice Configuration' to: Webhook")
    print("   - Set 'Voice Webhook URL' to:")
    print("     https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook/voice")
    print("   - Set 'HTTP Method' to: POST")
    print()
    print("4️⃣ **Configure Status Callback**")
    print("   In the 'Status Callback' section:")
    print("   - Set 'Status Callback URL' to:")
    print("     https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook/voice/status")
    print("   - Set 'Status Callback Events' to: completed, busy, failed, no-answer")
    print("   - Set 'HTTP Method' to: POST")
    print()
    print("5️⃣ **Save Configuration**")
    print("   Click 'Save Configuration' at the bottom")
    print("   Wait for the changes to take effect (usually 1-2 minutes)")
    print()
    print("6️⃣ **Test the Phone Number**")
    print("   Call your phone number: +19187277348")
    print("   You should hear: 'Hello! Welcome to our salon...'")

def test_webhook_urls():
    """Test if the webhook URLs are accessible"""
    print("\n🧪 Testing Webhook URLs")
    print("=" * 30)
    
    base_url = "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev"
    
    urls_to_test = [
        f"{base_url}/webhook/voice",
        f"{base_url}/webhook/voice/status"
    ]
    
    for url in urls_to_test:
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"✅ {url} - Accessible")
            else:
                print(f"⚠️  {url} - Status {response.status_code}")
        except Exception as e:
            print(f"❌ {url} - Not accessible: {e}")

def create_quick_fix_script():
    """Create a script to update Twilio configuration programmatically"""
    print("\n🔧 Creating Quick Fix Script")
    print("=" * 30)
    
    script_content = '''#!/usr/bin/env python3
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
        print("\n🎉 Configuration updated! Try calling your phone number now.")
        print("   Phone: +19187277348")
    else:
        print("\n❌ Failed to update configuration. Please configure manually in Twilio Console.")
'''
    
    with open('quick_fix_twilio.py', 'w') as f:
        f.write(script_content)
    
    print("✅ Created quick_fix_twilio.py")
    print("   Run this script to automatically configure your Twilio phone number")

def main():
    """Main function"""
    print("🔧 Twilio Phone Number Configuration Helper")
    print("=" * 50)
    
    # Check current configuration
    check_current_twilio_config()
    
    # Test webhook URLs
    test_webhook_urls()
    
    # Provide instructions
    provide_configuration_instructions()
    
    # Create quick fix script
    create_quick_fix_script()
    
    print("\n" + "=" * 50)
    print("🎯 Summary")
    print("=" * 50)
    print("The issue is that your Twilio phone number is not configured for voice webhooks.")
    print()
    print("You have two options:")
    print()
    print("1️⃣ **Manual Configuration (Recommended)**")
    print("   Follow the step-by-step instructions above")
    print("   Go to Twilio Console and update your phone number settings")
    print()
    print("2️⃣ **Automatic Configuration**")
    print("   Run: python3 quick_fix_twilio.py")
    print("   This will automatically configure your phone number")
    print()
    print("After configuring, call your phone number to test!")

if __name__ == "__main__":
    main() 