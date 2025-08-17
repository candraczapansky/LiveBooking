#!/usr/bin/env python3
"""
Startup script for the new clean payment processing server.
This replaces the old tangled payment system with a clean, robust foundation.
"""

import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables from payment.env
env_file = "payment.env"
if os.path.exists(env_file):
    load_dotenv(env_file)
    print(f"✅ Loaded environment from {env_file}")
else:
    print(f"⚠️  {env_file} not found, using system environment variables")

if __name__ == "__main__":
    print("🚀 Starting Clean Payment Processing Server...")
    print("💰 This replaces the old tangled payment system")
    print("🔒 Built with security-first webhook verification")
    print("📱 Ready for Helcim Smart Terminal integration")
    
    # Check if required environment variables are set
    helcim_token = os.getenv("HELICM_API_TOKEN")
    webhook_secret = os.getenv("HELICM_WEBHOOK_SECRET")
    
    if not helcim_token:
        print("⚠️  HELICM_API_TOKEN not set - payments will be rejected")
    else:
        print("✅ HELICM_API_TOKEN configured")
        
    if not webhook_secret:
        print("⚠️  HELICM_WEBHOOK_SECRET not set - webhooks will be rejected")
    else:
        print("✅ HELICM_WEBHOOK_SECRET configured")
    
    print("")
    
    # Start the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
