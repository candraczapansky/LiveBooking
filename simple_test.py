#!/usr/bin/env python3
"""
Simple test script for the Salon SMS Responder system
"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all modules can be imported"""
    print("🧪 Testing Module Imports...")
    
    try:
        from python_sms_responder import models
        print("✅ Models imported successfully")
    except Exception as e:
        print(f"❌ Models import failed: {e}")
        return False
    
    try:
        from python_sms_responder.models import SMSRequest, SMSResponse, ClientInfo
        print("✅ Model classes imported successfully")
    except Exception as e:
        print(f"❌ Model classes import failed: {e}")
        return False
    
    try:
        from python_sms_responder.sms_service import SMSService
        print("✅ SMS Service imported successfully")
    except Exception as e:
        print(f"❌ SMS Service import failed: {e}")
        return False
    
    try:
        from python_sms_responder.llm_service import LLMService
        print("✅ LLM Service imported successfully")
    except Exception as e:
        print(f"❌ LLM Service import failed: {e}")
        return False
    
    try:
        from python_sms_responder.database_service import DatabaseService
        print("✅ Database Service imported successfully")
    except Exception as e:
        print(f"❌ Database Service import failed: {e}")
        return False
    
    return True

def test_model_creation():
    """Test creating model instances"""
    print("\n🧪 Testing Model Creation...")
    
    try:
        from python_sms_responder.models import SMSRequest, SMSResponse, ClientInfo
        
        # Test SMSRequest
        sms_request = SMSRequest(
            From="+1234567890",
            To="+0987654321",
            Body="Hi, I'd like to book an appointment",
            MessageSid="test123",
            AccountSid="test456"
        )
        print("✅ SMSRequest created successfully")
        
        # Test SMSResponse
        sms_response = SMSResponse(
            success=True,
            message="SMS processed successfully",
            ai_response="Thank you for your message. I'll help you book an appointment."
        )
        print("✅ SMSResponse created successfully")
        
        # Test ClientInfo
        client_info = ClientInfo(
            id=1,
            name="John Doe",
            phone="+1234567890",
            email="john@example.com",
            total_appointments=5
        )
        print("✅ ClientInfo created successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Model creation failed: {e}")
        return False

def test_service_initialization():
    """Test service initialization (without environment variables)"""
    print("\n🧪 Testing Service Initialization...")
    
    # Test SMS Service initialization (will fail without env vars, but should not crash)
    try:
        from python_sms_responder.sms_service import SMSService
        sms_service = SMSService()
        print("✅ SMS Service initialized (with env vars)")
    except ValueError as e:
        print(f"⚠️  SMS Service requires environment variables: {e}")
    except Exception as e:
        print(f"❌ SMS Service initialization failed: {e}")
        return False
    
    # Test LLM Service initialization (will fail without env vars, but should not crash)
    try:
        from python_sms_responder.llm_service import LLMService
        llm_service = LLMService()
        print("✅ LLM Service initialized (with env vars)")
    except ValueError as e:
        print(f"⚠️  LLM Service requires environment variables: {e}")
    except Exception as e:
        print(f"❌ LLM Service initialization failed: {e}")
        return False
    
    # Test Database Service initialization (will fail without env vars, but should not crash)
    try:
        from python_sms_responder.database_service import DatabaseService
        db_service = DatabaseService()
        print("✅ Database Service initialized")
    except Exception as e:
        print(f"⚠️  Database Service initialization: {e}")
    
    return True

def test_fastapi_app():
    """Test FastAPI app creation"""
    print("\n🧪 Testing FastAPI App...")
    
    try:
        from python_sms_responder.main import app
        print("✅ FastAPI app created successfully")
        
        # Test that app has expected endpoints
        routes = [route.path for route in app.routes]
        expected_routes = ["/", "/health", "/webhook/sms"]
        
        for route in expected_routes:
            if route in routes:
                print(f"✅ Route {route} exists")
            else:
                print(f"⚠️  Route {route} not found")
        
        return True
        
    except Exception as e:
        print(f"❌ FastAPI app creation failed: {e}")
        return False

def main():
    """Main test function"""
    print("Salon SMS Responder - Simple System Test")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_model_creation,
        test_service_initialization,
        test_fastapi_app
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All basic tests passed! The system is ready for configuration.")
        print("\nNext steps:")
        print("1. Set up environment variables (see env.example)")
        print("2. Configure Twilio and OpenAI credentials")
        print("3. Set up database (optional)")
        print("4. Run: python -m python_sms_responder.main")
        return 0
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 