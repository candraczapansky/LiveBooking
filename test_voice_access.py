#!/usr/bin/env python3
"""
Test script to demonstrate how to access the voice system
"""

import requests
import json

def test_voice_system_access():
    """Test accessing the voice system endpoints"""
    
    base_url = "http://localhost:8000"
    
    print("🎯 Testing Voice System Access")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1️⃣ Testing Health Check...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Health check successful!")
            print(f"   Status: {health_data.get('status')}")
            print(f"   Message: {health_data.get('message')}")
            
            # Show services status
            services = health_data.get('services', {})
            for service_name, service_status in services.items():
                status = service_status.get('status', 'unknown')
                print(f"   {service_name}: {status}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error accessing health endpoint: {e}")
    
    # Test 2: Voice Webhook (simulate incoming call)
    print("\n2️⃣ Testing Voice Webhook...")
    try:
        test_call_data = {
            "CallSid": "test_call_123",
            "From": "+1234567890",
            "To": "+0987654321",
            "AccountSid": "test_account",
            "CallStatus": "ringing",
            "SpeechResult": None,
            "SpeechConfidence": None,
            "CallDuration": None
        }
        
        response = requests.post(f"{base_url}/webhook/voice", data=test_call_data)
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Voice webhook successful!")
            print(f"   Success: {response_data.get('success')}")
            print(f"   Message: {response_data.get('message')}")
            print(f"   Call SID: {response_data.get('call_sid')}")
            
            # Show TwiML response
            twiml = response_data.get('twiml_response', '')
            if twiml:
                print(f"   TwiML Response: {twiml[:100]}...")
        else:
            print(f"❌ Voice webhook failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error accessing voice webhook: {e}")
    
    # Test 3: Voice Processing (simulate speech input)
    print("\n3️⃣ Testing Voice Processing...")
    try:
        test_speech_data = {
            "CallSid": "test_call_123",
            "From": "+1234567890",
            "To": "+0987654321",
            "AccountSid": "test_account",
            "CallStatus": "in-progress",
            "SpeechResult": "I'd like to book an appointment for a haircut",
            "SpeechConfidence": "0.95",
            "CallDuration": "30"
        }
        
        response = requests.post(f"{base_url}/webhook/voice/process", data=test_speech_data)
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Voice processing successful!")
            print(f"   Success: {response_data.get('success')}")
            print(f"   Message: {response_data.get('message')}")
            print(f"   Call SID: {response_data.get('call_sid')}")
            
            # Show TwiML response
            twiml = response_data.get('twiml_response', '')
            if twiml:
                print(f"   TwiML Response: {twiml[:100]}...")
        else:
            print(f"❌ Voice processing failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error accessing voice processing: {e}")
    
    # Test 4: Call Status
    print("\n4️⃣ Testing Call Status...")
    try:
        test_status_data = {
            "CallSid": "test_call_123",
            "CallStatus": "completed",
            "CallDuration": "60"
        }
        
        response = requests.post(f"{base_url}/webhook/voice/status", data=test_status_data)
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Call status update successful!")
            print(f"   Success: {response_data.get('success')}")
            print(f"   Message: {response_data.get('message')}")
        else:
            print(f"❌ Call status update failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error accessing call status: {e}")

def show_access_methods():
    """Show different ways to access the voice system"""
    
    print("\n" + "=" * 50)
    print("📞 How to Access Your Voice System")
    print("=" * 50)
    
    print("\n🌐 Web API Endpoints:")
    print("   Health Check: http://localhost:8000/health")
    print("   Voice Webhook: http://localhost:8000/webhook/voice")
    print("   Voice Processing: http://localhost:8000/webhook/voice/process")
    print("   Call Status: http://localhost:8000/webhook/voice/status")
    
    print("\n📱 Twilio Configuration:")
    print("   1. Log into your Twilio Console")
    print("   2. Go to Phone Numbers → Manage → Active numbers")
    print("   3. Click on your phone number")
    print("   4. Set Voice Webhook URL to: http://your-domain.com/webhook/voice")
    print("   5. Set Call Status Webhook URL to: http://your-domain.com/webhook/voice/status")
    
    print("\n🧪 Testing Methods:")
    print("   1. Run this script: python3 test_voice_access.py")
    print("   2. Use curl commands (see examples below)")
    print("   3. Call your Twilio phone number directly")
    
    print("\n📋 Example curl commands:")
    print("   # Health check")
    print("   curl http://localhost:8000/health")
    print("   ")
    print("   # Test voice webhook")
    print("   curl -X POST http://localhost:8000/webhook/voice \\")
    print("     -d 'CallSid=test123&From=+1234567890&To=+0987654321&AccountSid=test&CallStatus=ringing'")
    print("   ")
    print("   # Test voice processing")
    print("   curl -X POST http://localhost:8000/webhook/voice/process \\")
    print("     -d 'CallSid=test123&From=+1234567890&To=+0987654321&AccountSid=test&CallStatus=in-progress&SpeechResult=I need an appointment&SpeechConfidence=0.95'")

def main():
    """Main function"""
    print("🚀 Voice System Access Test")
    print("=" * 50)
    
    # Test the endpoints
    test_voice_system_access()
    
    # Show access methods
    show_access_methods()
    
    print("\n🎉 Voice system is ready for use!")
    print("\nNext steps:")
    print("1. Configure your Twilio phone number webhooks")
    print("2. Test with a real phone call")
    print("3. Monitor the system logs for call activity")

if __name__ == "__main__":
    main() 