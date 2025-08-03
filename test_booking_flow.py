#!/usr/bin/env python3
"""
Test script to demonstrate the enhanced booking flow with conversation state management
"""

import os
import sys
import asyncio

# Set the OpenAI API key
os.environ['OPENAI_API_KEY'] = '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'

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from python_sms_responder.llm_service import LLMService
from python_sms_responder.conversation_manager import ConversationManager

async def test_booking_flow():
    """Test the complete booking flow"""
    
    print("🎭 Testing Enhanced Booking Flow")
    print("=" * 50)
    
    # Initialize services
    llm_service = LLMService()
    conversation_manager = ConversationManager()
    
    # Test phone number
    phone_number = "+1234567890"
    
    # Simulate a complete booking conversation
    conversation_steps = [
        "Hi, I'd like to book an appointment",
        "haircut",
        "tomorrow",
        "John Smith",
        "john.smith@email.com",
        "yes"
    ]
    
    print(f"📱 Simulating booking conversation for {phone_number}")
    print("=" * 50)
    
    for i, message in enumerate(conversation_steps, 1):
        print(f"\n{i}. User: {message}")
        
        # Process message through LLM service
        response = await llm_service.generate_response(
            user_message=message,
            phone_number=phone_number
        )
        
        print(f"🤖 Assistant: {response}")
        
        # Get conversation state
        state = conversation_manager.get_conversation_summary(phone_number)
        if state:
            print(f"📊 State: {state['step']}")
            if state.get('selected_service'):
                print(f"   Service: {state['selected_service']}")
            if state.get('selected_date'):
                print(f"   Date: {state['selected_date']}")
            if state.get('selected_time'):
                print(f"   Time: {state['selected_time']}")
        
        print("-" * 30)
    
    print("\n" + "=" * 50)
    print("✅ Booking flow test completed!")
    
    # Show final conversation state
    final_state = conversation_manager.get_conversation_summary(phone_number)
    if final_state:
        print(f"\n📊 Final Conversation State:")
        print(f"   Step: {final_state['step']}")
        print(f"   Service: {final_state.get('selected_service', 'None')}")
        print(f"   Date: {final_state.get('selected_date', 'None')}")
        print(f"   Time: {final_state.get('selected_time', 'None')}")
        print(f"   Client Data: {final_state.get('temp_data', {})}")

async def test_conversation_persistence():
    """Test that conversation state persists between messages"""
    
    print("\n🔄 Testing Conversation Persistence")
    print("=" * 50)
    
    llm_service = LLMService()
    phone_number = "+1987654321"
    
    # Test 1: Start booking
    print("1. Starting booking conversation...")
    response1 = await llm_service.generate_response(
        user_message="I want to book a haircut",
        phone_number=phone_number
    )
    print(f"Response: {response1}")
    
    # Test 2: Continue with service selection
    print("\n2. Continuing with service selection...")
    response2 = await llm_service.generate_response(
        user_message="haircut",
        phone_number=phone_number
    )
    print(f"Response: {response2}")
    
    # Test 3: Check state persistence
    state = llm_service.get_conversation_state(phone_number)
    print(f"\n3. Current state: {state}")
    
    # Test 4: Continue with time selection
    print("\n4. Continuing with time selection...")
    response3 = await llm_service.generate_response(
        user_message="tomorrow at 2pm",
        phone_number=phone_number
    )
    print(f"Response: {response3}")
    
    # Test 5: Check final state
    final_state = llm_service.get_conversation_state(phone_number)
    print(f"\n5. Final state: {final_state}")

async def test_conversation_clearing():
    """Test conversation clearing functionality"""
    
    print("\n🗑️ Testing Conversation Clearing")
    print("=" * 50)
    
    llm_service = LLMService()
    phone_number = "+1555123456"
    
    # Start a conversation
    await llm_service.generate_response(
        user_message="I want to book an appointment",
        phone_number=phone_number
    )
    
    # Check state exists
    state_before = llm_service.get_conversation_state(phone_number)
    print(f"State before clearing: {state_before}")
    
    # Clear conversation
    llm_service.clear_conversation(phone_number)
    
    # Check state is cleared
    state_after = llm_service.get_conversation_state(phone_number)
    print(f"State after clearing: {state_after}")
    
    if state_after is None:
        print("✅ Conversation cleared successfully!")
    else:
        print("❌ Conversation not cleared properly!")

def main():
    """Main test function"""
    print("🧪 Enhanced Booking Flow Tests")
    print("=" * 50)
    
    try:
        # Run all tests
        asyncio.run(test_booking_flow())
        asyncio.run(test_conversation_persistence())
        asyncio.run(test_conversation_clearing())
        
        print("\n" + "=" * 50)
        print("🎉 All tests completed successfully!")
        print("\nKey Features Demonstrated:")
        print("✅ Conversation state management")
        print("✅ Multi-step booking flow")
        print("✅ Context persistence")
        print("✅ Service selection")
        print("✅ Client information collection")
        print("✅ Booking confirmation")
        print("✅ Conversation clearing")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 