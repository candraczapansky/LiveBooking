#!/usr/bin/env python3
"""
Simple test to verify Python SMS responder works
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Set environment variables for testing
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/salon_db"
os.environ["TWILIO_ACCOUNT_SID"] = "test_sid"
os.environ["TWILIO_AUTH_TOKEN"] = "test_token"
os.environ["TWILIO_PHONE_NUMBER"] = "+1234567890"

print("Testing Python SMS Responder...")
print("=" * 50)

# Test 1: Import modules
try:
    from python_sms_responder.models import SMSRequest, ClientInfo
    print("✓ Models imported successfully")
except Exception as e:
    print(f"✗ Error importing models: {e}")
    sys.exit(1)

# Test 2: Initialize services
try:
    from python_sms_responder.database_service import DatabaseService
    db_service = DatabaseService()
    print("✓ Database service initialized")
except Exception as e:
    print(f"⚠ Database service not available: {e}")
    db_service = None

try:
    from python_sms_responder.llm_service import LLMService
    llm_service = LLMService()
    print("✓ LLM service initialized")
except Exception as e:
    print(f"⚠ LLM service not available: {e}")
    llm_service = None

try:
    from python_sms_responder.sms_service import SMSService
    sms_service = SMSService()
    print("✓ SMS service initialized")
except Exception as e:
    print(f"⚠ SMS service not available: {e}")
    sms_service = None

# Test 3: Test basic functionality
print("\nTesting basic message processing...")

if llm_service and db_service:
    llm_service.set_db_service(db_service)
    
    # Test message processing
    test_message = "Hi, I'd like to book an appointment"
    phone = "+1234567890"
    
    print(f"Test message: '{test_message}'")
    print(f"From phone: {phone}")
    
    try:
        response = llm_service.generate_response_sync(
            user_message=test_message,
            phone_number=phone
        )
        print(f"Response: {response[:100]}...")
        print("✓ Message processing works")
    except Exception as e:
        print(f"✗ Error processing message: {e}")
else:
    print("⚠ Skipping message processing (services not available)")

# Test 4: Start the web service
print("\nAttempting to start web service...")
try:
    from python_sms_responder.main import app
    import uvicorn
    
    print("✓ FastAPI app created")
    print("\nStarting server on http://localhost:8000")
    print("Press Ctrl+C to stop")
    
    # Start the server
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    
except KeyboardInterrupt:
    print("\nServer stopped by user")
except Exception as e:
    print(f"✗ Error starting server: {e}")
    import traceback
    traceback.print_exc()







