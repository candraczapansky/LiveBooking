#!/usr/bin/env python3
"""
Twilio Phone Number Diagnostic Script
Helps identify why calls are failing with "cannot be completed as dialed"
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_environment_variables():
    """Check if required environment variables are set"""
    print("🔧 Checking Environment Variables...")
    
    required_vars = {
        'TWILIO_ACCOUNT_SID': 'Twilio Account SID',
        'TWILIO_AUTH_TOKEN': 'Twilio Auth Token',
        'TWILIO_PHONE_NUMBER': 'Twilio Phone Number'
    }
    
    missing_vars = []
    for var, description in required_vars.items():
        value = os.getenv(var)
        if value:
            print(f"✅ {description}: Configured")
            if var == 'TWILIO_PHONE_NUMBER':
                print(f"   Phone Number: {value}")
        else:
            print(f"❌ {description}: Missing")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("   Please add these to your .env file")
        return False
    else:
        print("\n✅ All required environment variables are configured")
        return True

def check_twilio_phone_number():
    """Check Twilio phone number configuration"""
    print("\n📞 Checking Twilio Phone Number Configuration...")
    
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
            print("❌ No phone numbers found in your Twilio account")
            print("   Please purchase a phone number in your Twilio console")
            return False
        
        print(f"✅ Found {len(numbers)} phone number(s) in your account:")
        
        target_number = None
        for num in numbers:
            print(f"   📱 {num.phone_number}")
            print(f"      Voice URL: {num.voice_url or 'Not configured'}")
            print(f"      Status Callback URL: {num.status_callback_url or 'Not configured'}")
            print(f"      Voice Method: {num.voice_method or 'Not configured'}")
            print(f"      Status Callback Method: {num.status_callback_method or 'Not configured'}")
            print()
            
            if num.phone_number == phone_number:
                target_number = num
        
        if not target_number:
            print(f"❌ Phone number {phone_number} not found in your account")
            print("   Please check your TWILIO_PHONE_NUMBER environment variable")
            return False
        
        print(f"🎯 Target phone number: {target_number.phone_number}")
        
        # Check voice configuration
        if not target_number.voice_url:
            print("❌ Voice webhook URL not configured")
            print("   This is likely the cause of 'call cannot be completed as dialed'")
            return False
        else:
            print(f"✅ Voice webhook URL: {target_number.voice_url}")
        
        # Check if webhook URL is accessible
        try:
            response = requests.get(target_number.voice_url, timeout=5)
            if response.status_code == 200:
                print("✅ Voice webhook URL is accessible")
            else:
                print(f"⚠️  Voice webhook URL returned status {response.status_code}")
        except Exception as e:
            print(f"❌ Voice webhook URL is not accessible: {e}")
            print("   This will cause calls to fail")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking Twilio configuration: {e}")
        return False

def check_server_status():
    """Check if the server is running and accessible"""
    print("\n🖥️  Checking Server Status...")
    
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running and accessible")
            health_data = response.json()
            
            # Check voice service status
            services = health_data.get('services', {})
            voice_service = services.get('voice_service', {})
            
            if voice_service.get('status') == 'healthy':
                print("✅ Voice service is healthy")
            else:
                print(f"⚠️  Voice service status: {voice_service.get('status')}")
                if 'error' in voice_service:
                    print(f"   Error: {voice_service['error']}")
            
            return True
        else:
            print(f"❌ Server returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Server is not accessible: {e}")
        print("   Please start the server with: python -m python_sms_responder.main")
        return False

def test_webhook_endpoint():
    """Test the webhook endpoint"""
    print("\n🧪 Testing Webhook Endpoint...")
    
    try:
        test_data = {
            "CallSid": "test_call_123",
            "From": "+1234567890",
            "To": "+0987654321",
            "AccountSid": "test_account",
            "CallStatus": "ringing"
        }
        
        response = requests.post("http://localhost:8000/webhook/voice", data=test_data)
        
        if response.status_code == 200:
            print("✅ Webhook endpoint is working")
            response_data = response.json()
            print(f"   Success: {response_data.get('success')}")
            print(f"   Message: {response_data.get('message')}")
            
            # Check if TwiML response is generated
            twiml = response_data.get('twiml_response', '')
            if twiml and '<Response>' in twiml:
                print("✅ TwiML response is generated correctly")
            else:
                print("⚠️  TwiML response may be incomplete")
            
            return True
        else:
            print(f"❌ Webhook endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing webhook: {e}")
        return False

def provide_solutions():
    """Provide solutions based on the diagnostic results"""
    print("\n" + "=" * 50)
    print("🔧 Solutions for 'Call Cannot Be Completed As Dialed'")
    print("=" * 50)
    
    print("\n📋 Most Common Solutions:")
    
    print("\n1️⃣ **Phone Number Not Configured for Voice**")
    print("   - Log into Twilio Console")
    print("   - Go to Phone Numbers → Manage → Active numbers")
    print("   - Click on your phone number")
    print("   - Set Voice Configuration to 'Webhook'")
    print("   - Set Voice Webhook URL to your server endpoint")
    
    print("\n2️⃣ **Webhook URL Not Accessible**")
    print("   - For testing: Use ngrok to expose your server")
    print("   - Run: ngrok http 8000")
    print("   - Copy the HTTPS URL and update Twilio webhook")
    
    print("\n3️⃣ **Server Not Running**")
    print("   - Start the server: python -m python_sms_responder.main")
    print("   - Verify it's running on port 8000")
    
    print("\n4️⃣ **Environment Variables Missing**")
    print("   - Check your .env file")
    print("   - Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set")
    
    print("\n5️⃣ **Twilio Account Issues**")
    print("   - Check your Twilio account has sufficient credits")
    print("   - Verify the phone number is active")
    print("   - Check for any account restrictions")

def main():
    """Run the diagnostic"""
    print("🚨 Twilio Phone Number Diagnostic")
    print("=" * 50)
    print("This script will help identify why calls are failing...")
    print()
    
    # Run diagnostics
    env_ok = check_environment_variables()
    server_ok = check_server_status()
    twilio_ok = check_twilio_phone_number()
    webhook_ok = test_webhook_endpoint()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Diagnostic Summary")
    print("=" * 50)
    
    checks = [
        ("Environment Variables", env_ok),
        ("Server Status", server_ok),
        ("Twilio Configuration", twilio_ok),
        ("Webhook Endpoint", webhook_ok)
    ]
    
    all_passed = True
    for check_name, passed in checks:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {check_name}")
        if not passed:
            all_passed = False
    
    print(f"\n🎯 Overall Status: {'✅ ALL CHECKS PASSED' if all_passed else '❌ ISSUES FOUND'}")
    
    if not all_passed:
        provide_solutions()
    else:
        print("\n🎉 Everything looks good! Try calling your phone number again.")
        print("If it still doesn't work, check the Twilio Console logs for more details.")

if __name__ == "__main__":
    main() 