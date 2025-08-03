#!/usr/bin/env python3
"""
Demonstration script for the Salon SMS Responder system
"""

import asyncio
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from python_sms_responder.models import SMSRequest, SMSResponse, ClientInfo
from python_sms_responder.llm_service import LLMService
from python_sms_responder.sms_service import SMSService
from python_sms_responder.database_service import DatabaseService

async def demo_basic_functionality():
    """Demonstrate basic functionality without external services"""
    
    print("🎭 Salon SMS Responder - Demo")
    print("=" * 50)
    
    # Test 1: Model Creation
    print("\n1. Testing Model Creation...")
    try:
        sms_request = SMSRequest(
            From="+1234567890",
            To="+0987654321",
            Body="Hi, I'd like to book a haircut for tomorrow",
            MessageSid="demo123",
            AccountSid="demo456"
        )
        print("✅ SMS Request created successfully")
        print(f"   From: {sms_request.From}")
        print(f"   Body: {sms_request.Body}")
        
        client_info = ClientInfo(
            id=1,
            name="John Doe",
            phone="+1234567890",
            email="john@example.com",
            total_appointments=5
        )
        print("✅ Client Info created successfully")
        print(f"   Name: {client_info.name}")
        print(f"   Total Appointments: {client_info.total_appointments}")
        
    except Exception as e:
        print(f"❌ Model creation failed: {e}")
        return False
    
    # Test 2: Service Initialization (with warnings for missing env vars)
    print("\n2. Testing Service Initialization...")
    
    services_status = {}
    
    # SMS Service
    try:
        sms_service = SMSService()
        services_status["sms"] = "✅ Available"
    except ValueError as e:
        services_status["sms"] = f"⚠️  Requires Twilio credentials: {str(e)[:50]}..."
    except Exception as e:
        services_status["sms"] = f"❌ Error: {str(e)[:50]}..."
    
    # LLM Service
    try:
        llm_service = LLMService()
        services_status["llm"] = "✅ Available"
    except ValueError as e:
        services_status["llm"] = f"⚠️  Requires OpenAI API key: {str(e)[:50]}..."
    except Exception as e:
        services_status["llm"] = f"❌ Error: {str(e)[:50]}..."
    
    # Database Service
    try:
        db_service = DatabaseService()
        services_status["database"] = "✅ Available"
    except Exception as e:
        services_status["database"] = f"⚠️  Database connection: {str(e)[:50]}..."
    
    for service, status in services_status.items():
        print(f"   {service.upper()}: {status}")
    
    # Test 3: Simulate SMS Processing
    print("\n3. Simulating SMS Processing...")
    
    print("📱 Incoming SMS:")
    print(f"   From: {sms_request.From}")
    print(f"   Message: {sms_request.Body}")
    
    # Simulate AI response generation
    print("\n🤖 AI Response Generation:")
    if "llm" in services_status and "Available" in services_status["llm"]:
        try:
            ai_response = await llm_service.generate_response(
                user_message=sms_request.Body,
                client_info=client_info,
                phone_number=sms_request.From
            )
            print(f"   Generated: {ai_response}")
        except Exception as e:
            print(f"   Error: {e}")
            ai_response = "Thank you for your message. Please call us directly for assistance."
    else:
        ai_response = "Thank you for your message. Please call us directly for assistance."
        print(f"   Fallback: {ai_response}")
    
    # Simulate SMS sending
    print("\n📤 SMS Response:")
    if "sms" in services_status and "Available" in services_status["sms"]:
        try:
            response_sent = await sms_service.send_sms(
                to=sms_request.From,
                message=ai_response
            )
            if response_sent:
                print("   ✅ SMS sent successfully")
            else:
                print("   ❌ SMS sending failed")
        except Exception as e:
            print(f"   Error: {e}")
    else:
        print("   ⚠️  SMS service not available (would send in production)")
    
    # Test 4: Create Response Object
    print("\n4. Creating Response Object...")
    try:
        response = SMSResponse(
            success=True,
            message="SMS processed successfully",
            ai_response=ai_response
        )
        print("✅ Response object created successfully")
        print(f"   Success: {response.success}")
        print(f"   Message: {response.message}")
        print(f"   AI Response: {response.ai_response}")
    except Exception as e:
        print(f"❌ Response creation failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Demo completed successfully!")
    print("\nSystem Status:")
    for service, status in services_status.items():
        print(f"   {service.upper()}: {status}")
    
    print("\nNext Steps:")
    print("1. Configure environment variables (see env.example)")
    print("2. Set up Twilio and OpenAI credentials")
    print("3. Configure database connection")
    print("4. Start the server: python -m python_sms_responder.main")
    print("5. Test with real SMS webhooks")
    
    return True

def main():
    """Main demo function"""
    try:
        success = asyncio.run(demo_basic_functionality())
        if success:
            print("\n✅ Demo completed successfully!")
            return 0
        else:
            print("\n❌ Demo failed!")
            return 1
    except Exception as e:
        print(f"\n❌ Demo error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 