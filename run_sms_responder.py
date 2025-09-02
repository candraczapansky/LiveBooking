#!/usr/bin/env python3

import os
import sys
import uvicorn

# Set environment variables (if not already set)
os.environ.setdefault("OPENAI_API_KEY", "your_openai_key_here")
os.environ.setdefault("TWILIO_ACCOUNT_SID", "your_twilio_sid_here")
os.environ.setdefault("TWILIO_AUTH_TOKEN", "your_twilio_token_here")
os.environ.setdefault("TWILIO_PHONE_NUMBER", "your_twilio_number_here")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:password@localhost:5432/salon_db")
os.environ.setdefault("ADMIN_TOKEN", "admin123")
os.environ.setdefault("BUSINESS_KNOWLEDGE_FILE", "business_knowledge.json")

# Add the python_sms_responder directory to the Python path
python_sms_responder_path = os.path.join(os.getcwd(), 'python_sms_responder')
sys.path.insert(0, python_sms_responder_path)

# Run the FastAPI app
if __name__ == "__main__":
    print("Starting SMS Responder service...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, app_dir=python_sms_responder_path)
