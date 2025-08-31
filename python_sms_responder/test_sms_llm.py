#!/usr/bin/env python3
import os
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services - adjust import path as needed
from llm_service import LLMService
from business_knowledge import BusinessKnowledge
from models import ClientInfo

async def test_sms_llm_responses():
    """Test LLM responses with various scenarios"""
    print("\n=== Testing SMS LLM Responses ===\n")
    
    # Initialize services
    llm_service = LLMService()
    business_knowledge = BusinessKnowledge()
    
    # Create a sample client
    client = ClientInfo(
        id=123,
        name="Test Client",
        phone="+1234567890",
        email="test@example.com"
    )
    
    # Define test scenarios
    test_scenarios = [
        {
            "title": "Business Hours Inquiry",
            "message": "What are your business hours?",
            "client": client,
            "phone": "+1234567890"
        },
        {
            "title": "Service Pricing Inquiry",
            "message": "How much is a haircut?",
            "client": client,
            "phone": "+1234567890"
        },
        {
            "title": "Appointment Booking",
            "message": "I'd like to book a haircut for tomorrow at 2pm",
            "client": client,
            "phone": "+1234567890"
        },
        {
            "title": "Service Availability",
            "message": "Do you offer balayage services?",
            "client": client,
            "phone": "+1234567890"
        },
        {
            "title": "Current Promotions",
            "message": "Are there any current deals or specials?",
            "client": client,
            "phone": "+1234567890"
        },
        {
            "title": "General Greeting",
            "message": "Hi there!",
            "client": client,
            "phone": "+1234567890"
        },
        {
            "title": "Multi-turn Conversation",
            "message": "What is your cancellation policy?",
            "client": client,
            "phone": "+9876543210"  # Different number for different conversation
        }
    ]
    
    # Test each scenario
    for i, scenario in enumerate(test_scenarios):
        print(f"\nScenario {i+1}: {scenario['title']}")
        print(f"User: {scenario['message']}")
        
        response = await llm_service.generate_response(
            user_message=scenario['message'],
            client_info=scenario['client'],
            phone_number=scenario['phone']
        )
        
        print(f"AI: {response}\n")
        print("-" * 50)
    
    # Test conversation memory with follow-up message
    print("\nTesting conversation memory - follow-up message:")
    follow_up_message = "What about if I need to change my appointment last minute?"
    print(f"User: {follow_up_message}")
    
    response = await llm_service.generate_response(
        user_message=follow_up_message,
        client_info=client,
        phone_number="+9876543210"  # Same as last multi-turn conversation
    )
    
    print(f"AI: {response}\n")
    print("=" * 50)
    print("\nTest completed!\n")

if __name__ == "__main__":
    asyncio.run(test_sms_llm_responses())
