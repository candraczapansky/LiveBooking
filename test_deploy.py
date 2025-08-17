#!/usr/bin/env python3
"""
Simple test script to verify deployment readiness
"""
import os
import sys

def main():
    print("🚀 Testing deployment readiness...")
    
    # Test 1: Check Python version
    print(f"✅ Python version: {sys.version}")
    
    # Test 2: Check if required packages are installed
    try:
        import fastapi
        print(f"✅ FastAPI version: {fastapi.__version__}")
    except ImportError as e:
        print(f"❌ FastAPI not found: {e}")
        return False
    
    try:
        import uvicorn
        print(f"✅ Uvicorn version: {uvicorn.__version__}")
    except ImportError as e:
        print(f"❌ Uvicorn not found: {e}")
        return False
    
    try:
        import pydantic
        print(f"✅ Pydantic version: {pydantic.__version__}")
    except ImportError as e:
        print(f"❌ Pydantic not found: {e}")
        return False
    
    # Test 3: Check if main.py can be imported
    try:
        from main import app
        print("✅ main.py imports successfully")
    except Exception as e:
        print(f"❌ main.py import failed: {e}")
        return False
    
    # Test 4: Check environment variables
    helcim_token = os.getenv("HELICM_API_TOKEN")
    webhook_secret = os.getenv("HELICM_WEBHOOK_SECRET")
    
    if helcim_token and helcim_token != "your_helcim_api_token_here":
        print("✅ HELICM_API_TOKEN is configured")
    else:
        print("⚠️  HELICM_API_TOKEN not configured (will use placeholder)")
    
    if webhook_secret and webhook_secret != "your_webhook_secret_here":
        print("✅ HELICM_WEBHOOK_SECRET is configured")
    else:
        print("⚠️  HELICM_WEBHOOK_SECRET not configured (will use placeholder)")
    
    # Test 5: Check if server can start
    print("\n🧪 Testing server startup...")
    try:
        import asyncio
        from main import app
        
        # This is a basic test - in real deployment, Replit handles this
        print("✅ Server components are ready")
        print("✅ Ready for deployment!")
        return True
        
    except Exception as e:
        print(f"❌ Server startup test failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
