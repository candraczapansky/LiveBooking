#!/usr/bin/env python3
"""
Test script to verify OpenAI API key connection
"""

import os
import sys
import asyncio

# Set the OpenAI API key
os.environ['OPENAI_API_KEY'] = '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'

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_llm_service():
    """Test the LLM service with the API key"""
    
    print("🧪 Testing OpenAI API Key Connection...")
    print("=" * 50)
    
    try:
        from python_sms_responder.llm_service import LLMService
        from python_sms_responder.models import ClientInfo
        
        print("✅ LLM Service imported successfully")
        
        # Initialize the service
        llm_service = LLMService()
        print("✅ LLM Service initialized successfully")
        
        # Test health check
        print("\n🔍 Testing Health Check...")
        health = await llm_service.check_health()
        print(f"Health Status: {health}")
        
        if health["status"] == "healthy":
            print("✅ LLM Service is healthy!")
        else:
            print(f"❌ LLM Service unhealthy: {health.get('error', 'Unknown error')}")
            return False
        
        # Test response generation
        print("\n🤖 Testing Response Generation...")
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
        
        print("✅ Response generated successfully!")
        print(f"Input: {test_message}")
        print(f"Output: {response}")
        
        # Test intent analysis
        print("\n🎯 Testing Intent Analysis...")
        intent_result = await llm_service.analyze_intent(test_message)
        print("✅ Intent analysis successful!")
        print(f"Intent: {intent_result.get('intent', 'unknown')}")
        print(f"Confidence: {intent_result.get('confidence', 0)}")
        print(f"Requires Human: {intent_result.get('requires_human', True)}")
        
        print("\n" + "=" * 50)
        print("🎉 All LLM tests passed! OpenAI API key is working correctly.")
        return True
        
    except Exception as e:
        print(f"❌ LLM Service test failed: {e}")
        return False

def main():
    """Main test function"""
    success = asyncio.run(test_llm_service())
    if success:
        print("\n✅ OpenAI API key is properly connected!")
        return 0
    else:
        print("\n❌ OpenAI API key connection failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 