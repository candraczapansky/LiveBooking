import os
from openai import OpenAI
import logging
from typing import Optional, Dict, Any
from models import ClientInfo, LLMRequest, LLMResponse
from conversation_manager import ConversationManager
from business_knowledge import BusinessKnowledge

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
        self.max_tokens = 150
        self.temperature = 0.7
        
        # Initialize conversation manager
        self.conversation_manager = ConversationManager()
        
        # Initialize business knowledge
        self.business_knowledge = BusinessKnowledge()
        
        # System prompt for salon context
        self.system_prompt = self._get_system_prompt()
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for salon SMS responses with business knowledge"""
        # Get business knowledge
        business_knowledge = self.business_knowledge.get_knowledge_for_llm()
        
        base_prompt = """You are an AI assistant for a professional beauty salon & spa. Your role is to help clients with inquiries via SMS, acting as a friendly, kind front desk person. 

Key responsibilities:
- Help clients book, reschedule, or cancel appointments
- Provide accurate information about services and pricing based on the knowledge provided
- Answer questions about salon policies, hours, and services
- Promote current specials and discounts when relevant
- Be friendly, professional, and conversational
- If you can't handle a request, offer to have someone call them

Important guidelines:
- Always be warm and welcoming in your tone
- Provide helpful, informative responses based on the business knowledge provided
- Never make up information - only use what's in the business knowledge
- Remember details about clients from their conversation history
- For complex requests, offer to have a staff member call them
- If unsure about availability, suggest they call or text to speak with staff

Your personality:
- You are a friendly, helpful front desk person at a beauty salon & spa
- You are knowledgeable about beauty services and treatments
- You are enthusiastic about helping clients look and feel their best
- You respond in a personable, conversational manner
- You provide excellent customer service

Below is specific information about the business that you should use when responding to customers:
"""
        
        # Combine base prompt with business knowledge
        return base_prompt + "\n\n" + business_knowledge
    
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
            # Check if this is a booking-related conversation (synchronous call)
            conversation_result = self.conversation_manager.process_message(
                phone_number, user_message, client_info
            )
            
            # Log conversation result for debugging
            self.logger.info(f"Conversation result for {phone_number}: {conversation_result}")
            
            # If conversation manager handled it, use that response
            if conversation_result.get("requires_booking", False):
                self.logger.info(f"Using conversation manager response for {phone_number}")
                return conversation_result["response"]
            
            # Otherwise, use AI for general responses
            self.logger.info(f"Using AI response for {phone_number}")
            prompt = self._build_prompt(user_message, client_info, phone_number, context)
            
            # Get conversation history for context
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            
            # Add recent conversation messages if available
            conversation_summary = self.conversation_manager.get_conversation_summary(phone_number)
            if conversation_summary and 'temp_data' in conversation_summary and 'messages' in conversation_summary['temp_data']:
                history = conversation_summary['temp_data']['messages']
                # Include up to 5 most recent messages for context
                for msg in history[-5:]:
                    if 'role' in msg and 'content' in msg:
                        messages.append({"role": msg['role'], "content": msg['content']})
            
            # Add current prompt as the most recent user message
            messages.append({"role": "user", "content": prompt})
            
            # Generate response using OpenAI with conversation history
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=400,  # Increased for more detailed responses
                temperature=0.7  # Balanced creativity
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
        Synchronous version of generate_response for testing
        """
        try:
            # Check if this is a booking-related conversation
            conversation_result = self.conversation_manager.process_message(
                phone_number, user_message, client_info
            )
            
            # Log conversation result for debugging
            self.logger.info(f"Conversation result for {phone_number}: {conversation_result}")
            
            # If conversation manager handled it, use that response
            if conversation_result.get("requires_booking", False):
                self.logger.info(f"Using conversation manager response for {phone_number}")
                return conversation_result["response"]
            
            # Otherwise, use AI for general responses
            self.logger.info(f"Using AI response for {phone_number}")
            prompt = self._build_prompt(user_message, client_info, phone_number, context)
            
            # Get conversation history for context
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            
            # Add recent conversation messages if available
            conversation_summary = self.conversation_manager.get_conversation_summary(phone_number)
            if conversation_summary and 'temp_data' in conversation_summary and 'messages' in conversation_summary['temp_data']:
                history = conversation_summary['temp_data']['messages']
                # Include up to 5 most recent messages for context
                for msg in history[-5:]:
                    if 'role' in msg and 'content' in msg:
                        messages.append({"role": msg['role'], "content": msg['content']})
            
            # Add current prompt as the most recent user message
            messages.append({"role": "user", "content": prompt})
            
            # Generate response using OpenAI with conversation history
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=400,  # Increased for more detailed responses
                temperature=0.7  # Balanced creativity
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
            prompt_parts.append(f"## Client Information:")
            prompt_parts.append(f"- Name: {client_info.name or 'Unknown'}")
            prompt_parts.append(f"- Phone: {client_info.phone}")
            if client_info.email:
                prompt_parts.append(f"- Email: {client_info.email}")
            if client_info.total_appointments:
                prompt_parts.append(f"- Total appointments: {client_info.total_appointments}")
            if client_info.last_appointment:
                prompt_parts.append(f"- Last appointment: {client_info.last_appointment}")
            if client_info.upcoming_appointments:
                prompt_parts.append(f"- Upcoming appointments: {len(client_info.upcoming_appointments)}")
                for i, appt in enumerate(client_info.upcoming_appointments[:3]):
                    prompt_parts.append(f"  * Appointment {i+1}: {appt.service} on {appt.date}")
            if client_info.preferences:
                prompt_parts.append(f"- Preferences: {client_info.preferences}")
            prompt_parts.append("")
        
        # Add conversation context
        conversation_summary = self.conversation_manager.get_conversation_summary(phone_number)
        if conversation_summary:
            prompt_parts.append(f"## Conversation Context:")
            prompt_parts.append(f"- Current step: {conversation_summary['step']}")
            if conversation_summary.get('selected_service'):
                prompt_parts.append(f"- Selected service: {conversation_summary['selected_service']}")
            if conversation_summary.get('selected_date'):
                prompt_parts.append(f"- Selected date: {conversation_summary['selected_date']}")
            if conversation_summary.get('selected_time'):
                prompt_parts.append(f"- Selected time: {conversation_summary['selected_time']}")
            
            # Include conversation history/temporary data if available
            if 'temp_data' in conversation_summary and conversation_summary['temp_data']:
                prompt_parts.append("\nConversation History:")
                for key, value in conversation_summary['temp_data'].items():
                    if key != 'messages':
                        prompt_parts.append(f"- {key}: {value}")
                
                # If there are stored messages, include recent ones
                if 'messages' in conversation_summary['temp_data']:
                    messages = conversation_summary['temp_data'].get('messages', [])
                    if messages:
                        prompt_parts.append("\nRecent Messages:")
                        # Only include the last 5 messages to avoid excessive context
                        for msg in messages[-5:]:
                            if 'role' in msg and 'content' in msg:
                                prompt_parts.append(f"- {msg['role']}: {msg['content']}")
            prompt_parts.append("")
        
        # Add context information
        if context:
            prompt_parts.append("## Additional Context:")
            for key, value in context.items():
                prompt_parts.append(f"- {key}: {value}")
            prompt_parts.append("")
        
        # Add user message
        prompt_parts.append(f"## User Message: {user_message}")
        prompt_parts.append("")
        prompt_parts.append("Please provide a helpful, friendly, and conversational response as a salon front desk person. Be specific about the salon's services and policies based on the business information provided in the system prompt.")
        
        return "\n".join(prompt_parts)
    
    async def analyze_intent(self, message: str) -> Dict[str, Any]:
        """
        Analyze user intent from message
        
        Args:
            message: User's message
            
        Returns:
            dict: Intent analysis results
        """
        try:
            prompt = f"""Analyze the following SMS message and determine the user's intent:

Message: "{message}"

Please respond with a JSON object containing:
- intent: The primary intent (booking, cancellation, reschedule, inquiry, complaint, etc.)
- confidence: Confidence score (0-1)
- entities: Any relevant entities (dates, times, services, etc.)
- requires_human: Whether this requires human intervention (true/false)

Response format:
{{
    "intent": "booking",
    "confidence": 0.9,
    "entities": {{"service": "haircut", "date": "tomorrow"}},
    "requires_human": false
}}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an intent analysis system. Respond only with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.1
            )
            
            import json
            result = json.loads(response.choices[0].message.content.strip())
            return result
            
        except Exception as e:
            self.logger.error(f"Error analyzing intent: {str(e)}")
            return {
                "intent": "unknown",
                "confidence": 0.0,
                "entities": {},
                "requires_human": True
            }
    
    async def check_health(self) -> dict:
        """
        Check LLM service health
        
        Returns:
            dict: Health status information
        """
        try:
            # Test OpenAI API with a simple request
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            
            return {
                "status": "healthy",
                "model": self.model,
                "api_key_configured": bool(self.api_key)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    def update_system_prompt(self, new_prompt: str):
        """
        Update the system prompt
        
        Args:
            new_prompt: New system prompt
        """
        self.system_prompt = new_prompt
        self.logger.info("System prompt updated")
    
    def set_model_parameters(self, model: str = None, max_tokens: int = None, temperature: float = None):
        """
        Update model parameters
        
        Args:
            model: Model name
            max_tokens: Maximum tokens for response
            temperature: Temperature for response generation
        """
        if model:
            self.model = model
        if max_tokens:
            self.max_tokens = max_tokens
        if temperature is not None:
            self.temperature = temperature
    
    def get_conversation_state(self, phone_number: str) -> Optional[Dict[str, Any]]:
        """
        Get current conversation state for a phone number
        
        Args:
            phone_number: Phone number to get state for
            
        Returns:
            dict: Conversation state or None if not found
        """
        return self.conversation_manager.get_conversation_summary(phone_number)
    
    def clear_conversation(self, phone_number: str):
        """
        Clear conversation state for a phone number
        
        Args:
            phone_number: Phone number to clear state for
        """
        self.conversation_manager.clear_conversation(phone_number) 