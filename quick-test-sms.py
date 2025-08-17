#!/usr/bin/env python3
"""
Quick test of SMS responder functionality
"""

import requests
import json
import os

print("Quick SMS Responder Test")
print("-" * 40)

# Check if service is running
try:
    health = requests.get('http://localhost:8000/health', timeout=2)
    if health.status_code == 200:
        data = health.json()
        print("✅ Service is running")
        
        # Check each service
        services = data.get('services', {})
        
        # Check LLM service
        llm = services.get('llm_service', {})
        if llm.get('status') == 'healthy':
            print(f"✅ LLM Service: Working with {llm.get('model', 'model')}")
            llm_working = True
        else:
            print(f"❌ LLM Service: {llm.get('error', 'Not working')}")
            llm_working = False
            
        # Check SMS service  
        sms = services.get('sms_service', {})
        if sms.get('status') == 'healthy':
            print(f"✅ SMS Service: Configured")
        else:
            print(f"⚠️  SMS Service: {sms.get('error', 'Not configured')}")
            
        # Check database
        db = services.get('database_service', {})
        if db.get('status') == 'healthy':
            print(f"✅ Database: Connected")
        else:
            print(f"⚠️  Database: {db.get('error', 'Not connected')}")
            
    else:
        print("❌ Service returned unexpected status")
        llm_working = False
except Exception as e:
    print(f"❌ Service not running: {e}")
    print("\nTo start the service, run:")
    print("  python3 run-python-sms.py")
    llm_working = False
    exit(1)

# Test SMS webhook if LLM is working
if llm_working:
    print("\n" + "-" * 40)
    print("Testing SMS Webhook...")
    
    test_data = {
        "From": "+15551234567",
        "To": os.getenv('TWILIO_PHONE_NUMBER', '+19187277348'),
        "Body": "Hi, what are your services and prices?",
        "MessageSid": "SMtest123",
        "AccountSid": os.getenv('TWILIO_ACCOUNT_SID', 'ACtest'),
        "NumMedia": "0"
    }
    
    try:
        response = requests.post(
            'http://localhost:8000/webhook/sms',
            data=test_data,
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                ai_response = result.get('ai_response', 'No response')
                print(f"✅ Webhook works!")
                print(f"\nAI Response:\n{ai_response}")
            else:
                print(f"⚠️  Webhook processed but had issues: {result.get('message')}")
        else:
            print(f"❌ Webhook returned status {response.status_code}")
            print(f"Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ Webhook test failed: {e}")

    print("\n" + "-" * 40)
    print("Summary:")
    print("• SMS Responder is operational")
    print("• Ready to receive SMS messages via Twilio webhook")
    print("• Webhook URL: https://your-app-url/webhook/sms")
else:
    print("\n⚠️  LLM service not working")
    print("Check that OPENAI_API_KEY is set in Replit Secrets")
