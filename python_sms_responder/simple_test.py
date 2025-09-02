#!/usr/bin/env python3

import os
import json
import sys

# Mock the necessary classes to demonstrate the functionality
class ClientInfo:
    def __init__(self, id=None, name=None, phone=None, email=None):
        self.id = id
        self.name = name
        self.phone = phone
        self.email = email
        self.preferences = {}
        self.last_appointment = None
        self.upcoming_appointments = []
        self.total_appointments = 0

class BusinessKnowledge:
    def __init__(self):
        self.business_info = {
            "name": "Your Salon & Spa",
            "address": "123 Main Street, Anytown, USA",
            "phone": "(555) 123-4567",
            "hours": {
                "monday": "9AM-7PM",
                "tuesday": "9AM-7PM",
                "wednesday": "9AM-7PM",
                "thursday": "9AM-7PM",
                "friday": "9AM-7PM",
                "saturday": "9AM-7PM",
                "sunday": "10AM-5PM"
            }
        }
        
        self.services = {
            "hair": [
                {"name": "Women's Haircut", "price": "$45-65", "duration": 60},
                {"name": "Men's Haircut", "price": "$30-45", "duration": 30},
                {"name": "Hair Color", "price": "$85-150", "duration": 120},
                {"name": "Highlights", "price": "$95-200", "duration": 150}
            ],
            "skin": [
                {"name": "Express Facial", "price": "$45", "duration": 30},
                {"name": "Signature Facial", "price": "$85", "duration": 60}
            ],
            "nails": [
                {"name": "Manicure", "price": "$30", "duration": 30},
                {"name": "Pedicure", "price": "$45", "duration": 45}
            ]
        }
        
        self.faqs = [
            {
                "question": "How do I book an appointment?",
                "answer": "You can book an appointment by calling us, through our website, or by texting this number."
            },
            {
                "question": "What is your cancellation policy?",
                "answer": "We require 24 hours notice for cancellations."
            }
        ]
        
        self.promotions = [
            {
                "title": "New Client Special",
                "description": "15% off your first service with us.",
                "code": "NEWCLIENT15"
            }
        ]
    
    def get_knowledge_for_llm(self):
        """Format business knowledge for LLM prompts"""
        knowledge = []
        
        # Business info
        knowledge.append(f"# {self.business_info['name']} Information")
        knowledge.append(f"Address: {self.business_info['address']}")
        knowledge.append(f"Phone: {self.business_info['phone']}")
        knowledge.append("\n## Business Hours:")
        for day, hours in self.business_info['hours'].items():
            knowledge.append(f"{day.capitalize()}: {hours}")
        
        # Services
        knowledge.append("\n# Services")
        for category, service_list in self.services.items():
            knowledge.append(f"\n## {category.capitalize()} Services:")
            for service in service_list:
                knowledge.append(f"- {service['name']}: {service['price']} ({service['duration']} min)")
        
        # FAQs
        knowledge.append("\n# Frequently Asked Questions")
        for faq in self.faqs:
            knowledge.append(f"Q: {faq['question']}")
            knowledge.append(f"A: {faq['answer']}")
        
        # Promotions
        knowledge.append("\n# Current Promotions")
        for promo in self.promotions:
            knowledge.append(f"- {promo['title']}: {promo['description']}")
            if promo.get('code'):
                knowledge.append(f"  Use code: {promo['code']}")
        
        return "\n".join(knowledge)

class ConversationManager:
    def __init__(self):
        self.conversations = {}
    
    def get_conversation_summary(self, phone_number):
        return self.conversations.get(phone_number, {
            'step': 'greeting',
            'selected_service': None,
            'selected_date': None,
            'selected_time': None,
            'temp_data': {'messages': []}
        })

def simulate_llm_response(system_prompt, user_prompt):
    """Simulates a response from an LLM"""
    
    # Print prompts for demonstration
    print("\n=== System Prompt ===")
    print(system_prompt[:300] + "..." if len(system_prompt) > 300 else system_prompt)
    
    print("\n=== User Prompt ===")
    print(user_prompt[:300] + "..." if len(user_prompt) > 300 else user_prompt)
    
    # Prepare demo responses based on keywords in the user's message
    responses = {
        "hour": "We're open Monday to Saturday from 9AM to 7PM, and Sunday from 10AM to 5PM. How can I help you today?",
        "book": "I'd be happy to help you book an appointment! What service are you interested in?",
        "haircut": "Our haircuts start at $45 for women and $30 for men. Would you like to book an appointment?",
        "facial": "We offer Express Facials for $45 (30 minutes) and our Signature Facial for $85 (60 minutes). Would you like to schedule one?",
        "special": "Yes! We currently have a New Client Special: 15% off your first service with us. Use code NEWCLIENT15 when booking.",
        "cancel": "Our cancellation policy requires 24 hours notice to avoid any cancellation fees. Would you like to reschedule your appointment?",
        "address": "We're located at 123 Main Street, Anytown, USA. Is there anything else you'd like to know?",
        "time": "We have several appointment times available tomorrow. Would you prefer morning or afternoon?",
        "hi": "Hello there! Welcome to Your Salon & Spa. How may I assist you today?",
        "service": "We offer a variety of hair, skin, and nail services. Our most popular services include haircuts, color, facials, and manicures. What were you interested in?"
    }
    
    # Find a matching keyword or return a default response
    for keyword, response in responses.items():
        if keyword.lower() in user_prompt.lower():
            return response
    
    return "Thank you for your message! This is a friendly salon assistant. How can I help you with your beauty needs today?"

def test_sms_llm():
    """Test the SMS LLM functionality"""
    print("\n=== Testing SMS LLM Integration ===\n")
    
    # Create necessary components
    business_knowledge = BusinessKnowledge()
    conversation_manager = ConversationManager()
    
    # Create a test client
    client = ClientInfo(
        id=123,
        name="Test Client",
        phone="+1234567890",
        email="test@example.com"
    )
    
    # System prompt with business knowledge
    base_prompt = """You are an AI assistant for a professional beauty salon & spa. Your role is to help clients with inquiries via SMS, acting as a friendly, kind front desk person. 

Key responsibilities:
- Help clients book, reschedule, or cancel appointments
- Provide accurate information about services and pricing
- Answer questions about salon policies and hours
- Be friendly, professional, and conversational

Below is specific information about the business that you should use when responding to customers:
"""
    
    system_prompt = base_prompt + "\n\n" + business_knowledge.get_knowledge_for_llm()
    
    # Test scenarios
    test_scenarios = [
        {
            "title": "Business Hours Inquiry",
            "message": "What are your business hours?",
            "phone": "+1234567890"
        },
        {
            "title": "Service Pricing Inquiry",
            "message": "How much is a haircut?",
            "phone": "+1234567890"
        },
        {
            "title": "Appointment Booking",
            "message": "I'd like to book a haircut for tomorrow at 2pm",
            "phone": "+1234567890"
        },
        {
            "title": "Special Offers",
            "message": "Do you have any specials or discounts?",
            "phone": "+1234567890"
        },
        {
            "title": "General Greeting",
            "message": "Hi there!",
            "phone": "+1234567890"
        }
    ]
    
    # Process each scenario
    for i, scenario in enumerate(test_scenarios):
        print(f"\n\nScenario {i+1}: {scenario['title']}")
        print(f"User: {scenario['message']}")
        
        # Build user prompt (similar to _build_prompt in the full implementation)
        prompt_parts = []
        
        # Add client context
        prompt_parts.append(f"## Client Information:")
        prompt_parts.append(f"- Name: {client.name}")
        prompt_parts.append(f"- Phone: {client.phone}")
        prompt_parts.append(f"- Email: {client.email}")
        
        # Add conversation context
        conversation_summary = conversation_manager.get_conversation_summary(scenario['phone'])
        prompt_parts.append(f"\n## Conversation Context:")
        prompt_parts.append(f"- Current step: {conversation_summary['step']}")
        
        # Add user message
        prompt_parts.append(f"\n## User Message: {scenario['message']}")
        prompt_parts.append(f"\nPlease provide a helpful, friendly response as a salon front desk person.")
        
        user_prompt = "\n".join(prompt_parts)
        
        # Get simulated response
        response = simulate_llm_response(system_prompt, user_prompt)
        
        print(f"AI: {response}")
        print("-" * 50)
    
    print("\n=== Test Completed ===")

if __name__ == "__main__":
    test_sms_llm()
