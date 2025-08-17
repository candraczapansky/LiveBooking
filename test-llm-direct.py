#!/usr/bin/env python3
"""
Direct test of LLM service to see detailed logs
"""

import sys
import os
sys.path.append('python_sms_responder')

from llm_service import LLMService
from conversation_manager import ConversationManager

def test_llm_directly():
    """Test the LLM service directly"""
    
    print("🧪 Testing LLM Service Directly")
    print("=" * 50)
    
    try:
        # Test 1: Initialize LLM Service
        print("\n🔍 [TEST 1] Initializing LLM Service...")
        llm_service = LLMService()
        print("✅ LLM Service initialized successfully!")
        
        # Test 2: Test conversation manager
        print("\n🔍 [TEST 2] Testing conversation manager...")
        conversation_manager = ConversationManager()
        print("✅ Conversation manager created successfully!")
        
        # Test 3: Test a simple message
        print("\n🔍 [TEST 3] Testing simple message...")
        test_message = "Hi there! How are you today?"
        test_phone = "+15551234567"
        
        print(f"📱 Testing message: '{test_message}'")
        print(f"📱 From phone: {test_phone}")
        
        # Process through conversation manager first
        conv_result = conversation_manager.process_message(test_phone, test_message)
        print(f"🔍 Conversation result: {conv_result}")
        
        # Then through LLM service
        response = llm_service.generate_response_sync(
            user_message=test_message,
            phone_number=test_phone
        )
        
        print(f"🤖 LLM Response: {response}")
        print("✅ Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_llm_directly()
