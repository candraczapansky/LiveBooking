#!/usr/bin/env python3
"""
Script to expose the local payment server using ngrok
This allows Helcim to send webhooks to your local development server
"""

import time
import os
from pyngrok import ngrok, conf

def main():
    print("🚀 Starting ngrok tunnel for payment server...")
    
    try:
        # Check if ngrok is already running
        try:
            ngrok_process = ngrok.get_ngrok_process()
            if ngrok_process:
                print("✅ Ngrok is already running")
                tunnels = ngrok.get_tunnels()
                if tunnels:
                    public_url = tunnels[0].public_url
                    print(f"🌐 Server exposed at: {public_url}")
                    print(f"🔗 Webhook URL: {public_url}/webhooks/helcim")
                    print(f"🔍 Debug URL: {public_url}/webhooks/helcim/debug")
                    print(f"🧪 Test URL: {public_url}/webhooks/helcim/test")
                else:
                    print("⚠️  No active tunnels found")
                    return
            else:
                print("❌ Ngrok is not running")
                return
        except Exception as e:
            print(f"❌ Error checking ngrok status: {e}")
            print("\n💡 To use ngrok, you need to:")
            print("1. Sign up at https://ngrok.com")
            print("2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken")
            print("3. Run: ngrok config add-authtoken YOUR_TOKEN")
            print("4. Then run this script again")
            return
        
        print("\n📋 Next steps:")
        print("1. Copy the webhook URL above")
        print("2. Go to your Helcim dashboard")
        print("3. Set webhook URL to the debug endpoint first:")
        print(f"   {public_url}/webhooks/helcim/debug")
        print("4. Test a transaction to see what Helcim sends")
        print("5. Check your server logs for the webhook data")
        print("6. Once working, change to production endpoint:")
        print(f"   {public_url}/webhooks/helcim")
        
        print("\n⏳ Keeping tunnel open... (Press Ctrl+C to stop)")
        
        # Keep the tunnel open
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        print("✅ Tunnel will remain open until you stop ngrok manually")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
