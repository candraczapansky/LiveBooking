#!/usr/bin/env python3
"""
Test script to verify SMS conversation flow with LLM
"""

import requests
import json
from datetime import datetime

def test_sms_webhook(message_body, from_phone="+15551234567"):
    """Test the SMS webhook endpoint"""
    
    # Simulate Twilio webhook data
    webhook_data = {
        "From": from_phone,
        "To": "+19187277348",  # Your Twilio number
        "Body": message_body,
        "MessageSid": f"TEST_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "AccountSid": "TEST_ACCOUNT",
        "NumMedia": "0"
    }
    
    try:
        # Send POST request to the webhook
        response = requests.post(
            "http://localhost:8000/webhook/sms",
            data=webhook_data,
            timeout=30
        )
        
        print(f"📱 Testing message: '{message_body}'")
        print(f"📤 From: {from_phone}")
        print(f"📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result.get('message', 'No message')}")
            print(f"🤖 AI Response: {result.get('ai_response', 'No AI response')}")
        else:
            print(f"❌ Error: {response.text}")
            
        print("-" * 50)
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        print("-" * 50)
        return False

def main():
    """Run conversation tests"""
    
    print("🧪 Testing SMS Conversation Flow with LLM")
    print("=" * 50)
    
    # Test cases
    test_cases = [
        "Hi there!",
        "What are your hours today?",
        "Do you offer haircuts?",
        "How much does a haircut cost?",
        "I'd like to book an appointment",
        "What services do you have?",
        "Are you open on Sundays?",
        "Can you tell me about your salon?",
        "I need a haircut and style",
        "What's your address?"
    ]
    
    success_count = 0
    total_count = len(test_cases)
    
    for i, test_message in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}/{total_count}")
        if test_sms_webhook(test_message):
            success_count += 1
    
    print(f"\n📊 Test Results: {success_count}/{total_count} successful")
    
    if success_count == total_count:
        print("🎉 All tests passed! SMS conversation flow is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the logs for details.")

if __name__ == "__main__":
    main()
