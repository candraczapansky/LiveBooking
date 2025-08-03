#!/usr/bin/env python3
"""
Simple test for conversation manager
"""

import os
import sys

# Set the OpenAI API key
os.environ['OPENAI_API_KEY'] = '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'

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from python_sms_responder.conversation_manager import ConversationManager

def test_conversation():
    """Test the conversation manager"""
    
    print("🧪 Testing Conversation Manager")
    print("=" * 50)
    
    # Initialize conversation manager
    cm = ConversationManager()
    
    # Test phone number
    phone_number = "+1234567890"
    
    # Test messages
    messages = [
        "Hi, I'd like to book an appointment",
        "haircut",
        "tomorrow",
        "John Smith"
    ]
    
    for i, message in enumerate(messages, 1):
        print(f"\n{i}. User: {message}")
        
        # Process message
        result = cm.process_message(phone_number, message)
        
        print(f"Response: {result['response']}")
        print(f"Step: {result['step']}")
        print(f"Requires Booking: {result.get('requires_booking', False)}")
        
        # Get conversation state
        state = cm.get_conversation_summary(phone_number)
        if state:
            print(f"State: {state}")
        
        print("-" * 30)
    
    print("\n✅ Conversation manager test completed!")

if __name__ == "__main__":
    test_conversation() 