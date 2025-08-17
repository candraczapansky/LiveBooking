#!/usr/bin/env python3
"""
Find the correct webhook URL for Twilio
"""

import requests
import subprocess
import os

def check_urls():
    """Check different possible webhook URLs"""
    
    base_urls = [
        "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev",
        "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev:8000",
        "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api",
        "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/backend",
        "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook"
    ]
    
    print("🔍 Checking possible webhook URLs...")
    print("=" * 50)
    
    for base_url in base_urls:
        try:
            # Test health endpoint
            health_url = f"{base_url}/health"
            response = requests.get(health_url, timeout=5)
            
            if response.status_code == 200:
                print(f"✅ {health_url} - Working (Status: {response.status_code})")
                try:
                    data = response.json()
                    print(f"   Response: {data.get('message', 'No message')}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ {health_url} - Failed (Status: {response.status_code})")
                
        except Exception as e:
            print(f"❌ {health_url} - Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Testing webhook endpoints...")
    print("=" * 50)
    
    # Test the working base URL
    working_base = "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev"
    
    webhook_urls = [
        f"{working_base}/webhook/voice",
        f"{working_base}/api/webhook/voice",
        f"{working_base}/backend/webhook/voice",
        f"{working_base}:8000/webhook/voice"
    ]
    
    for webhook_url in webhook_urls:
        try:
            test_data = {
                "CallSid": "test123",
                "From": "+1234567890",
                "To": "+19187277348",
                "AccountSid": "test",
                "CallStatus": "ringing"
            }
            
            response = requests.post(webhook_url, data=test_data, timeout=10)
            
            if response.status_code == 200:
                content = response.text
                if "<?xml" in content and "<Response>" in content:
                    print(f"✅ {webhook_url} - Working (TwiML Response)")
                    print(f"   Content: {content[:200]}...")
                else:
                    print(f"⚠️  {webhook_url} - Working but not TwiML (Status: {response.status_code})")
                    print(f"   Content: {content[:200]}...")
            else:
                print(f"❌ {webhook_url} - Failed (Status: {response.status_code})")
                
        except Exception as e:
            print(f"❌ {webhook_url} - Error: {e}")

def get_replit_info():
    """Get Replit environment information"""
    print("\n🔧 Replit Environment Info")
    print("=" * 30)
    
    # Check if we're in Replit
    if os.path.exists('/home/runner'):
        print("✅ Running in Replit environment")
        
        # Get the Replit URL
        try:
            result = subprocess.run(['echo', '$REPL_SLUG'], capture_output=True, text=True)
            repl_slug = result.stdout.strip()
            if repl_slug:
                print(f"   REPL_SLUG: {repl_slug}")
        except:
            pass
        
        # Check for environment variables
        repl_url = os.getenv('REPL_URL')
        if repl_url:
            print(f"   REPL_URL: {repl_url}")
        
        # Check for the actual domain
        try:
            result = subprocess.run(['hostname'], capture_output=True, text=True)
            hostname = result.stdout.strip()
            print(f"   Hostname: {hostname}")
        except:
            pass
    
    else:
        print("❌ Not running in Replit environment")

def suggest_fix():
    """Suggest the correct webhook URL"""
    print("\n🎯 Suggested Fix")
    print("=" * 30)
    
    print("Based on the tests, you should use one of these URLs:")
    print()
    print("1. If the backend is running on port 8000:")
    print("   Voice Webhook: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev:8000/webhook/voice")
    print("   Status Callback: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev:8000/webhook/voice/status")
    print()
    print("2. If the backend is running on a different path:")
    print("   Voice Webhook: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/voice")
    print("   Status Callback: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/voice/status")
    print()
    print("3. Update your Twilio phone number configuration with the working URL")

if __name__ == "__main__":
    print("🔍 Webhook URL Finder")
    print("=" * 50)
    
    get_replit_info()
    check_urls()
    suggest_fix() 