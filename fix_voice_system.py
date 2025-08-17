#!/usr/bin/env python3
"""
Fix Voice System Issues
- Add OpenAI API key
- Configure Twilio webhooks
- Test the system
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_current_status():
    """Check current system status"""
    print("🔍 Current System Status")
    print("=" * 40)
    
    # Check environment variables
    env_vars = {
        'TWILIO_ACCOUNT_SID': os.getenv('TWILIO_ACCOUNT_SID'),
        'TWILIO_AUTH_TOKEN': os.getenv('TWILIO_AUTH_TOKEN'),
        'TWILIO_PHONE_NUMBER': os.getenv('TWILIO_PHONE_NUMBER'),
        'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY')
    }
    
    for var, value in env_vars.items():
        if value:
            print(f"✅ {var}: Configured")
        else:
            print(f"❌ {var}: Missing")
    
    # Check server status
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running")
            health_data = response.json()
            services = health_data.get('services', {})
            
            for service_name, service_status in services.items():
                status = service_status.get('status', 'unknown')
                print(f"   {service_name}: {status}")
        else:
            print(f"❌ Server returned status {response.status_code}")
    except Exception as e:
        print(f"❌ Server not accessible: {e}")

def create_env_file():
    """Create or update .env file"""
    print("\n📝 Setting up Environment Variables")
    print("=" * 40)
    
    # Check if .env exists
    if os.path.exists('.env'):
        print("✅ .env file exists")
        with open('.env', 'r') as f:
            content = f.read()
            print("Current .env contents:")
            print(content)
    else:
        print("❌ .env file not found")
    
    print("\n🔧 To fix the OpenAI issue, you need to:")
    print("1. Get an OpenAI API key from https://platform.openai.com/api-keys")
    print("2. Add it to your .env file:")
    print("   OPENAI_API_KEY=your_openai_api_key_here")
    
    # Create a template .env file
    env_template = """# Database Configuration (optional)
DATABASE_URL=postgresql://username:password@localhost:5432/salon_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=salon_db
DB_USER=postgres
DB_PASSWORD=your_password

# Twilio Configuration (REQUIRED)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+19187277348

# OpenAI Configuration (REQUIRED for AI responses)
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
LOG_LEVEL=INFO
ENVIRONMENT=development
"""
    
    with open('.env.template', 'w') as f:
        f.write(env_template)
    
    print("\n📄 Created .env.template file")
    print("Copy this to .env and add your actual credentials")

def fix_voice_service_for_testing():
    """Modify voice service to work without OpenAI for testing"""
    print("\n🔧 Creating Voice Service Fix for Testing")
    print("=" * 40)
    
    # Create a backup of the original voice service
    if os.path.exists('python_sms_responder/voice_service.py'):
        with open('python_sms_responder/voice_service.py', 'r') as f:
            original_content = f.read()
        
        with open('python_sms_responder/voice_service_backup.py', 'w') as f:
            f.write(original_content)
        print("✅ Created backup of voice_service.py")
    
    # Create a modified version that works without OpenAI
    modified_content = '''"""
Voice Service for handling Twilio voice calls with AI integration
"""
import os
import logging
from typing import Dict, Optional, List
from twilio.twiml.voice_response import VoiceResponse
from twilio.rest import Client
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoiceService:
    """
    Service for handling voice calls with Twilio and OpenAI integration
    """
    
    def __init__(self):
        """Initialize the voice service with Twilio and OpenAI clients"""
        self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.twilio_phone_number = os.getenv('TWILIO_PHONE_NUMBER')
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        
        # Initialize Twilio client
        if self.twilio_account_sid and self.twilio_auth_token:
            self.twilio_client = Client(self.twilio_account_sid, self.twilio_auth_token)
        else:
            self.twilio_client = None
            logger.warning("Twilio credentials not configured")
        
        # Initialize OpenAI client
        if self.openai_api_key:
            self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
        else:
            self.openai_client = None
            logger.warning("OpenAI API key not configured - using fallback responses")
        
        # Conversation history storage (in production, use Redis or database)
        self.conversation_history: Dict[str, List[Dict]] = {}
        
        # Salon context for the AI
        self.salon_context = """
        You are a friendly salon receptionist for a beauty salon. Your role is to:
        1. Greet callers warmly and professionally
        2. Help with appointment bookings, rescheduling, and cancellations
        3. Answer questions about services, pricing, and salon hours
        4. Provide information about stylists and their specialties
        5. Handle general inquiries about the salon
        
        Key information about the salon:
        - Open Monday-Saturday 9AM-7PM, Sunday 10AM-5PM
        - Services include haircuts, styling, coloring, highlights, treatments
        - Prices range from $25 for basic cuts to $150+ for complex services
        - We accept walk-ins but recommend appointments
        - Cancellation policy: 24-hour notice required
        
        Always be polite, professional, and helpful. If you can't handle a specific request,
        offer to transfer to a human or take a message.
        """
    
    def check_health(self) -> Dict:
        """Check the health status of the voice service"""
        try:
            status = {
                "status": "healthy",
                "twilio_configured": self.twilio_client is not None,
                "openai_configured": self.openai_client is not None,
                "conversation_sessions": len(self.conversation_history)
            }
            
            # Test OpenAI connection if configured
            if self.openai_client:
                try:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": "test"}],
                        max_tokens=5
                    )
                    status["openai_working"] = True
                except Exception as e:
                    status["openai_working"] = False
                    status["openai_error"] = str(e)
            
            return status
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    def create_initial_response(self, call_sid: str) -> str:
        """
        Create the initial TwiML response for incoming calls
        """
        try:
            response = VoiceResponse()
            
            # Add a friendly greeting
            response.say(
                "Hello! Welcome to our salon. I'm your AI assistant. How can I help you today?",
                voice='alice',
                language='en-US'
            )
            
            # Configure speech recognition
            gather = response.gather(
                input='speech',
                action=f'/webhook/voice/process?call_sid={call_sid}',
                method='POST',
                speech_timeout='auto',
                speech_model='phone_call',
                enhanced='true',
                language='en-US'
            )
            
            # Fallback if no speech detected
            gather.say(
                "I didn't catch that. Could you please repeat your request?",
                voice='alice',
                language='en-US'
            )
            
            # If no input after gather, repeat the greeting
            response.say(
                "I'm still here to help. Please let me know what you need.",
                voice='alice',
                language='en-US'
            )
            response.redirect('/webhook/voice?call_sid=' + call_sid)
            
            return str(response)
            
        except Exception as e:
            logger.error(f"Error creating initial response: {e}")
            # Fallback response
            response = VoiceResponse()
            response.say(
                "Thank you for calling our salon. Please hold while I connect you to our staff.",
                voice='alice',
                language='en-US'
            )
            return str(response)
    
    def create_processing_response(self, call_sid: str, user_speech: str) -> str:
        """
        Process user speech and create AI response
        """
        try:
            response = VoiceResponse()
            
            # Generate AI response
            ai_response = self._generate_ai_response(call_sid, user_speech)
            
            # Speak the AI response
            response.say(
                ai_response,
                voice='alice',
                language='en-US'
            )
            
            # Ask if they need anything else
            response.say(
                "Is there anything else I can help you with?",
                voice='alice',
                language='en-US'
            )
            
            # Continue listening for more input
            gather = response.gather(
                input='speech',
                action=f'/webhook/voice/process?call_sid={call_sid}',
                method='POST',
                speech_timeout='auto',
                speech_model='phone_call',
                enhanced='true',
                language='en-US'
            )
            
            # Fallback if no speech detected
            gather.say(
                "I didn't hear anything. Please let me know if you need further assistance.",
                voice='alice',
                language='en-US'
            )
            
            # If no input, end the call gracefully
            response.say(
                "Thank you for calling our salon. Have a wonderful day!",
                voice='alice',
                language='en-US'
            )
            response.hangup()
            
            return str(response)
            
        except Exception as e:
            logger.error(f"Error creating processing response: {e}")
            # Fallback response
            response = VoiceResponse()
            response.say(
                "I'm sorry, I'm having trouble processing your request. Let me connect you to our staff.",
                voice='alice',
                language='en-US'
            )
            return str(response)
    
    def _generate_ai_response(self, call_sid: str, user_speech: str) -> str:
        """
        Generate AI response using OpenAI or fallback responses
        """
        try:
            # Get conversation history for this call
            if call_sid not in self.conversation_history:
                self.conversation_history[call_sid] = []
            
            # Add user message to history
            self.conversation_history[call_sid].append({
                "role": "user",
                "content": user_speech
            })
            
            # Try OpenAI first
            if self.openai_client:
                try:
                    # Prepare messages for OpenAI
                    messages = [
                        {"role": "system", "content": self.salon_context}
                    ]
                    
                    # Add conversation history (keep last 10 messages to avoid token limits)
                    history = self.conversation_history[call_sid][-10:]
                    messages.extend(history)
                    
                    # Generate response
                    completion = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=messages,
                        max_tokens=150,
                        temperature=0.7
                    )
                    
                    ai_response = completion.choices[0].message.content.strip()
                    
                    # Add AI response to history
                    self.conversation_history[call_sid].append({
                        "role": "assistant",
                        "content": ai_response
                    })
                    
                    # Clean up old conversations (keep only last 20 messages)
                    if len(self.conversation_history[call_sid]) > 20:
                        self.conversation_history[call_sid] = self.conversation_history[call_sid][-20:]
                    
                    return ai_response
                    
                except Exception as e:
                    logger.error(f"OpenAI error: {e}")
                    # Fall through to fallback responses
            
            # Fallback responses when OpenAI is not available
            user_speech_lower = user_speech.lower()
            
            if any(word in user_speech_lower for word in ['appointment', 'book', 'schedule', 'reserve']):
                response = "I'd be happy to help you book an appointment! We're open Monday through Saturday 9AM to 7PM, and Sundays 10AM to 5PM. What day and time would work best for you?"
            
            elif any(word in user_speech_lower for word in ['price', 'cost', 'how much', 'fee']):
                response = "Our services range from $25 for basic cuts to $150+ for complex services. Haircuts start at $25, styling is $35, and coloring starts at $75. Would you like to know more about a specific service?"
            
            elif any(word in user_speech_lower for word in ['hour', 'open', 'time', 'when']):
                response = "We're open Monday through Saturday from 9AM to 7PM, and Sundays from 10AM to 5PM. We accept walk-ins but recommend appointments for the best experience."
            
            elif any(word in user_speech_lower for word in ['cancel', 'reschedule', 'change']):
                response = "I can help you reschedule or cancel your appointment. We require 24-hour notice for cancellations. What's your name and when is your current appointment?"
            
            elif any(word in user_speech_lower for word in ['service', 'what do you', 'offer']):
                response = "We offer a full range of salon services including haircuts, styling, coloring, highlights, treatments, and more. Our stylists are experienced in all types of hair and styles. What service are you interested in?"
            
            else:
                response = "Thank you for your inquiry. I'm here to help with appointments, pricing, hours, and any other questions about our salon. How can I assist you today?"
            
            # Add fallback response to history
            self.conversation_history[call_sid].append({
                "role": "assistant",
                "content": response
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return "I'm sorry, I'm having trouble understanding. Could you please repeat your request?"
    
    def cleanup_conversation(self, call_sid: str):
        """
        Clean up conversation history after call ends
        """
        try:
            if call_sid in self.conversation_history:
                del self.conversation_history[call_sid]
                logger.info(f"Cleaned up conversation for call {call_sid}")
        except Exception as e:
            logger.error(f"Error cleaning up conversation: {e}")
    
    def get_call_status(self, call_sid: str) -> Dict:
        """
        Get status information about a specific call
        """
        try:
            if not self.twilio_client:
                return {"error": "Twilio client not configured"}
            
            call = self.twilio_client.calls(call_sid).fetch()
            return {
                "call_sid": call.sid,
                "status": call.status,
                "from": call.from_,
                "to": call.to,
                "duration": call.duration,
                "start_time": call.start_time.isoformat() if call.start_time else None,
                "end_time": call.end_time.isoformat() if call.end_time else None,
                "conversation_messages": len(self.conversation_history.get(call_sid, []))
            }
        except Exception as e:
            return {"error": str(e)}
'''
    
    with open('python_sms_responder/voice_service.py', 'w') as f:
        f.write(modified_content)
    
    print("✅ Updated voice_service.py to work without OpenAI")
    print("   Now uses fallback responses when OpenAI is not available")

def provide_twilio_configuration_instructions():
    """Provide instructions for configuring Twilio"""
    print("\n📞 Twilio Configuration Instructions")
    print("=" * 40)
    
    print("To fix the 'call cannot be completed as dialed' error:")
    print()
    print("1. Log into your Twilio Console: https://console.twilio.com")
    print("2. Go to Phone Numbers → Manage → Active numbers")
    print("3. Click on your phone number: +19187277348")
    print("4. Configure these settings:")
    print()
    print("   Voice Configuration:")
    print("   - Voice Configuration: Webhook")
    print("   - Voice Webhook URL: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook/voice")
    print("   - HTTP Method: POST")
    print()
    print("   Status Callback:")
    print("   - Status Callback URL: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/webhook/voice/status")
    print("   - Status Callback Events: completed, busy, failed, no-answer")
    print()
    print("5. Save the configuration")
    print("6. Test by calling your phone number")

def test_system():
    """Test the voice system"""
    print("\n🧪 Testing Voice System")
    print("=" * 40)
    
    try:
        # Test webhook endpoint
        test_data = {
            "CallSid": "test_call_456",
            "From": "+1234567890",
            "To": "+0987654321",
            "AccountSid": "test_account",
            "CallStatus": "ringing"
        }
        
        response = requests.post("http://localhost:8000/webhook/voice", data=test_data)
        
        if response.status_code == 200:
            print("✅ Voice webhook is working")
            response_data = response.json()
            print(f"   Success: {response_data.get('success')}")
            print(f"   Message: {response_data.get('message')}")
            
            # Test processing endpoint
            test_speech_data = {
                "CallSid": "test_call_456",
                "From": "+1234567890",
                "To": "+0987654321",
                "AccountSid": "test_account",
                "CallStatus": "in-progress",
                "SpeechResult": "I need an appointment",
                "SpeechConfidence": "0.95"
            }
            
            response = requests.post("http://localhost:8000/webhook/voice/process", data=test_speech_data)
            
            if response.status_code == 200:
                print("✅ Voice processing is working")
                response_data = response.json()
                print(f"   Success: {response_data.get('success')}")
                print(f"   Message: {response_data.get('message')}")
                
                # Check if TwiML response is generated
                twiml = response_data.get('twiml_response', '')
                if twiml and '<Response>' in twiml:
                    print("✅ TwiML response is generated correctly")
                else:
                    print("⚠️  TwiML response may be incomplete")
            else:
                print(f"❌ Voice processing failed: {response.status_code}")
        else:
            print(f"❌ Voice webhook failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing system: {e}")

def main():
    """Main function"""
    print("🔧 Voice System Fix Tool")
    print("=" * 50)
    
    # Check current status
    check_current_status()
    
    # Create env file template
    create_env_file()
    
    # Fix voice service for testing
    fix_voice_service_for_testing()
    
    # Provide Twilio configuration instructions
    provide_twilio_configuration_instructions()
    
    # Test the system
    test_system()
    
    print("\n" + "=" * 50)
    print("🎯 Summary of Actions Needed:")
    print("=" * 50)
    print("1. ✅ Updated voice service to work without OpenAI")
    print("2. 📝 Add your OpenAI API key to .env file (optional)")
    print("3. 📞 Configure Twilio phone number webhooks (required)")
    print("4. 🧪 Test the system")
    print()
    print("Next steps:")
    print("- Configure your Twilio phone number webhooks")
    print("- Add OpenAI API key to .env for AI responses")
    print("- Call your phone number to test")

if __name__ == "__main__":
    main() 