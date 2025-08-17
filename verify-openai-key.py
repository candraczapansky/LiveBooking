#!/usr/bin/env python3
"""
Verify OpenAI API key configuration and test it
"""

import os
import sys

print("=" * 60)
print("OPENAI API KEY VERIFICATION")
print("=" * 60)

# Check if OpenAI key is in environment
api_key = os.getenv('OPENAI_API_KEY')

if not api_key:
    print("\n❌ OPENAI_API_KEY not found in environment")
    print("\nTo add it:")
    print("1. Click the 🔒 Secrets button in the Replit toolbar")
    print("2. Add a new secret:")
    print("   Key: OPENAI_API_KEY")
    print("   Value: sk-...")
    print("3. Click 'Add Secret'")
    print("4. Restart the SMS responder")
    sys.exit(1)

if api_key == 'test_key':
    print("\n⚠️  Using test key - AI responses will be limited")
    print("\nTo use real AI responses:")
    print("1. Get your OpenAI API key from https://platform.openai.com/api-keys")
    print("2. Add it to Replit Secrets (see instructions above)")
    sys.exit(0)

# Test the API key
print(f"\n✅ OpenAI API key found: {api_key[:7]}...")
print("\nTesting API key validity...")

try:
    from openai import OpenAI
    
    client = OpenAI(api_key=api_key)
    
    # Test with a simple request
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Say 'test successful'"}],
        max_tokens=10
    )
    
    print("✅ API key is valid and working!")
    print(f"   Response: {response.choices[0].message.content}")
    
    # Check available models
    print("\nChecking available models...")
    try:
        # Try GPT-4
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5
        )
        print("✅ GPT-4 access confirmed")
    except Exception as e:
        if 'model' in str(e).lower():
            print("⚠️  GPT-4 not available - will use GPT-3.5-turbo")
            print("   (This is fine - the SMS responder will work with GPT-3.5)")
        else:
            print(f"⚠️  GPT-4 test failed: {str(e)[:100]}")
    
    print("\n" + "=" * 60)
    print("OPENAI CONFIGURATION: ✅ READY")
    print("=" * 60)
    print("\nYour OpenAI integration is properly configured!")
    print("The SMS responder can now provide intelligent AI responses.")
    
except Exception as e:
    error_msg = str(e)
    print(f"\n❌ API key test failed: {error_msg[:200]}")
    
    if 'invalid' in error_msg.lower() or 'api_key' in error_msg.lower():
        print("\n⚠️  The API key appears to be invalid")
        print("\nPlease check:")
        print("1. The key starts with 'sk-'")
        print("2. The key is not expired")
        print("3. The key has not been revoked")
        print("4. You copied the entire key correctly")
        print("\nTo get a new key:")
        print("1. Go to https://platform.openai.com/api-keys")
        print("2. Create a new secret key")
        print("3. Update the OPENAI_API_KEY in Replit Secrets")
    elif 'quota' in error_msg.lower() or 'limit' in error_msg.lower():
        print("\n⚠️  API quota or rate limit issue")
        print("\nPlease check:")
        print("1. Your OpenAI account has available credits")
        print("2. You haven't exceeded rate limits")
        print("\nVisit https://platform.openai.com/usage to check your usage")
    else:
        print("\n⚠️  Unknown error - please check the error message above")

# Check if the service needs to be restarted
print("\n" + "-" * 60)
print("Next Steps:")
print("-" * 60)

if api_key and api_key != 'test_key':
    print("\n1. Restart the SMS responder to use the new key:")
    print("   pkill -f 'python.*run-python-sms' && python3 run-python-sms.py")
    print("\n2. Test the service:")
    print("   python3 test-sms-conversation.py")
else:
    print("\n1. Add your OpenAI API key to Replit Secrets")
    print("2. Run this script again to verify")
    print("3. Start the SMS responder")
