#!/usr/bin/env python3
"""
Test LLM service and write logs to file
"""

import sys
import os
import logging
from datetime import datetime

# Set up logging to file
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('llm-test.log'),
        logging.StreamHandler()
    ]
)

sys.path.append('python_sms_responder')

def test_llm_with_logging():
    """Test the LLM service with detailed logging"""
    
    logging.info("🧪 Starting LLM Service Test")
    logging.info("=" * 50)
    
    try:
        # Test 1: Check environment variables
        logging.info("🔍 [TEST 1] Checking environment variables...")
        openai_key = os.getenv("OPENAI_API_KEY")
        logging.info(f"🔍 OPENAI_API_KEY: {'✅ SET' if openai_key else '❌ MISSING'}")
        if openai_key:
            logging.info(f"🔍 API Key length: {len(openai_key)}")
            logging.info(f"🔍 API Key starts with: {openai_key[:10]}...")
        
        # Test 2: Import and initialize LLM Service
        logging.info("🔍 [TEST 2] Importing LLM Service...")
        from llm_service import LLMService
        logging.info("✅ LLM Service imported successfully!")
        
        logging.info("🔍 [TEST 3] Initializing LLM Service...")
        llm_service = LLMService()
        logging.info("✅ LLM Service initialized successfully!")
        
        # Test 4: Test conversation manager
        logging.info("🔍 [TEST 4] Testing conversation manager...")
        from conversation_manager import ConversationManager
        conversation_manager = ConversationManager()
        logging.info("✅ Conversation manager created successfully!")
        
        # Test 5: Set up the conversation manager in LLM service
        logging.info("🔍 [TEST 5] Setting up conversation manager in LLM service...")
        # Create a mock database service (None for now)
        llm_service.set_db_service(None)
        logging.info("✅ Conversation manager set in LLM service!")
        
        # Test 6: Test a simple message
        logging.info("🔍 [TEST 6] Testing simple message...")
        test_message = "Hi there! How are you today?"
        test_phone = "+15551234567"
        
        logging.info(f"📱 Testing message: '{test_message}'")
        logging.info(f"📱 From phone: {test_phone}")
        
        # Process through conversation manager first
        conv_result = conversation_manager.process_message(test_phone, test_message)
        logging.info(f"🔍 Conversation result: {conv_result}")
        
        # Then through LLM service
        logging.info("🔍 [TEST 7] Calling LLM service...")
        response = llm_service.generate_response_sync(
            user_message=test_message,
            phone_number=test_phone
        )
        
        logging.info(f"🤖 LLM Response: {response}")
        logging.info("✅ Test completed successfully!")
        
        return True
        
    except Exception as e:
        logging.error(f"❌ Test failed with error: {str(e)}")
        logging.error(f"❌ Error type: {type(e).__name__}")
        import traceback
        logging.error(f"❌ Full traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    success = test_llm_with_logging()
    if success:
        print("✅ Test completed successfully! Check llm-test.log for details.")
    else:
        print("❌ Test failed! Check llm-test.log for details.")
