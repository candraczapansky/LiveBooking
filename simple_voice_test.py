#!/usr/bin/env python3
"""
Simple test for the AI Voice Answering System
"""

import os
import sys
from dotenv import load_dotenv

# Add the python_sms_responder directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'python_sms_responder'))

# Load environment variables
load_dotenv()

def test_voice_service():
    """Test the voice service components"""
    print("🧪 Testing Voice Service Components...")
    
    try:
        from python_sms_responder.voice_service import VoiceService
        print("✅ Voice service imported successfully")
        
        # Initialize voice service
        voice_service = VoiceService()
        print("✅ Voice service initialized")
        
        # Test health check
        health = voice_service.check_health()
        print(f"✅ Health check: {health['status']}")
        
        # Test TwiML generation
        call_sid = "test_call_123"
        initial_response = voice_service.create_initial_response(call_sid)
        print(f"✅ Initial TwiML generated ({len(initial_response)} chars)")
        
        # Test AI response generation (if OpenAI is configured)
        if voice_service.openai_client:
            ai_response = voice_service._generate_ai_response(call_sid, "Hello, I need an appointment")
            print(f"✅ AI response generated: '{ai_response[:50]}...'")
        else:
            print("⚠️  OpenAI not configured - skipping AI test")
        
        # Test processing response
        processing_response = voice_service.create_processing_response(call_sid, "I'd like to book a haircut")
        print(f"✅ Processing TwiML generated ({len(processing_response)} chars)")
        
        print("\n🎉 All voice service tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing voice service: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_models():
    """Test the voice models"""
    print("\n📋 Testing Voice Models...")
    
    try:
        from python_sms_responder.models import VoiceRequest, VoiceResponse
        
        # Test VoiceRequest
        request_data = {
            "CallSid": "test_call_123",
            "From": "+1234567890",
            "To": "+0987654321",
            "AccountSid": "test_account",
            "CallStatus": "ringing",
            "SpeechResult": "Hello",
            "SpeechConfidence": "0.95",
            "CallDuration": "30"
        }
        
        voice_request = VoiceRequest(**request_data)
        print("✅ VoiceRequest model works")
        
        # Test VoiceResponse
        response_data = {
            "success": True,
            "message": "Test response",
            "twiml_response": "<Response><Say>Hello</Say></Response>",
            "call_sid": "test_call_123"
        }
        
        voice_response = VoiceResponse(**response_data)
        print("✅ VoiceResponse model works")
        
        print("🎉 All model tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing models: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_environment():
    """Test environment configuration"""
    print("\n🔧 Testing Environment Configuration...")
    
    # Check required environment variables
    required_vars = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN', 
        'TWILIO_PHONE_NUMBER',
        'OPENAI_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: Configured")
        else:
            print(f"⚠️  {var}: Not configured")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("   Please configure these in your .env file")
        return False
    else:
        print("\n✅ All environment variables configured")
        return True

def main():
    """Run all tests"""
    print("🚀 AI Voice Answering System - Simple Test")
    print("=" * 50)
    
    tests = [
        ("Environment Configuration", test_environment),
        ("Voice Models", test_models),
        ("Voice Service", test_voice_service),
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
        print("\n📋 Next steps:")
        print("1. Start the server: python -m python_sms_responder.main")
        print("2. Configure Twilio webhooks")
        print("3. Test with real phone calls!")
    else:
        print("⚠️  Some tests failed. Please check configuration and try again.")
    
    return passed == total

if __name__ == "__main__":
    main() 