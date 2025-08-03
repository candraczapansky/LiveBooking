#!/usr/bin/env python3
"""
Test script for the Salon SMS Responder system
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from python_sms_responder.sms_service import SMSService
from python_sms_responder.llm_service import LLMService
from python_sms_responder.database_service import DatabaseService
from python_sms_responder.models import SMSRequest, ClientInfo

async def test_services():
    """Test all services to ensure they're working correctly"""
    
    print("🧪 Testing Salon SMS Responder Services...")
    print("=" * 50)
    
    # Test 1: Environment Variables
    print("\n1. Checking Environment Variables...")
    required_vars = [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN", 
        "TWILIO_PHONE_NUMBER",
        "OPENAI_API_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        print("Please set these in your .env file")
        return False
    else:
        print("✅ All required environment variables are set")
    
    # Test 2: SMS Service
    print("\n2. Testing SMS Service...")
    try:
        sms_service = SMSService()
        health = await sms_service.check_health()
        if health["status"] == "healthy":
            print("✅ SMS Service is healthy")
            print(f"   Account SID: {health['account_sid'][:10]}...")
            print(f"   From Number: {health['from_number']}")
        else:
            print(f"❌ SMS Service unhealthy: {health.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ SMS Service error: {str(e)}")
        return False
    
    # Test 3: LLM Service
    print("\n3. Testing LLM Service...")
    try:
        llm_service = LLMService()
        health = await llm_service.check_health()
        if health["status"] == "healthy":
            print("✅ LLM Service is healthy")
            print(f"   Model: {health['model']}")
            print(f"   API Key configured: {health['api_key_configured']}")
        else:
            print(f"❌ LLM Service unhealthy: {health.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ LLM Service error: {str(e)}")
        return False
    
    # Test 4: Database Service
    print("\n4. Testing Database Service...")
    try:
        db_service = DatabaseService()
        health = await db_service.check_health()
        if health["status"] == "healthy":
            print("✅ Database Service is healthy")
            print(f"   Connection: {health['connection']}")
        else:
            print(f"❌ Database Service unhealthy: {health.get('error', 'Unknown error')}")
            print("   Note: Database connection is optional for testing")
    except Exception as e:
        print(f"❌ Database Service error: {str(e)}")
        print("   Note: Database connection is optional for testing")
    
    # Test 5: AI Response Generation
    print("\n5. Testing AI Response Generation...")
    try:
        test_message = "Hi, I'd like to book a haircut for tomorrow"
        test_client = ClientInfo(
            name="Test Client",
            phone="+1234567890",
            total_appointments=5
        )
        
        response = await llm_service.generate_response(
            user_message=test_message,
            client_info=test_client,
            phone_number="+1234567890"
        )
        
        print("✅ AI Response generated successfully")
        print(f"   Input: {test_message}")
        print(f"   Output: {response}")
        
    except Exception as e:
        print(f"❌ AI Response generation error: {str(e)}")
        return False
    
    # Test 6: Intent Analysis
    print("\n6. Testing Intent Analysis...")
    try:
        intent_result = await llm_service.analyze_intent(test_message)
        print("✅ Intent analysis successful")
        print(f"   Intent: {intent_result.get('intent', 'unknown')}")
        print(f"   Confidence: {intent_result.get('confidence', 0)}")
        print(f"   Requires Human: {intent_result.get('requires_human', True)}")
        
    except Exception as e:
        print(f"❌ Intent analysis error: {str(e)}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! The SMS Responder system is ready to use.")
    print("\nNext steps:")
    print("1. Configure your Twilio webhook URL")
    print("2. Set up your database (optional)")
    print("3. Start the server: python -m python_sms_responder.main")
    print("4. Test with: curl -X POST http://localhost:8000/webhook/sms ...")
    
    return True

async def test_webhook():
    """Test the webhook endpoint"""
    print("\n🌐 Testing Webhook Endpoint...")
    
    # This would require the server to be running
    # For now, just show the expected format
    print("Expected webhook format:")
    print("POST /webhook/sms")
    print("Content-Type: application/x-www-form-urlencoded")
    print("Body: From=+1234567890&To=+0987654321&Body=Hi&MessageSid=test123&AccountSid=test456")

def main():
    """Main test function"""
    load_dotenv()
    
    print("Salon SMS Responder - System Test")
    print("=" * 50)
    
    # Run tests
    success = asyncio.run(test_services())
    
    if success:
        asyncio.run(test_webhook())
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main() 