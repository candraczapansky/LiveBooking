#!/usr/bin/env python3
"""
Expose the FastAPI server to the internet for Twilio webhooks
"""

import subprocess
import time
import requests
import os

def check_ngrok():
    """Check if ngrok is available"""
    try:
        result = subprocess.run(['ngrok', 'version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ ngrok is available")
            return True
        else:
            print("❌ ngrok is not available")
            return False
    except FileNotFoundError:
        print("❌ ngrok is not installed")
        return False

def expose_with_ngrok():
    """Expose the server using ngrok"""
    print("🚀 Exposing server with ngrok...")
    
    try:
        # Start ngrok in the background
        process = subprocess.Popen(
            ['ngrok', 'http', '8000'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait a moment for ngrok to start
        time.sleep(3)
        
        # Get the ngrok URL
        try:
            response = requests.get('http://localhost:4040/api/tunnels')
            if response.status_code == 200:
                tunnels = response.json()['tunnels']
                if tunnels:
                    ngrok_url = tunnels[0]['public_url']
                    print(f"✅ Server exposed at: {ngrok_url}")
                    return ngrok_url
        except Exception as e:
            print(f"❌ Error getting ngrok URL: {e}")
        
        return None
        
    except Exception as e:
        print(f"❌ Error starting ngrok: {e}")
        return None

def create_webhook_config(ngrok_url):
    """Create webhook configuration for Twilio"""
    if not ngrok_url:
        print("❌ No ngrok URL available")
        return
    
    print("\n📞 Twilio Webhook Configuration")
    print("=" * 40)
    print(f"Use these URLs in your Twilio phone number configuration:")
    print()
    print("Voice Webhook URL:")
    print(f"  {ngrok_url}/webhook/voice")
    print()
    print("Status Callback URL:")
    print(f"  {ngrok_url}/webhook/voice/status")
    print()
    print("Instructions:")
    print("1. Go to https://console.twilio.com")
    print("2. Navigate to Phone Numbers → Manage → Active numbers")
    print("3. Click on your phone number: +19187277348")
    print("4. Set Voice Webhook URL to the URL above")
    print("5. Set Status Callback URL to the URL above")
    print("6. Save the configuration")
    print("7. Test by calling your phone number")

def test_webhook(ngrok_url):
    """Test the webhook through ngrok"""
    if not ngrok_url:
        return
    
    print(f"\n🧪 Testing webhook through ngrok...")
    
    try:
        test_data = {
            "CallSid": "test123",
            "From": "+1234567890",
            "To": "+19187277348",
            "AccountSid": "test",
            "CallStatus": "ringing"
        }
        
        response = requests.post(f"{ngrok_url}/webhook/voice", data=test_data, timeout=10)
        
        if response.status_code == 200:
            content = response.text
            if "<?xml" in content and "<Response>" in content:
                print("✅ Webhook is working through ngrok!")
                print(f"   Response: {content[:200]}...")
            else:
                print("⚠️  Webhook responded but not with TwiML")
                print(f"   Response: {content[:200]}...")
        else:
            print(f"❌ Webhook failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing webhook: {e}")

def main():
    """Main function"""
    print("🌐 Server Exposure Tool")
    print("=" * 40)
    
    # Check if server is running
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ FastAPI server is running on port 8000")
        else:
            print("❌ FastAPI server is not responding")
            return
    except Exception as e:
        print("❌ FastAPI server is not running")
        print("   Start it with: python -m python_sms_responder.main")
        return
    
    # Check ngrok
    if not check_ngrok():
        print("\n📋 Alternative Solutions:")
        print("1. Install ngrok: https://ngrok.com/download")
        print("2. Use a different tunneling service")
        print("3. Deploy to a cloud service (Heroku, Railway, etc.)")
        return
    
    # Expose server
    ngrok_url = expose_with_ngrok()
    
    if ngrok_url:
        # Create webhook configuration
        create_webhook_config(ngrok_url)
        
        # Test the webhook
        test_webhook(ngrok_url)
        
        print(f"\n🎉 Your server is now accessible at: {ngrok_url}")
        print("   Update your Twilio webhook URLs and test your phone number!")
        
        # Keep the script running
        print("\n⏳ Keeping ngrok running... (Press Ctrl+C to stop)")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping ngrok...")
    else:
        print("❌ Failed to expose server")

if __name__ == "__main__":
    main() 