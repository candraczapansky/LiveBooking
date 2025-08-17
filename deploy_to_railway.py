#!/usr/bin/env python3
"""
Deployment helper for Railway
"""

import os
import subprocess
import requests

def check_railway_cli():
    """Check if Railway CLI is installed"""
    try:
        result = subprocess.run(['railway', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Railway CLI is installed")
            return True
        else:
            print("❌ Railway CLI is not working")
            return False
    except FileNotFoundError:
        print("❌ Railway CLI is not installed")
        return False

def install_railway_cli():
    """Install Railway CLI"""
    print("📦 Installing Railway CLI...")
    try:
        subprocess.run(['npm', 'install', '-g', '@railway/cli'], check=True)
        print("✅ Railway CLI installed successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to install Railway CLI: {e}")
        return False

def create_railway_config():
    """Create Railway configuration"""
    print("🔧 Creating Railway configuration...")
    
    # Create railway.json if it doesn't exist
    if not os.path.exists('railway.json'):
        railway_config = {
            "build": {
                "builder": "nixpacks"
            },
            "deploy": {
                "startCommand": "uvicorn python_sms_responder.main:app --host 0.0.0.0 --port $PORT",
                "restartPolicyType": "ON_FAILURE",
                "restartPolicyMaxRetries": 10
            }
        }
        
        import json
        with open('railway.json', 'w') as f:
            json.dump(railway_config, f, indent=2)
        print("✅ Created railway.json")
    
    # Create .env.example
    env_example = """# Railway Environment Variables
# Copy this to your Railway project environment variables

# Required
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+19187277348

# Optional (for AI responses)
OPENAI_API_KEY=your_openai_api_key_here
"""
    
    with open('.env.example', 'w') as f:
        f.write(env_example)
    print("✅ Created .env.example")

def deploy_to_railway():
    """Deploy to Railway"""
    print("🚀 Deploying to Railway...")
    
    try:
        # Login to Railway
        print("🔐 Logging in to Railway...")
        subprocess.run(['railway', 'login'], check=True)
        
        # Initialize Railway project
        print("📁 Initializing Railway project...")
        subprocess.run(['railway', 'init'], check=True)
        
        # Deploy
        print("🚀 Deploying...")
        subprocess.run(['railway', 'deploy'], check=True)
        
        print("✅ Deployment successful!")
        return True
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        return False

def get_railway_url():
    """Get the Railway URL"""
    try:
        result = subprocess.run(['railway', 'status'], capture_output=True, text=True)
        if result.returncode == 0:
            # Parse the output to get the URL
            output = result.stdout
            if 'https://' in output:
                url = output.split('https://')[1].split()[0]
                return f"https://{url}"
        return None
    except Exception as e:
        print(f"❌ Error getting Railway URL: {e}")
        return None

def update_twilio_webhooks(railway_url):
    """Provide instructions for updating Twilio webhooks"""
    if not railway_url:
        print("❌ Could not get Railway URL")
        return
    
    print("\n📞 Twilio Webhook Configuration")
    print("=" * 40)
    print(f"Use these URLs in your Twilio phone number configuration:")
    print()
    print("Voice Webhook URL:")
    print(f"  {railway_url}/webhook/voice")
    print()
    print("Status Callback URL:")
    print(f"  {railway_url}/webhook/voice/status")
    print()
    print("Instructions:")
    print("1. Go to https://console.twilio.com")
    print("2. Navigate to Phone Numbers → Manage → Active numbers")
    print("3. Click on your phone number: +19187277348")
    print("4. Set Voice Webhook URL to the URL above")
    print("5. Set Status Callback URL to the URL above")
    print("6. Save the configuration")
    print("7. Test by calling your phone number")

def main():
    """Main deployment function"""
    print("🚀 Railway Deployment Helper")
    print("=" * 40)
    
    # Check if Railway CLI is installed
    if not check_railway_cli():
        print("\n📦 Installing Railway CLI...")
        if not install_railway_cli():
            print("❌ Failed to install Railway CLI")
            print("Please install manually: npm install -g @railway/cli")
            return
    
    # Create configuration
    create_railway_config()
    
    # Deploy
    if deploy_to_railway():
        # Get Railway URL
        railway_url = get_railway_url()
        if railway_url:
            print(f"\n🎉 Your app is deployed at: {railway_url}")
            update_twilio_webhooks(railway_url)
        else:
            print("\n⚠️  Deployment successful but couldn't get URL")
            print("Check your Railway dashboard for the URL")
    else:
        print("\n❌ Deployment failed")
        print("Please check the error messages above")

if __name__ == "__main__":
    main() 