#!/usr/bin/env python3
"""
Simple startup script for Python SMS responder with better error handling
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        # Load environment variables
        load_dotenv()
        
        # Set default database URL if not configured
        if not os.getenv("DATABASE_URL"):
            # Use the same database as the TypeScript server
            os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/salon_db"
            logger.info("Using default database URL")
        
        # Check for OpenAI API key (optional)
        if not os.getenv("OPENAI_API_KEY"):
            logger.warning("OPENAI_API_KEY not set - LLM responses will not be available")
            logger.info("The service will still work with fallback responses")
        
        # Check for Twilio credentials (optional for local testing)
        if not os.getenv("TWILIO_ACCOUNT_SID"):
            logger.warning("Twilio credentials not configured")
            logger.info("SMS sending will be simulated in test mode")
            # Set dummy values for testing
            os.environ["TWILIO_ACCOUNT_SID"] = "test_account"
            os.environ["TWILIO_AUTH_TOKEN"] = "test_token"  
            os.environ["TWILIO_PHONE_NUMBER"] = "+1234567890"
        
        logger.info("Starting Python SMS Responder Service...")
        logger.info(f"Database URL: {os.getenv('DATABASE_URL')[:50]}...")
        
        # Import and run the FastAPI app
        import uvicorn
        from python_sms_responder.main import app
        
        # Run the server
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.info("Installing required packages...")
        os.system("pip install -q fastapi uvicorn python-dotenv psycopg2-binary openai twilio pydantic python-multipart")
        logger.info("Please run the script again")
        sys.exit(1)
        
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()







