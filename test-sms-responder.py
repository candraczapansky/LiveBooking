#!/usr/bin/env python3
"""
Test the Python SMS responder with current configuration
"""

import os
import asyncio
import json
from datetime import datetime

# First, try to load API keys
print("=" * 60)
print("TESTING PYTHON SMS RESPONDER")
print("=" * 60)

# Check environment variables
print("\n1️⃣ Checking Environment Variables...")
env_vars = {
    'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
    'TWILIO_ACCOUNT_SID': os.getenv('TWILIO_ACCOUNT_SID'),
    'TWILIO_AUTH_TOKEN': os.getenv('TWILIO_AUTH_TOKEN'),
    'TWILIO_PHONE_NUMBER': os.getenv('TWILIO_PHONE_NUMBER'),
    'DATABASE_URL': os.getenv('DATABASE_URL')
}

for key, value in env_vars.items():
    if value:
        if 'TOKEN' in key or 'KEY' in key:
            display_value = f"{value[:10]}..." if len(value) > 10 else "***configured***"
        else:
            display_value = value
        print(f"  ✅ {key}: {display_value}")
    else:
        print(f"  ❌ {key}: Not set")

# Now test each service
print("\n2️⃣ Testing Services...")

# Test Database Service
try:
    from python_sms_responder.database_service import DatabaseService
    db_service = DatabaseService()
    health = db_service.check_health()
    if health['status'] == 'healthy':
        print(f"  ✅ Database Service: Connected")
    else:
        print(f"  ❌ Database Service: {health.get('error', 'Unhealthy')}")
except Exception as e:
    print(f"  ❌ Database Service: {str(e)}")
    db_service = None

# Test LLM Service
try:
    from python_sms_responder.llm_service import LLMService
    llm_service = LLMService()
    
    # Set database service if available
    if db_service:
        llm_service.set_db_service(db_service)
    
    # Test with a simple message
    async def test_llm():
        health = await llm_service.check_health()
        if health['status'] == 'healthy':
            print(f"  ✅ LLM Service: Connected to {health.get('model', 'OpenAI')}")
            
            # Test actual response generation
            test_response = await llm_service.generate_response(
                user_message="Hi, I'd like to book an appointment",
                phone_number="+12345678900"
            )
            print(f"  ✅ Test Response: {test_response[:100]}...")
            return True
        else:
            print(f"  ❌ LLM Service: {health.get('error', 'Unhealthy')}")
            return False
    
    llm_working = asyncio.run(test_llm())
except Exception as e:
    print(f"  ❌ LLM Service: {str(e)}")
    llm_working = False

# Test SMS Service
try:
    from python_sms_responder.sms_service import SMSService
    sms_service = SMSService()
    health = sms_service.check_health()
    if health['status'] == 'healthy':
        print(f"  ✅ SMS Service: Configured with {health.get('phone_number', 'phone')}")
    else:
        print(f"  ⚠️  SMS Service: {health.get('error', 'Not fully configured')}")
except Exception as e:
    print(f"  ❌ SMS Service: {str(e)}")

# Test the main FastAPI app
print("\n3️⃣ Testing FastAPI Application...")
try:
    from python_sms_responder.main import app, get_llm_service, get_db_service, get_sms_service
    
    # Test health endpoint
    from fastapi.testclient import TestClient
    client = TestClient(app)
    
    response = client.get("/health")
    if response.status_code == 200:
        health_data = response.json()
        print(f"  ✅ FastAPI App: Running")
        
        # Show service status
        for service_name, service_status in health_data.get('services', {}).items():
            if service_status.get('status') == 'healthy':
                print(f"    • {service_name}: ✅ Healthy")
            else:
                print(f"    • {service_name}: ⚠️  {service_status.get('error', 'Unavailable')}")
    else:
        print(f"  ❌ FastAPI App: Health check failed")
        
    # Test SMS webhook with a sample message
    if llm_working:
        print("\n4️⃣ Testing SMS Webhook...")
        test_data = {
            "From": "+12345678900",
            "To": "+19876543210",
            "Body": "Hi, I want to book an appointment for tomorrow",
            "MessageSid": "SM123456789",
            "AccountSid": "AC123456789",
            "NumMedia": "0"
        }
        
        response = client.post("/webhook/sms", data=test_data)
        if response.status_code == 200:
            result = response.json()
            print(f"  ✅ SMS Webhook: Working")
            print(f"    Response: {result.get('ai_response', 'No response')[:100]}...")
        else:
            print(f"  ❌ SMS Webhook: Failed with status {response.status_code}")
            
except Exception as e:
    print(f"  ❌ FastAPI App: {str(e)}")

# Summary
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)

if env_vars['OPENAI_API_KEY'] and env_vars['OPENAI_API_KEY'] not in ['test_key', None]:
    print("✅ OpenAI API key is configured")
else:
    print("❌ OpenAI API key is NOT configured - Add it to Replit Secrets")
    print("   Key name: OPENAI_API_KEY")
    
if all([env_vars['TWILIO_ACCOUNT_SID'], env_vars['TWILIO_AUTH_TOKEN'], env_vars['TWILIO_PHONE_NUMBER']]) and \
   'test' not in str(env_vars['TWILIO_ACCOUNT_SID']).lower():
    print("✅ Twilio credentials are configured")
else:
    print("⚠️  Twilio credentials may need configuration")
    print("   Required keys: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER")

if llm_working:
    print("✅ LLM service is working - Ready for intelligent SMS responses!")
else:
    print("❌ LLM service is not working - Check OpenAI API key")

print("\n📝 Next Steps:")
if not env_vars['OPENAI_API_KEY'] or env_vars['OPENAI_API_KEY'] == 'test_key':
    print("1. Add your OpenAI API key to Replit Secrets:")
    print("   - Go to the Secrets tab (🔒 icon)")
    print("   - Add a new secret: OPENAI_API_KEY = sk-...")
    
if not all([env_vars['TWILIO_ACCOUNT_SID'], env_vars['TWILIO_AUTH_TOKEN'], env_vars['TWILIO_PHONE_NUMBER']]):
    print("2. Add your Twilio credentials to Replit Secrets:")
    print("   - TWILIO_ACCOUNT_SID = AC...")
    print("   - TWILIO_AUTH_TOKEN = ...")
    print("   - TWILIO_PHONE_NUMBER = +1...")

if llm_working:
    print("\n🚀 To start the SMS responder:")
    print("   python3 run-python-sms.py")
    print("\n🔗 Configure your Twilio webhook to:")
    print("   https://your-app-url/webhook/sms")
