import os
import json
from openai import OpenAI
import logging
from typing import Optional, Dict, Any
from models import ClientInfo, LLMRequest, LLMResponse
from conversation_manager import ConversationManager

class LLMService:
    """Service for handling LLM operations via OpenAI"""
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("Missing OpenAI API key")
        
        self.client = OpenAI(api_key=self.api_key)
        self.logger = logging.getLogger(__name__)
        
        # Default model and parameters
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")
        self.max_tokens = 150
        self.temperature = 0.7
        
        # Initialize conversation manager
        self.conversation_manager = ConversationManager()
        
        # System prompt for salon context
        self.system_prompt = self._get_system_prompt()
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for Glo Head Spa SMS responses"""
        return """You are an AI assistant for Glo Head Spa, a luxury head spa in Tulsa specializing in Japanese scalp treatments. 

PERSONALITY:
- Be super friendly, bubbly, and enthusiastic! 💆‍♀️✨
- Keep responses concise (under 160 chars for SMS)
- Always maintain a positive, welcoming tone
- Make every client feel special and valued!

SERVICES WE OFFER (ONLY THESE):
- Signature Head Spa ($99, 60min)
- Deluxe Head Spa ($160, 90min)  
- Platinum Head Spa ($220, 120min)
- Korean Glass Skin Facial ($130, 60min)
- Buccal Massage Facial ($190, 90min)
- Face Lifting Massage Facial ($150, 60min)

KEY RULES:
- ONLY mention services listed above - NO exceptions
- For simple greetings (Hi/Hello), just welcome them warmly
- Don't assume booking intent from greetings
- Times like "9am" are appointment times, not service requests
- Offer to have staff call for complex requests

Business Hours: Mon-Sat 9AM-7PM, Sun 10AM-5PM
Phone: (918) 727-7348
Cancellation: 24hr notice required"""
    
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
    
    def _load_business_knowledge(self) -> Dict:
        """Load business knowledge from JSON file"""
        try:
            knowledge_path = os.path.join(os.path.dirname(__file__), 'business_knowledge.json')
            with open(knowledge_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Error loading business knowledge: {str(e)}")
            return {}
    
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
        business_knowledge = self._load_business_knowledge()
        
        # Add client context if available
        if client_info:
            prompt_parts.append(f"Client Information:")
            prompt_parts.append(f"- Name: {client_info.name or 'Unknown'}")
            prompt_parts.append(f"- Phone: {client_info.phone}")
            prompt_parts.append(f"- Client Type: {'Returning' if client_info.total_appointments > 0 else 'New'}")
            if client_info.total_appointments:
                prompt_parts.append(f"- Total appointments: {client_info.total_appointments}")
            if client_info.last_appointment:
                prompt_parts.append(f"- Last appointment: {client_info.last_appointment}")
            if client_info.upcoming_appointments:
                prompt_parts.append(f"- Upcoming appointments: {len(client_info.upcoming_appointments)}")
            prompt_parts.append("")
        
        # Add available services from business knowledge
        if business_knowledge:
            services = business_knowledge.get('services', {})
            if services:
                prompt_parts.append("Available Services:")
                for category, service_list in services.items():
                    if category != 'add_ons' and service_list:  # Skip add-ons for brevity
                        for service in service_list[:3]:  # Limit to top 3 per category
                            prompt_parts.append(f"- {service['name']}: {service['price']} ({service['duration']}min)")
                prompt_parts.append("")
        
        # Add conversation context
        conversation_summary = self.conversation_manager.get_conversation_summary(phone_number)
        if conversation_summary:
            prompt_parts.append(f"Conversation Context:")
            prompt_parts.append(f"- Current step: {conversation_summary['step']}")
            if conversation_summary['selected_service']:
                prompt_parts.append(f"- Selected service: {conversation_summary['selected_service']}")
            if conversation_summary['selected_date']:
                prompt_parts.append(f"- Selected date: {conversation_summary['selected_date']}")
            if conversation_summary['selected_time']:
                prompt_parts.append(f"- Selected time: {conversation_summary['selected_time']}")
            prompt_parts.append("")
        
        # Add real-time availability if provided
        if context and 'available_slots' in context:
            prompt_parts.append("Available Appointment Times:")
            slots = context.get('available_slots', {})
            for date, times in list(slots.items())[:2]:  # Next 2 days
                if times:
                    time_list = [t.get('formatted_time', t.get('time', '')) for t in times[:4]]
                    prompt_parts.append(f"- {date}: {', '.join(time_list)}")
            prompt_parts.append("")
        
        # Add user message
        prompt_parts.append(f"User Message: {user_message}")
        prompt_parts.append("")
        prompt_parts.append("Generate a friendly, helpful response with emojis (max 160 chars):")
        
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