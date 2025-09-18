"""
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
        
        # Glo Head Spa context for the AI voice assistant
        self.salon_context = """
        You are a friendly, enthusiastic receptionist at Glo Head Spa in Tulsa. Your role is to:
        1. Greet callers warmly with enthusiasm and make them feel welcomed
        2. Help with head spa appointment bookings and inquiries
        3. Answer questions about our specialized head spa treatments
        4. Provide information about services and pricing
        5. Handle general inquiries with a bubbly, professional tone
        
        Key information about Glo Head Spa:
        - Open Monday-Saturday 9AM-7PM, Sunday 10AM-5PM
        - Phone: (918) 727-7348
        - We specialize in Japanese head spa treatments
        
        Services offered:
        - Signature Head Spa ($99, 60 minutes) - Our signature Japanese scalp treatment
        - Deluxe Head Spa ($160, 90 minutes) - Extended session with premium treatments
        - Platinum Head Spa ($220, 120 minutes) - Ultimate luxury experience
        - Korean Glass Skin Facial ($130, 60 minutes) - For radiant skin
        - Buccal Massage Facial ($190, 90 minutes) - Facial contouring massage
        
        Important: Be enthusiastic and friendly! Make every caller feel special.
        Keep responses natural and conversational for voice interaction.
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
            
            # Get webhook base URL from environment or use default Replit URL
            webhook_base = os.getenv('WEBHOOK_BASE_URL', 'https://dev-booking-91625-candraczapansky.replit.app')
            
            # Always use absolute URLs for Twilio
            process_url = f"{webhook_base}/api/webhook/voice/process?call_sid={call_sid}"
            redirect_url = f"{webhook_base}/api/webhook/voice?call_sid={call_sid}"
            
            # Configure speech recognition
            gather = response.gather(
                input='speech',
                action=process_url,
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
            response.redirect(redirect_url)
            
            return str(response)
            
        except Exception as e:
            logger.error(f"Error creating initial response: {e}")
            import traceback
            logger.error(f"TRACEBACK: {traceback.format_exc()}")
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
            # Get webhook base URL from environment or use relative paths
            webhook_base = os.getenv('WEBHOOK_BASE_URL', '')
            if webhook_base:
                process_url = f"{webhook_base}/webhook/voice/process?call_sid={call_sid}"
            else:
                # Use relative paths - Twilio will use the same domain
                process_url = f"/webhook/voice/process?call_sid={call_sid}"
            
            gather = response.gather(
                input='speech',
                action=process_url,
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
                    import traceback
                    logger.error(f"OpenAI TRACEBACK: {traceback.format_exc()}")
                    # Fall through to fallback responses
            
            # Fallback responses when OpenAI is not available
            user_speech_lower = user_speech.lower()
            
            if any(word in user_speech_lower for word in ['appointment', 'book', 'schedule', 'reserve', 'head spa']):
                response = "I'd love to help you book a head spa treatment! We offer the Signature Head Spa for $99, Deluxe for $160, or our Platinum experience for $220. We're open Monday through Saturday 9AM to 7PM, and Sundays 10AM to 5PM. Which treatment interests you?"
            
            elif any(word in user_speech_lower for word in ['price', 'cost', 'how much', 'fee']):
                response = "Our head spa treatments start at $99 for the Signature, $160 for Deluxe, and $220 for our Platinum experience. We also offer Korean Glass Skin Facial for $130 and Buccal Massage Facial for $190. Which service would you like to know more about?"
            
            elif any(word in user_speech_lower for word in ['hour', 'open', 'time', 'when']):
                response = "Glo Head Spa is open Monday through Saturday from 9AM to 7PM, and Sundays from 10AM to 5PM. We recommend booking in advance for the best availability. Would you like to schedule an appointment?"
            
            elif any(word in user_speech_lower for word in ['cancel', 'reschedule', 'change']):
                response = "I can help you reschedule or cancel your appointment. We require 24-hour notice for cancellations. What's your name and when is your current appointment?"
            
            elif 'what' in user_speech_lower and 'head spa' in user_speech_lower:
                response = "A head spa is a relaxing Japanese scalp treatment that includes deep cleansing, massage, and hair treatment. It's amazing for relaxation and hair health! Our treatments range from 60 to 120 minutes. Would you like to book one?"
            
            elif any(word in user_speech_lower for word in ['service', 'what do you', 'offer']):
                response = "Glo Head Spa specializes in Japanese head spa treatments! We offer Signature, Deluxe, and Platinum head spa experiences, plus facial treatments like Korean Glass Skin and Buccal Massage. What interests you most?"
            
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
            import traceback
            logger.error(f"AI Response TRACEBACK: {traceback.format_exc()}")
            return "I'm sorry, I'm having trouble processing your request. Please try again or speak to our staff."
    
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
