#!/usr/bin/env python3
"""
Load API keys from database or environment for Python SMS responder
"""

import os
import psycopg2
from dotenv import load_dotenv, set_key
import json

# Load existing .env file if present
load_dotenv()

def get_db_connection():
    """Get database connection"""
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/salon_db')
    return psycopg2.connect(db_url)

def load_api_keys_from_db():
    """Load API keys from the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query for API keys
        cursor.execute("""
            SELECT key, value 
            FROM system_config 
            WHERE key IN ('twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number', 'openai_api_key')
        """)
        
        results = cursor.fetchall()
        config = {}
        
        for row in results:
            key, value = row
            if value:  # Only add if value exists
                config[key] = value
        
        cursor.close()
        conn.close()
        
        return config
    except Exception as e:
        print(f"Error loading from database: {e}")
        return {}

def setup_environment():
    """Setup environment variables for Python SMS responder"""
    
    # First check if keys are already in environment (from Replit secrets)
    existing_keys = {
        'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
        'TWILIO_ACCOUNT_SID': os.getenv('TWILIO_ACCOUNT_SID'),
        'TWILIO_AUTH_TOKEN': os.getenv('TWILIO_AUTH_TOKEN'),
        'TWILIO_PHONE_NUMBER': os.getenv('TWILIO_PHONE_NUMBER')
    }
    
    # Count how many keys are already configured
    configured = sum(1 for v in existing_keys.values() if v and v != 'test_key' and v != 'test_sid' and v != 'test_token')
    
    if configured >= 3:  # At least 3 keys are configured
        print("✅ API keys already configured from environment/secrets:")
        if existing_keys['OPENAI_API_KEY'] and existing_keys['OPENAI_API_KEY'] != 'test_key':
            print(f"  • OpenAI API Key: {existing_keys['OPENAI_API_KEY'][:7]}...")
        if existing_keys['TWILIO_ACCOUNT_SID'] and existing_keys['TWILIO_ACCOUNT_SID'] != 'test_sid':
            print(f"  • Twilio Account SID: {existing_keys['TWILIO_ACCOUNT_SID'][:10]}...")
        if existing_keys['TWILIO_AUTH_TOKEN'] and existing_keys['TWILIO_AUTH_TOKEN'] != 'test_token':
            print(f"  • Twilio Auth Token: ***configured***")
        if existing_keys['TWILIO_PHONE_NUMBER']:
            print(f"  • Twilio Phone Number: {existing_keys['TWILIO_PHONE_NUMBER']}")
    else:
        print("⚠️  Some API keys missing from environment, loading from database...")
        
        # Load from database
        db_config = load_api_keys_from_db()
        
        if db_config:
            # Map database keys to environment variable names
            env_mapping = {
                'openai_api_key': 'OPENAI_API_KEY',
                'twilio_account_sid': 'TWILIO_ACCOUNT_SID',
                'twilio_auth_token': 'TWILIO_AUTH_TOKEN',
                'twilio_phone_number': 'TWILIO_PHONE_NUMBER'
            }
            
            # Update environment variables
            env_updates = {}
            for db_key, env_key in env_mapping.items():
                if db_key in db_config and db_config[db_key]:
                    # Only update if not already set or is a test value
                    current_value = existing_keys.get(env_key)
                    if not current_value or current_value.startswith('test_'):
                        os.environ[env_key] = db_config[db_key]
                        env_updates[env_key] = db_config[db_key]
            
            if env_updates:
                print("✅ Loaded API keys from database:")
                for key, value in env_updates.items():
                    if 'TOKEN' in key:
                        print(f"  • {key}: ***configured***")
                    elif 'OPENAI' in key:
                        print(f"  • {key}: {value[:7]}..." if len(value) > 7 else f"  • {key}: configured")
                    else:
                        print(f"  • {key}: {value[:15]}..." if len(value) > 15 else f"  • {key}: {value}")
                
                # Save to .env file for persistence
                env_file = '/home/runner/workspace/.env'
                for key, value in env_updates.items():
                    set_key(env_file, key, value)
                print(f"\n✅ Saved configuration to {env_file}")
        else:
            print("⚠️  No API keys found in database")
    
    # Final check
    final_check = {
        'OpenAI': os.getenv('OPENAI_API_KEY') and os.getenv('OPENAI_API_KEY') != 'test_key',
        'Twilio SID': os.getenv('TWILIO_ACCOUNT_SID') and os.getenv('TWILIO_ACCOUNT_SID') != 'test_sid',
        'Twilio Auth': os.getenv('TWILIO_AUTH_TOKEN') and os.getenv('TWILIO_AUTH_TOKEN') != 'test_token',
        'Twilio Phone': os.getenv('TWILIO_PHONE_NUMBER') and os.getenv('TWILIO_PHONE_NUMBER') != '+1234567890'
    }
    
    print("\n📊 Final Configuration Status:")
    all_configured = True
    for service, is_configured in final_check.items():
        status = "✅" if is_configured else "❌"
        print(f"  {status} {service}: {'Configured' if is_configured else 'Not configured'}")
        if not is_configured:
            all_configured = False
    
    if all_configured:
        print("\n🎉 All services configured! Python SMS responder ready to use.")
    else:
        print("\n⚠️  Some services are not configured. The SMS responder may have limited functionality.")
    
    return all_configured

if __name__ == "__main__":
    setup_environment()
