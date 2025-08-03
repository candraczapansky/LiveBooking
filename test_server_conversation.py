#!/usr/bin/env python3
"""
Test conversation manager in server context
"""

import os
import sys

# Set the OpenAI API key
os.environ['OPENAI_API_KEY'] = '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'

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from python_sms_responder.llm_service import LLMService

def test_llm_service():
    """Test the LLM service with conversation manager"""
    
    print("🧪 Testing LLM Service with Conversation Manager")
    print("=" * 50)
    
    # Initialize LLM service
    llm_service = LLMService()
    
    # Test phone number
    phone_number = "+1234567890"
    
    # Test messages
    messages = [
        "Hi, I'd like to book an appointment",
        "haircut",
        "tomorrow"
    ]
    
    for i, message in enumerate(messages, 1):
        print(f"\n{i}. User: {message}")
        
        # Process message through LLM service
        response = llm_service.generate_response_sync(
            user_message=message,
            phone_number=phone_number
        )
        
        print(f"Response: {response}")
        
        # Get conversation state
        state = llm_service.get_conversation_state(phone_number)
        if state:
            print(f"State: {state}")
        
        print("-" * 30)
    
    print("\n✅ LLM service test completed!")

if __name__ == "__main__":
    test_llm_service() 