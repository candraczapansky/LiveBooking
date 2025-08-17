import os
from openai import OpenAI
import logging
from typing import Optional, Dict, Any
from models import ClientInfo, LLMRequest, LLMResponse
from conversation_manager import ConversationManager

class LLMService:
    """Service for handling LLM operations via OpenAI"""
    
    def __init__(self):
        print(f"\n🔍 [INIT] LLM Service: Initializing...")
        
        self.api_key = os.getenv("OPENAI_API_KEY")
        print(f"🔍 [INIT] LLM Service: API Key from env: {'✅ SET' if self.api_key else '❌ MISSING'}")
        
        if not self.api_key:
            print(f"❌ [INIT] LLM Service: CRITICAL ERROR - No API key found!")
            print(f"❌ [INIT] LLM Service: Environment variables available:")
            for key, value in os.environ.items():
                if 'OPENAI' in key or 'API' in key:
                    print(f"   - {key}: {'✅ SET' if value else '❌ MISSING'}")
            raise ValueError("Missing OpenAI API key")
        
        print(f"🔍 [INIT] LLM Service: API Key length: {len(self.api_key)} characters")
        print(f"🔍 [INIT] LLM Service: API Key starts with: {self.api_key[:10]}...")
        
        try:
            print(f"🔍 [INIT] LLM Service: Creating OpenAI client...")
            self.client = OpenAI(api_key=self.api_key)
            print(f"🔍 [INIT] LLM Service: OpenAI client created successfully")
        except Exception as e:
            print(f"❌ [INIT] LLM Service: Failed to create OpenAI client: {e}")
            raise
        
        self.logger = logging.getLogger(__name__)
        
        # Default model and parameters
        self.model = "gpt-4"
        self.max_tokens = 200  # Increased for better responses
        self.temperature = 0.7
        
        print(f"🔍 [INIT] LLM Service: Configuration:")
        print(f"   - Model: {self.model}")
        print(f"   - Max tokens: {self.max_tokens}")
        print(f"   - Temperature: {self.temperature}")
        
        # Initialize conversation manager with database service
        self.db_service = None  # Will be set via set_db_service
        self.conversation_manager = None  # Will be initialized when db_service is set
        
        # System prompt for salon context
        self.system_prompt = self._get_system_prompt()
        print(f"🔍 [INIT] LLM Service: System prompt length: {len(self.system_prompt)} characters")
        print(f"🔍 [INIT] LLM Service: Initialization complete!")
        
    def set_db_service(self, db_service):
        """Set the database service and initialize conversation manager"""
        self.db_service = db_service
        self.conversation_manager = ConversationManager(db_service)
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for salon SMS responses"""
        return """You are an AI assistant for a professional salon called Glo Head Spa. Your role is to help clients with appointment-related inquiries via SMS.

Key responsibilities:
- Guide clients through the appointment booking process
- Collect required client information (name, email, appointment details)
- Help with rescheduling or canceling appointments
- Provide information about services and pricing
- Answer questions about salon policies and hours
- Be friendly, professional, and conversational
- Keep responses under 160 characters when possible
- If you can't handle a request, offer to have someone call them

Appointment booking flow:
1. When a client wants to book, first ask for their name if unknown
2. Then collect their email address
3. Ask about desired service if not specified
4. Get preferred date and time
5. Check availability and confirm booking
6. Send confirmation details

Important guidelines:
- Always be polite and professional
- Keep responses brief and clear
- Ask one question at a time to avoid overwhelming
- Collect information systematically
- Don't make up information about services or pricing
- If unsure about availability, verify before confirming
- Be conversational and engaging, not robotic
- For general questions, provide helpful information
- If someone asks about hours, services, or policies, give them the information they need
- Be warm and welcoming - this is a salon, so hospitality is key

Current salon hours: Monday-Saturday 9AM-7PM, Sunday 10AM-5PM
Address: 123 Main Street, Downtown
Phone: (555) 123-4567

Available services:
- Haircut ($45, 60 min)
- Haircut & Style ($65, 90 min)
- Hair Color ($85, 120 min)
- Highlights ($95, 150 min)
- Balayage ($120, 180 min)
- Blowout ($35, 45 min)
- Updo ($55, 60 min)
- Hair Extensions ($150, 120 min)

Remember: You are having a real conversation with a client. Be helpful, friendly, and conversational. Make them feel welcome and valued."""
    
    async def generate_response(
        self, 
        user_message: str, 
        client_info: Optional[ClientInfo] = None,
        phone_number: str = "",
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate AI response for SMS
        
        Args:
            user_message: The user's SMS message
            client_info: Client information from database
            phone_number: User's phone number
            context: Additional context information
            
        Returns:
            str: Generated response message
        """
        try:
            print(f"\n🔍 [1] LLM Service: Starting response generation for {phone_number}")
            print(f"🔍 [1] LLM Service: User message: '{user_message}'")
            
            # Check if this is a booking-related conversation
            print(f"🔍 [2] LLM Service: Calling conversation manager...")
            conversation_result = self.conversation_manager.process_message(
                phone_number, user_message, client_info
            )
            
            # Log conversation result for debugging
            print(f"🔍 [3] LLM Service: Conversation result: {conversation_result}")
            
            # If conversation manager has a specific response, use that
            if conversation_result.get("response"):
                print(f"🔍 [4] LLM Service: Using conversation manager response")
                return conversation_result["response"]
            
            # Otherwise, use AI for general responses
            print(f"🔍 [5] LLM Service: Preparing to call OpenAI API...")
            print(f"🔍 [5] LLM Service: API Key check: {'✅ SET' if self.api_key else '❌ MISSING'}")
            print(f"🔍 [5] LLM Service: Model: {self.model}")
            print(f"🔍 [5] LLM Service: Max tokens: {self.max_tokens}")
            
            prompt = self._build_prompt(user_message, client_info, phone_number, context)
            print(f"🔍 [6] LLM Service: Built prompt: {prompt[:100]}...")
            
            # Generate response using OpenAI
            print(f"🔍 [7] LLM Service: Making OpenAI API call...")
            print(f"🔍 [7] LLM Service: Request details:")
            print(f"   - Model: {self.model}")
            print(f"   - Messages: {len([{'role': 'system', 'content': self.system_prompt}, {'role': 'user', 'content': prompt}])}")
            print(f"   - Max tokens: {self.max_tokens}")
            print(f"   - Temperature: {self.temperature}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            print(f"🔍 [8] LLM Service: OpenAI API call SUCCESSFUL!")
            print(f"🔍 [8] LLM Service: Response object: {type(response)}")
            print(f"🔍 [8] LLM Service: Response choices: {len(response.choices)}")
            
            ai_response = response.choices[0].message.content.strip()
            print(f"🔍 [9] LLM Service: Extracted response: '{ai_response}'")
            
            # Log the interaction
            self.logger.info(f"Generated AI response for {phone_number}: {ai_response}")
            
            return ai_response
            
        except Exception as e:
            print(f"❌ [!!!] LLM Service: OpenAI API Call FAILED!")
            print(f"❌ [!!!] LLM Service: Error type: {type(e).__name__}")
            print(f"❌ [!!!] LLM Service: Error message: {str(e)}")
            print(f"❌ [!!!] LLM Service: Full error details: {e}")
            
            # Log additional context
            if hasattr(e, 'status_code'):
                print(f"❌ [!!!] LLM Service: HTTP Status: {e.status_code}")
            if hasattr(e, 'response'):
                print(f"❌ [!!!] LLM Service: Response body: {e.response}")
            
            self.logger.error(f"Error generating LLM response: {str(e)}")
            return "I'm sorry, I'm having trouble processing your request. Please call us directly for assistance."
    
    def generate_response_sync(
        self, 
        user_message: str, 
        client_info: Optional[ClientInfo] = None,
        phone_number: str = "",
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Sync version that can be used for testing
        """
        try:
            print(f"\n🔍 [1] LLM Service SYNC: Starting response generation for {phone_number}")
            print(f"🔍 [1] LLM Service SYNC: User message: '{user_message}'")
            
            # Check if this is a booking-related conversation
            print(f"🔍 [2] LLM Service SYNC: Calling conversation manager...")
            conversation_result = self.conversation_manager.process_message(
                phone_number, user_message, client_info
            )
            
            # Log conversation result for debugging
            print(f"🔍 [3] LLM Service SYNC: Conversation result: {conversation_result}")
            
            # If conversation manager has a specific response, use that
            if conversation_result.get("response"):
                print(f"🔍 [4] LLM Service SYNC: Using conversation manager response")
                return conversation_result["response"]
            
            # Otherwise, use AI for general responses
            print(f"🔍 [5] LLM Service SYNC: Preparing to call OpenAI API...")
            print(f"🔍 [5] LLM Service SYNC: API Key check: {'✅ SET' if self.api_key else '❌ MISSING'}")
            print(f"🔍 [5] LLM Service SYNC: Model: {self.model}")
            print(f"🔍 [5] LLM Service SYNC: Max tokens: {self.max_tokens}")
            
            prompt = self._build_prompt(user_message, client_info, phone_number, context)
            print(f"🔍 [6] LLM Service SYNC: Built prompt: {prompt[:100]}...")
            
            # Generate response using OpenAI
            print(f"🔍 [7] LLM Service SYNC: Making OpenAI API call...")
            print(f"🔍 [7] LLM Service SYNC: Request details:")
            print(f"   - Model: {self.model}")
            print(f"   - Messages: {len([{'role': 'system', 'content': self.system_prompt}, {'role': 'user', 'content': prompt}])}")
            print(f"   - Max tokens: {self.max_tokens}")
            print(f"   - Temperature: {self.temperature}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            print(f"🔍 [8] LLM Service SYNC: OpenAI API call SUCCESSFUL!")
            print(f"🔍 [8] LLM Service SYNC: Response object: {type(response)}")
            print(f"🔍 [8] LLM Service SYNC: Response choices: {len(response.choices)}")
            
            ai_response = response.choices[0].message.content.strip()
            print(f"🔍 [9] LLM Service SYNC: Extracted response: '{ai_response}'")
            
            # Log the interaction
            self.logger.info(f"Generated AI response for {phone_number}: {ai_response}")
            
            return ai_response
            
        except Exception as e:
            print(f"❌ [!!!] LLM Service SYNC: OpenAI API Call FAILED!")
            print(f"❌ [!!!] LLM Service SYNC: Error type: {type(e).__name__}")
            print(f"❌ [!!!] LLM Service SYNC: Error message: {str(e)}")
            print(f"❌ [!!!] LLM Service SYNC: Full error details: {e}")
            
            # Log additional context
            if hasattr(e, 'status_code'):
                print(f"❌ [!!!] LLM Service SYNC: HTTP Status: {e.status_code}")
            if hasattr(e, 'response'):
                print(f"❌ [!!!] LLM Service SYNC: Response body: {e.response}")
            
            self.logger.error(f"Error generating LLM response: {str(e)}")
            return "I'm sorry, I'm having trouble processing your request. Please call us directly for assistance."
    
    def _build_prompt(
        self, 
        user_message: str, 
        client_info: Optional[ClientInfo] = None,
        phone_number: str = "",
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Build context-aware prompt for LLM
        
        Args:
            user_message: User's message
            client_info: Client information
            phone_number: User's phone number
            context: Additional context
            
        Returns:
            str: Formatted prompt
        """
        prompt_parts = []
        
        # Add client context if available
        if client_info:
            prompt_parts.append(f"Client: {client_info.firstName} {client_info.lastName}")
            if client_info.email:
                prompt_parts.append(f"Email: {client_info.email}")
        
        # Add phone number context
        prompt_parts.append(f"Phone: {phone_number}")
        
        # Add user message
        prompt_parts.append(f"Message: {user_message}")
        
        # Add any additional context
        if context:
            for key, value in context.items():
                prompt_parts.append(f"{key}: {value}")
        
        return "\n".join(prompt_parts)
    
    def _get_available_services(self) -> str:
        """Get list of available services for context"""
        return """Available services:
- Haircut ($45, 60 min)
- Haircut & Style ($65, 90 min)
- Hair Color ($85, 120 min)
- Highlights ($95, 150 min)
- Balayage ($120, 180 min)
- Blowout ($35, 45 min)
- Updo ($55, 60 min)
- Hair Extensions ($150, 120 min)"""
    
    async def check_health(self) -> Dict[str, Any]:
        """Check the health of the LLM service"""
        try:
            # Test OpenAI API connection
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            return {
                "status": "healthy",
                "openai_connected": True,
                "model": self.model,
                "max_tokens": self.max_tokens
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "openai_connected": False,
                "error": str(e)
            }
