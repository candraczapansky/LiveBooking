"""
Unified AI Context for all communication channels (SMS, Voice, Email)
This module provides consistent business context and personality across all AI responders.
"""

import os
import json
from typing import Dict, Any, Optional
from datetime import datetime

class UnifiedAIContext:
    """
    Provides unified context and personality for AI responders across all channels
    """
    
    def __init__(self):
        """Initialize unified context with business information"""
        self.business_info = self._load_business_info()
        self.personality_traits = self._define_personality()
        self.response_guidelines = self._define_guidelines()
    
    def _load_business_info(self) -> Dict[str, Any]:
        """Load business information from configuration"""
        try:
            # Try to load from business_knowledge.json
            knowledge_path = os.path.join(os.path.dirname(__file__), 'business_knowledge.json')
            with open(knowledge_path, 'r') as f:
                return json.load(f)
        except:
            # Fallback to hardcoded values
            return {
                "business": {
                    "name": "Glo Head Spa",
                    "address": "Tulsa, Oklahoma",
                    "phone": "(918) 727-7348",
                    "email": "hello@headspaglo.com",
                    "hours": {
                        "monday": "9:00 AM - 7:00 PM",
                        "tuesday": "9:00 AM - 7:00 PM",
                        "wednesday": "9:00 AM - 7:00 PM",
                        "thursday": "9:00 AM - 7:00 PM",
                        "friday": "9:00 AM - 7:00 PM",
                        "saturday": "9:00 AM - 7:00 PM",
                        "sunday": "10:00 AM - 5:00 PM"
                    }
                },
                "services": {
                    "head_spa": [
                        {"name": "Signature Head Spa", "price": "$99", "duration": 60},
                        {"name": "Deluxe Head Spa", "price": "$160", "duration": 90},
                        {"name": "Platinum Head Spa", "price": "$220", "duration": 120}
                    ],
                    "facials": [
                        {"name": "Korean Glass Skin Facial", "price": "$130", "duration": 60},
                        {"name": "Buccal Massage Facial", "price": "$190", "duration": 90}
                    ]
                }
            }
    
    def _define_personality(self) -> Dict[str, str]:
        """Define consistent personality traits across all channels"""
        return {
            "tone": "friendly, enthusiastic, and professional",
            "style": "warm and welcoming with a touch of luxury",
            "energy": "bubbly and positive",
            "approach": "helpful and solution-oriented",
            "emojis": "use appropriately for the channel (more in SMS, less in voice)"
        }
    
    def _define_guidelines(self) -> Dict[str, list]:
        """Define response guidelines for all channels"""
        return {
            "always": [
                "Be enthusiastic and make clients feel special",
                "Only mention services that actually exist",
                "Provide accurate pricing and timing",
                "Maintain professional boundaries",
                "Respect the 24-hour cancellation policy"
            ],
            "never": [
                "Make up services or prices",
                "Assume booking intent from simple greetings",
                "Promise availability without checking",
                "Share other clients' information",
                "Be pushy or aggressive with sales"
            ],
            "escalate_when": [
                "Client is upset or complaining",
                "Complex scheduling conflicts",
                "Medical or allergy concerns",
                "Payment disputes",
                "Special requests outside normal services"
            ]
        }
    
    def get_system_prompt(self, channel: str = "sms") -> str:
        """
        Get the system prompt for a specific communication channel
        
        Args:
            channel: The communication channel (sms, voice, email)
            
        Returns:
            str: The system prompt tailored for the channel
        """
        business = self.business_info.get("business", {})
        services = self.business_info.get("services", {})
        
        # Base prompt for all channels
        base_prompt = f"""You are an AI assistant for {business.get('name', 'Glo Head Spa')}, a luxury head spa in {business.get('address', 'Tulsa, Oklahoma')} specializing in Japanese scalp treatments.

PERSONALITY:
- {self.personality_traits['tone']}
- {self.personality_traits['style']}
- {self.personality_traits['energy']}
- {self.personality_traits['approach']}

SERVICES WE OFFER (ONLY THESE):"""
        
        # Add services
        for category, service_list in services.items():
            if category != 'add_ons':
                for service in service_list:
                    base_prompt += f"\n- {service['name']} ({service['price']}, {service['duration']}min)"
        
        base_prompt += f"""

BUSINESS HOURS:
Monday-Saturday: 9:00 AM - 7:00 PM
Sunday: 10:00 AM - 5:00 PM
Phone: {business.get('phone', '(918) 727-7348')}

KEY RULES:"""
        
        for rule in self.response_guidelines['always']:
            base_prompt += f"\n- {rule}"
        
        base_prompt += "\n\nNEVER:"
        for rule in self.response_guidelines['never']:
            base_prompt += f"\n- {rule}"
        
        # Channel-specific adjustments
        if channel == "sms":
            base_prompt += """

SMS SPECIFIC:
- Keep responses under 160 characters
- Use emojis to add warmth 💆‍♀️✨
- Be concise but friendly
- Offer to call for complex issues"""
        
        elif channel == "voice":
            base_prompt += """

VOICE SPECIFIC:
- Use natural, conversational language
- Speak clearly and at a moderate pace
- Be extra warm and welcoming
- Repeat important information
- Avoid emojis (this is voice!)"""
        
        elif channel == "email":
            base_prompt += """

EMAIL SPECIFIC:
- Can be slightly longer and more detailed
- Use professional formatting
- Include all relevant information
- Sign off professionally
- Minimal emoji use (professional context)"""
        
        return base_prompt
    
    def get_greeting(self, channel: str = "sms", time_of_day: Optional[str] = None) -> str:
        """
        Get an appropriate greeting for the channel and time
        
        Args:
            channel: The communication channel
            time_of_day: Optional time context (morning, afternoon, evening)
            
        Returns:
            str: An appropriate greeting
        """
        if not time_of_day:
            hour = datetime.now().hour
            if hour < 12:
                time_of_day = "morning"
            elif hour < 17:
                time_of_day = "afternoon"
            else:
                time_of_day = "evening"
        
        greetings = {
            "sms": {
                "morning": "Good morning! ☀️ Welcome to Glo Head Spa! How can we help you relax today? 💆‍♀️",
                "afternoon": "Hi there! 🌟 Thanks for texting Glo Head Spa! What can we do for you today? ✨",
                "evening": "Good evening! 🌙 Glo Head Spa here! How can we help you unwind? 💆‍♀️"
            },
            "voice": {
                "morning": "Good morning and thank you for calling Glo Head Spa! I'm so excited to help you today. How can we make your day more relaxing?",
                "afternoon": "Good afternoon! Welcome to Glo Head Spa! I'm here to help with all your relaxation needs. What can I do for you today?",
                "evening": "Good evening! Thank you for calling Glo Head Spa! How can we help you unwind this evening?"
            },
            "email": {
                "morning": "Good morning!\n\nThank you for contacting Glo Head Spa. We're delighted to hear from you.",
                "afternoon": "Good afternoon!\n\nThank you for reaching out to Glo Head Spa. We appreciate your interest in our services.",
                "evening": "Good evening!\n\nThank you for your email to Glo Head Spa. We're here to help with all your relaxation needs."
            }
        }
        
        return greetings.get(channel, greetings["sms"]).get(time_of_day, greetings[channel]["afternoon"])
    
    def format_service_list(self, channel: str = "sms", include_prices: bool = True) -> str:
        """
        Format the service list appropriately for the channel
        
        Args:
            channel: The communication channel
            include_prices: Whether to include prices
            
        Returns:
            str: Formatted service list
        """
        services = self.business_info.get("services", {})
        
        if channel == "sms":
            # Concise format for SMS
            result = []
            for service in services.get("head_spa", [])[:3]:  # Top 3 only
                if include_prices:
                    result.append(f"{service['name']} {service['price']}")
                else:
                    result.append(service['name'])
            return ", ".join(result)
        
        elif channel == "voice":
            # Natural speaking format for voice
            result = []
            for service in services.get("head_spa", []):
                if include_prices:
                    result.append(f"our {service['name']} for {service['price']}")
                else:
                    result.append(f"the {service['name']}")
            
            if len(result) > 1:
                return ", ".join(result[:-1]) + f", or {result[-1]}"
            return result[0] if result else "our head spa treatments"
        
        elif channel == "email":
            # Detailed format for email
            result = []
            for category, service_list in services.items():
                if category != "add_ons":
                    result.append(f"\n{category.replace('_', ' ').title()}:")
                    for service in service_list:
                        if include_prices:
                            result.append(f"  • {service['name']} - {service['price']} ({service['duration']} minutes)")
                        else:
                            result.append(f"  • {service['name']} ({service['duration']} minutes)")
            return "\n".join(result)
        
        return str(services)
    
    def should_escalate(self, message: str) -> bool:
        """
        Determine if a message should be escalated to human staff
        
        Args:
            message: The client's message
            
        Returns:
            bool: True if should escalate, False otherwise
        """
        escalate_keywords = [
            'angry', 'upset', 'complaint', 'manager', 'refund',
            'allergic', 'allergy', 'medical', 'pregnant', 'injury',
            'lawsuit', 'lawyer', 'dispute', 'charge', 'fraud',
            'emergency', 'urgent', 'immediately'
        ]
        
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in escalate_keywords)
    
    def get_escalation_response(self, channel: str = "sms") -> str:
        """
        Get an appropriate escalation response for the channel
        
        Args:
            channel: The communication channel
            
        Returns:
            str: Escalation response
        """
        responses = {
            "sms": "I understand this is important. Let me have a manager call you right away. What's the best number? 📞",
            "voice": "I understand your concern and want to make sure you get the best help. Let me transfer you to a manager who can assist you better.",
            "email": "Thank you for bringing this to our attention. This matter requires personal attention from our management team. We will contact you directly within 24 hours to resolve this issue.\n\nIf you need immediate assistance, please call us at (918) 727-7348."
        }
        
        return responses.get(channel, responses["sms"])

# Singleton instance
_unified_context = None

def get_unified_context() -> UnifiedAIContext:
    """Get or create the singleton unified context instance"""
    global _unified_context
    if _unified_context is None:
        _unified_context = UnifiedAIContext()
    return _unified_context
