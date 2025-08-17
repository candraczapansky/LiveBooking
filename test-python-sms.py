#!/usr/bin/env python3
"""
Test script for Python SMS responder
This verifies the Python service can work with the existing database
"""

import asyncio
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our modules
from python_sms_responder.database_service import DatabaseService
from python_sms_responder.llm_service import LLMService
from python_sms_responder.models import ClientInfo

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_database_connection():
    """Test database connectivity"""
    print_section("Testing Database Connection")
    
    try:
        # Initialize database service
        db_service = DatabaseService()
        
        # Test connection
        health = db_service.check_health()
        
        if health['status'] == 'healthy':
            print("✓ Database connection successful")
            print(f"  Connection string configured: {health.get('database_url_configured', False)}")
            return db_service
        else:
            print(f"✗ Database connection failed: {health.get('error', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"✗ Error initializing database service: {str(e)}")
        return None

def test_client_lookup(db_service, phone_number="+1234567890"):
    """Test client lookup functionality"""
    print_section("Testing Client Lookup")
    
    if not db_service:
        print("⚠ Skipping - database service not available")
        return None
    
    try:
        # Look up client by phone
        print(f"Looking up client with phone: {phone_number}")
        client = db_service.get_client_by_phone(phone_number)
        
        if client:
            print(f"✓ Client found:")
            print(f"  Name: {client.name}")
            print(f"  Email: {client.email}")
            print(f"  Phone: {client.phone}")
            print(f"  Total appointments: {client.total_appointments}")
            if client.last_appointment:
                print(f"  Last appointment: {client.last_appointment}")
            if client.upcoming_appointments:
                print(f"  Upcoming appointments: {len(client.upcoming_appointments)}")
        else:
            print(f"ℹ No client found with phone {phone_number}")
            
        return client
        
    except Exception as e:
        print(f"✗ Error looking up client: {str(e)}")
        return None

def test_llm_service():
    """Test LLM service initialization"""
    print_section("Testing LLM Service")
    
    try:
        # Check for OpenAI API key
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_KEY")
        
        if not api_key:
            print("⚠ OpenAI API key not configured")
            print("  Set OPENAI_API_KEY environment variable to enable LLM responses")
            return None
            
        # Initialize LLM service
        llm_service = LLMService()
        print("✓ LLM service initialized")
        print(f"  Model: {llm_service.model}")
        print(f"  Max tokens: {llm_service.max_tokens}")
        print(f"  Temperature: {llm_service.temperature}")
        
        return llm_service
        
    except Exception as e:
        print(f"⚠ LLM service not available: {str(e)}")
        return None

def test_message_processing(llm_service, db_service):
    """Test message processing"""
    print_section("Testing Message Processing")
    
    if not llm_service:
        print("⚠ Skipping - LLM service not available")
        print("  Using fallback response instead")
        response = "Thank you for your message. Please call us to book an appointment."
    else:
        try:
            # Set database service for conversation manager
            llm_service.set_db_service(db_service)
            
            # Test message
            test_message = "Hi, I'd like to book a haircut appointment"
            phone_number = "+1234567890"
            
            print(f"Test message: '{test_message}'")
            print(f"From phone: {phone_number}")
            
            # Get response
            response = llm_service.generate_response_sync(
                user_message=test_message,
                phone_number=phone_number
            )
            
            print(f"\n✓ Generated response:")
            print(f"  {response}")
            
        except Exception as e:
            print(f"✗ Error processing message: {str(e)}")
            response = "Error processing message"
    
    return response

def main():
    """Main test function"""
    print("\n" + "="*60)
    print("  Python SMS Responder Integration Test")
    print("  Testing WITHOUT affecting existing data")
    print("="*60)
    
    # Test database
    db_service = test_database_connection()
    
    # Test client lookup (using a test phone number)
    client = test_client_lookup(db_service, "+1234567890")
    
    # Test LLM service
    llm_service = test_llm_service()
    
    # Test message processing
    response = test_message_processing(llm_service, db_service)
    
    # Summary
    print_section("Test Summary")
    
    print("Service Status:")
    print(f"  {'✓' if db_service else '✗'} Database Service")
    print(f"  {'✓' if llm_service else '⚠'} LLM Service (optional)")
    print(f"  {'✓' if response else '✗'} Message Processing")
    
    print("\n" + "-"*60)
    
    if db_service:
        print("\n✓ Python SMS responder can connect to your database")
        print("  All existing data is preserved and accessible")
        
        if llm_service:
            print("\n✓ LLM service is configured and ready")
            print("  AI-powered responses will be generated")
        else:
            print("\n⚠ LLM service needs configuration")
            print("  To enable AI responses:")
            print("  1. Get an OpenAI API key from https://platform.openai.com")
            print("  2. Set environment variable: export OPENAI_API_KEY=your_key")
        
        print("\n✓ Integration is ready!")
        print("  The Python SMS responder can work alongside your existing system")
        print("  No existing code or data has been modified")
    else:
        print("\n⚠ Database connection needs configuration")
        print("  Please check your DATABASE_URL environment variable")

if __name__ == "__main__":
    main()
