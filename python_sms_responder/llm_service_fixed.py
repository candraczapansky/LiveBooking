import os
from openai import OpenAI
import logging
from typing import Optional, Dict, Any
from .models import ClientInfo, LLMRequest, LLMResponse
from .conversation_manager import ConversationManager

class LLMService:
    """Service for handling LLM operations via OpenAI"""
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("Missing OpenAI API key")
        
        self.client = OpenAI(api_key=self.api_key)
        self.logger = logging.getLogger(__name__)
        
        # Default model and parameters
        self.model = "gpt-4"
        self.max_tokens = 200  # Increased for better responses
        self.temperature = 0.7
        
        # Initialize conversation manager with database service
        self.db_service = None  # Will be set via set_db_service
        self.conversation_manager = None  # Will be initialized when db_service is set
        
        # System prompt for salon context
        self.system_prompt = self._get_system_prompt()
        
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

Current salon hours: Monday-Saturday 9AM-7PM, Sunday 10AM-5PM
Address: [Salon Address]
Phone: [Salon Phone]

Remember: You are having a real conversation with a client. Be helpful, friendly, and conversational."""
    
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
            # Check if this is a booking-related conversation
            conversation_result = self.conversation_manager.process_message(
                phone_number, user_message, client_info
            )
            
            # Log conversation result for debugging
            self.logger.info(f"Conversation result for {phone_number}: {conversation_result}")
            
            # If conversation manager handled it and has a specific response, use that
            if conversation_result.get("requires_booking", False) and conversation_result.get("response"):
                self.logger.info(f"Using conversation manager response for {phone_number}")
                return conversation_result["response"]
            
            # Otherwise, use AI for general responses
            self.logger.info(f"Using AI response for {phone_number}")
            prompt = self._build_prompt(user_message, client_info, phone_number, context)
            
            # Generate response using OpenAI
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Log the interaction
            self.logger.info(f"Generated AI response for {phone_number}: {ai_response}")
            
            return ai_response
            
        except Exception as e:
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
            # Check if this is a booking-related conversation
            conversation_result = self.conversation_manager.process_message(
                phone_number, user_message, client_info
            )
            
            # Log conversation result for debugging
            self.logger.info(f"Conversation result for {phone_number}: {conversation_result}")
            
            # If conversation manager handled it and has a specific response, use that
            if conversation_result.get("requires_booking", False) and conversation_result.get("response"):
                self.logger.info(f"Using conversation manager response for {phone_number}")
                return conversation_result["response"]
            
            # Otherwise, use AI for general responses
            self.logger.info(f"Using AI response for {phone_number}")
            prompt = self._build_prompt(user_message, client_info, phone_number, context)
            
            # Generate response using OpenAI
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Log the interaction
            self.logger.info(f"Generated AI response for {phone_number}: {ai_response}")
            
            return ai_response
            
        except Exception as e:
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
