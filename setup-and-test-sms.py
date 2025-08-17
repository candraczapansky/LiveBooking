#!/usr/bin/env python3
"""
Setup and test the Python SMS responder with proper API key handling
"""

import os
import sys
import asyncio
import json
import time
import requests
from datetime import datetime

print("=" * 60)
print("SMS RESPONDER SETUP AND TEST")
print("=" * 60)

# Step 1: Check and setup environment
print("\n📋 Step 1: Checking Configuration...")

# Check for API keys in environment
api_keys = {
    'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
    'TWILIO_ACCOUNT_SID': os.getenv('TWILIO_ACCOUNT_SID'),
    'TWILIO_AUTH_TOKEN': os.getenv('TWILIO_AUTH_TOKEN'),
    'TWILIO_PHONE_NUMBER': os.getenv('TWILIO_PHONE_NUMBER')
}

missing_keys = []
configured_keys = []

for key, value in api_keys.items():
    if value and value not in ['test_key', 'test_sid', 'test_token', '+1234567890']:
        configured_keys.append(key)
        if 'TOKEN' in key or 'KEY' in key:
            print(f"  ✅ {key}: ***configured***")
        else:
            print(f"  ✅ {key}: {value[:15]}..." if len(value) > 15 else f"  ✅ {key}: {value}")
    else:
        missing_keys.append(key)
        print(f"  ❌ {key}: Not configured")

# If OpenAI key is missing, use a fallback for testing
if 'OPENAI_API_KEY' in missing_keys:
    print("\n⚠️  OpenAI API key not found in environment.")
    print("   The SMS responder will use fallback responses.")
    os.environ['OPENAI_API_KEY'] = 'test_key'  # Set test key to allow service to start

# Step 2: Check if service is running
print("\n📋 Step 2: Checking SMS Responder Service...")
try:
    response = requests.get('http://localhost:8000/health', timeout=2)
    if response.status_code == 200:
        print("  ✅ SMS Responder is already running on port 8000")
        service_running = True
        health_data = response.json()
    else:
        print("  ⚠️  SMS Responder returned unexpected status")
        service_running = False
except:
    print("  ℹ️  SMS Responder is not running")
    service_running = False

# Step 3: Start service if not running
if not service_running:
    print("\n📋 Step 3: Starting SMS Responder Service...")
    print("  Starting service on port 8000...")
    
    # Start the service using subprocess
    import subprocess
    process = subprocess.Popen(
        [sys.executable, 'run-python-sms.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd='/home/runner/workspace'
    )
    
    # Wait for service to start
    print("  Waiting for service to start", end="")
    for i in range(10):
        time.sleep(1)
        print(".", end="", flush=True)
        try:
            response = requests.get('http://localhost:8000/health', timeout=1)
            if response.status_code == 200:
                print("\n  ✅ Service started successfully!")
                service_running = True
                health_data = response.json()
                break
        except:
            continue
    else:
        print("\n  ❌ Service failed to start")
        # Check for errors
        stdout, stderr = process.communicate(timeout=1)
        if stderr:
            print(f"  Error: {stderr.decode()[:200]}")
else:
    print("\n📋 Step 3: Service Already Running")

# Step 4: Test the services
if service_running:
    print("\n📋 Step 4: Testing Services...")
    
    # Display health status
    services = health_data.get('services', {})
    
    for service_name, status in services.items():
        if status.get('status') == 'healthy':
            print(f"  ✅ {service_name}: Healthy")
            if service_name == 'llm_service' and status.get('api_key_configured'):
                print(f"     Model: {status.get('model', 'Unknown')}")
        elif status.get('status') == 'unavailable':
            print(f"  ⚠️  {service_name}: {status.get('error', 'Unavailable')}")
        else:
            print(f"  ❌ {service_name}: {status.get('error', 'Error')}")
    
    # Step 5: Test SMS webhook
    print("\n📋 Step 5: Testing SMS Webhook...")
    
    test_messages = [
        "Hi, I'd like to book an appointment",
        "What services do you offer?",
        "What are your hours?"
    ]
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n  Test {i}: \"{message}\"")
        
        test_data = {
            "From": f"+1555000{1000+i}",
            "To": api_keys.get('TWILIO_PHONE_NUMBER', '+19187277348'),
            "Body": message,
            "MessageSid": f"SMtest{i}",
            "AccountSid": api_keys.get('TWILIO_ACCOUNT_SID', 'ACtest'),
            "NumMedia": "0"
        }
        
        try:
            response = requests.post(
                'http://localhost:8000/webhook/sms',
                data=test_data,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    ai_response = result.get('ai_response', 'No response')
                    print(f"  ✅ Response: {ai_response[:150]}...")
                else:
                    print(f"  ⚠️  Processing failed: {result.get('message')}")
            else:
                print(f"  ❌ Webhook returned status {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")

# Final Summary
print("\n" + "=" * 60)
print("SETUP COMPLETE - STATUS SUMMARY")
print("=" * 60)

if service_running:
    print("✅ Python SMS Responder is running on port 8000")
    
    if 'OPENAI_API_KEY' not in missing_keys:
        print("✅ OpenAI integration is configured")
        print("   - AI-powered responses are enabled")
    else:
        print("⚠️  OpenAI API key not configured")
        print("   - Using fallback responses")
        print("   - To enable AI responses:")
        print("     1. Add OPENAI_API_KEY to Replit Secrets")
        print("     2. Restart the service")
    
    if not any(k in missing_keys for k in ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']):
        print("✅ Twilio integration is configured")
        print(f"   - Phone: {api_keys.get('TWILIO_PHONE_NUMBER')}")
    else:
        print("⚠️  Some Twilio credentials missing")
    
    print("\n🔗 Webhook URL for Twilio:")
    print("   https://your-replit-app-url.repl.co/webhook/sms")
    print("\n📱 To use the SMS responder:")
    print("   1. Configure the webhook URL in your Twilio console")
    print("   2. Send an SMS to your Twilio phone number")
    print("   3. The AI will respond automatically")
    
else:
    print("❌ SMS Responder failed to start")
    print("   Check the logs for errors")

print("\n📝 Service Control Commands:")
print("   Start:   python3 run-python-sms.py")
print("   Test:    python3 test-sms-responder.py")
print("   Stop:    pkill -f 'python.*run-python-sms'")
