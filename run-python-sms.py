#!/usr/bin/env python3
"""
Direct runner for Python SMS responder
"""

import os
import sys

# Set environment variables
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/salon_db")
os.environ.setdefault("TWILIO_ACCOUNT_SID", "test_sid")
os.environ.setdefault("TWILIO_AUTH_TOKEN", "test_token")
os.environ.setdefault("TWILIO_PHONE_NUMBER", "+1234567890")

# Check for OpenAI key
if not os.getenv("OPENAI_API_KEY"):
    print("Warning: OPENAI_API_KEY not set - using fallback responses")
    os.environ["OPENAI_API_KEY"] = "test_key"

print("Starting Python SMS Responder on port 8000...")
print("=" * 50)

try:
    # Import and run FastAPI app
    from python_sms_responder.main import app
    import uvicorn
    
    # Run the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False
    )
except Exception as e:
    print(f"Error starting server: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)







