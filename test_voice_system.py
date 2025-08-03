#!/usr/bin/env python3
"""
Test script for the AI Voice Answering System
This script demonstrates the voice webhook functionality and tests the system components.
"""

import os
import sys
import asyncio
import requests
from dotenv import load_dotenv

# Add the python_sms_responder directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'python_sms_responder'))

from python_sms_responder.voice_service import VoiceService
from python_sms_responder.models import VoiceRequest, VoiceResponse

# Load environment variables
load_dotenv()

class VoiceSystemTester:
    """Test class for the voice answering system"""
    
    def __init__(self):
        """Initialize the tester"""
        self.base_url = "http://localhost:8000"
        self.voice_service = VoiceService()
        
    def test_voice_service_initialization(self):
        """Test voice service initialization"""
        print("🔧 Testing Voice Service Initialization...")
        
        try:
            # Check if services are configured
            twilio_configured = self.voice_service.twilio_client is not None
            openai_configured = self.voice_service.openai_client is not None
            
            print(f"✅ Twilio configured: {twilio_configured}")
            print(f"✅ OpenAI configured: {openai_configured}")
            
            if not twilio_configured:
                print("⚠️  Warning: Twilio credentials not configured")
                print("   Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env")
            
            if not openai_configured:
                print("⚠️  Warning: OpenAI API key not configured")
                print("   Set OPENAI_API_KEY in .env")
            
            return twilio_configured and openai_configured
            
        except Exception as e:
            print(f"❌ Error initializing voice service: {e}")
            return False
    
    def test_health_check(self):
        """Test the health check endpoint"""
        print("\n🏥 Testing Health Check Endpoint...")
        
        try:
            response = requests.get(f"{self.base_url}/health")
            
            if response.status_code == 200:
                health_data = response.json()
                print("✅ Health check successful")
                print(f"   Overall status: {health_data.get('status')}")
                
                services = health_data.get('services', {})
                for service_name, service_status in services.items():
                    status = service_status.get('status', 'unknown')
                    print(f"   {service_name}: {status}")
                
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing health check: {e}")
            return False
    
    def test_voice_service_health(self):
        """Test voice service health directly"""
        print("\n🔍 Testing Voice Service Health...")
        
        try:
            health = self.voice_service.check_health()
            print(f"✅ Voice service health: {health['status']}")
            
            if health.get('twilio_configured'):
                print("   ✅ Twilio client configured")
            else:
                print("   ❌ Twilio client not configured")
            
            if health.get('openai_configured'):
                print("   ✅ OpenAI client configured")
            else:
                print("   ❌ OpenAI client not configured")
            
            if health.get('openai_working'):
                print("   ✅ OpenAI connection working")
            elif health.get('openai_error'):
                print(f"   ❌ OpenAI error: {health['openai_error']}")
            
            print(f"   📊 Active conversation sessions: {health.get('conversation_sessions', 0)}")
            
            return health['status'] == 'healthy'
            
        except Exception as e:
            print(f"❌ Error testing voice service health: {e}")
            return False
    
    def test_twiml_generation(self):
        """Test TwiML response generation"""
        print("\n📞 Testing TwiML Response Generation...")
        
        try:
            # Test initial response
            call_sid = "test_call_123"
            initial_response = self.voice_service.create_initial_response(call_sid)
            
            print("✅ Initial TwiML response generated")
            print(f"   Response length: {len(initial_response)} characters")
            
            # Test processing response
            user_speech = "I'd like to book an appointment for a haircut"
            processing_response = self.voice_service.create_processing_response(call_sid, user_speech)
            
            print("✅ Processing TwiML response generated")
            print(f"   Response length: {len(processing_response)} characters")
            
            # Check if responses contain expected elements
            if "<Response>" in initial_response and "<Say>" in initial_response:
                print("   ✅ Initial response contains valid TwiML")
            else:
                print("   ❌ Initial response missing expected TwiML elements")
            
            if "<Response>" in processing_response and "<Say>" in processing_response:
                print("   ✅ Processing response contains valid TwiML")
            else:
                print("   ❌ Processing response missing expected TwiML elements")
            
            return True
            
        except Exception as e:
            print(f"❌ Error testing TwiML generation: {e}")
            return False
    
    def test_ai_response_generation(self):
        """Test AI response generation"""
        print("\n🤖 Testing AI Response Generation...")
        
        try:
            if not self.voice_service.openai_client:
                print("⚠️  Skipping AI test - OpenAI not configured")
                return True
            
            call_sid = "test_ai_call_456"
            test_messages = [
                "I'd like to book an appointment",
                "What are your hours?",
                "How much does a haircut cost?",
                "Can I cancel my appointment?"
            ]
            
            for i, message in enumerate(test_messages, 1):
                print(f"   Testing message {i}: '{message}'")
                
                response = self.voice_service._generate_ai_response(call_sid, message)
                
                if response and len(response) > 0:
                    print(f"   ✅ AI response: '{response[:100]}...'")
                else:
                    print(f"   ❌ Empty AI response")
                    return False
            
            # Test conversation history
            print("   Testing conversation history...")
            history = self.voice_service.conversation_history.get(call_sid, [])
            print(f"   ✅ Conversation history length: {len(history)}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error testing AI response generation: {e}")
            return False
    
    def test_webhook_endpoints(self):
        """Test webhook endpoints"""
        print("\n🌐 Testing Webhook Endpoints...")
        
        try:
            # Test voice webhook endpoint
            test_data = {
                "CallSid": "test_webhook_call_789",
                "From": "+1234567890",
                "To": "+0987654321",
                "AccountSid": "test_account",
                "CallStatus": "ringing",
                "SpeechResult": None,
                "SpeechConfidence": None,
                "CallDuration": None
            }
            
            response = requests.post(f"{self.base_url}/webhook/voice", data=test_data)
            
            if response.status_code == 200:
                print("✅ Voice webhook endpoint working")
                response_data = response.json()
                print(f"   Success: {response_data.get('success')}")
                print(f"   Message: {response_data.get('message')}")
            else:
                print(f"❌ Voice webhook failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
            
            # Test voice processing endpoint
            test_data["SpeechResult"] = "I need an appointment"
            test_data["SpeechConfidence"] = "0.95"
            
            response = requests.post(f"{self.base_url}/webhook/voice/process", data=test_data)
            
            if response.status_code == 200:
                print("✅ Voice processing endpoint working")
                response_data = response.json()
                print(f"   Success: {response_data.get('success')}")
                print(f"   Message: {response_data.get('message')}")
            else:
                print(f"❌ Voice processing failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Error testing webhook endpoints: {e}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Voice System Tests")
        print("=" * 50)
        
        tests = [
            ("Voice Service Initialization", self.test_voice_service_initialization),
            ("Health Check Endpoint", self.test_health_check),
            ("Voice Service Health", self.test_voice_service_health),
            ("TwiML Generation", self.test_twiml_generation),
            ("AI Response Generation", self.test_ai_response_generation),
            ("Webhook Endpoints", self.test_webhook_endpoints),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ Test '{test_name}' failed with exception: {e}")
                results.append((test_name, False))
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 Test Results Summary")
        print("=" * 50)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
            if result:
                passed += 1
        
        print(f"\n🎯 Overall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Voice system is ready.")
        else:
            print("⚠️  Some tests failed. Please check configuration and try again.")
        
        return passed == total

def main():
    """Main function to run the tests"""
    print("AI Voice Answering System - Test Suite")
    print("=" * 50)
    
    # Check if server is running
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        print("✅ Server is running")
    except:
        print("❌ Server is not running. Please start the server first:")
        print("   python -m python_sms_responder.main")
        return
    
    # Run tests
    tester = VoiceSystemTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Voice system is ready for use!")
        print("\n📋 Next steps:")
        print("1. Configure your Twilio phone number webhook URL to:")
        print("   http://your-domain.com/webhook/voice")
        print("2. Set up call status webhook URL to:")
        print("   http://your-domain.com/webhook/voice/status")
        print("3. Test with a real phone call!")
    else:
        print("\n⚠️  Please fix the failed tests before using the voice system.")

if __name__ == "__main__":
    main() 