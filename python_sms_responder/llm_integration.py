"""
LLM Integration module for existing webhook handler.

This module provides a simple way to integrate LLM capabilities
into an existing Twilio webhook without disrupting current automations.
"""

import os
import logging
from typing import Dict, Any, Optional, Tuple

# Import required components
from business_knowledge import BusinessKnowledge
from llm_service import LLMService
from models import ClientInfo
from sms_service import SMSService
from real_time_connector import RealTimeDataConnector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("llm_integration")

class LLMIntegration:
    """Integration class for adding LLM capabilities to existing webhook handler"""
    
    def __init__(self):
        """Initialize LLM integration components"""
        # Initialize services
        self.business_knowledge = None
        self.llm_service = None
        self.sms_service = None
        
        try:
            self.business_knowledge = BusinessKnowledge()
            logger.info("Business knowledge initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize business knowledge: {e}")
        
        try:
            self.llm_service = LLMService()
            logger.info("LLM service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize LLM service: {e}")
        
        try:
            self.sms_service = SMSService()
            logger.info("SMS service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize SMS service: {e}")
    
    def is_automation_message(self, message: str) -> bool:
        """
        Determine if a message should be handled by automation rather than LLM.
        
        Args:
            message: The SMS message text
            
        Returns:
            bool: True if message should be handled by automation, False if it should go to LLM
        """
        # Common patterns for automation messages
        automation_keywords = [
            "confirm", "cancel", "reschedule", "yes", "no", 
            "stop", "start", "help", "1", "2", "3", "4",
            "c", "y", "n", "cancel", "confirm"
        ]
        
        # Check for exact matches or starts with (case insensitive)
        message_lower = message.lower().strip()
        
        # Check if it's a single-word automation command
        if message_lower in automation_keywords:
            return True
            
        # Check for confirmation/cancellation responses
        if any(message_lower.startswith(kw) for kw in ["confirm", "cancel", "yes", "no"]):
            return True
        
        # More complex automation pattern matching
        if (len(message_lower.split()) <= 2 and  # Short messages
            any(kw in message_lower for kw in automation_keywords)):
            return True
            
        # Message doesn't match automation patterns
        return False

    async def get_client_info(self, phone_number: str) -> Optional[ClientInfo]:
        """
        Try to get client information from database based on phone number
        
        Args:
            phone_number: Client's phone number
            
        Returns:
            ClientInfo object if found, None otherwise
        """
        if not self.business_knowledge or not self.business_knowledge.real_time_connector:
            return None
            
        try:
            # This assumes your RealTimeDataConnector has a method to get client info
            # You might need to implement this method based on your database schema
            connector = self.business_knowledge.real_time_connector
            
            if hasattr(connector, "get_client_by_phone"):
                return await connector.get_client_by_phone(phone_number)
                
        except Exception as e:
            logger.error(f"Error getting client info: {e}")
            
        return None

    async def process_message(self, from_number: str, message: str) -> Tuple[bool, str]:
        """
        Process an SMS message and generate a response using LLM if appropriate
        
        Args:
            from_number: Sender's phone number
            message: Message content
            
        Returns:
            Tuple[bool, str]: (success flag, response message)
        """
        # Check if this is an automation message
        if self.is_automation_message(message):
            logger.info(f"Message from {from_number} appears to be for automation - skipping LLM")
            return False, ""
            
        # Not an automation message - use LLM
        logger.info(f"Processing message from {from_number} with LLM: {message}")
        
        if not self.llm_service:
            logger.error("LLM service not initialized")
            return False, "I'm sorry, our AI assistant is currently unavailable. Please call us directly for assistance."
            
        try:
            # Get client info if available
            client_info = await self.get_client_info(from_number)
            
            # Generate response using LLM
            response = await self.llm_service.generate_response(
                user_message=message,
                client_info=client_info,
                phone_number=from_number
            )
            
            return True, response
            
        except Exception as e:
            logger.error(f"Error processing message with LLM: {e}")
            return False, "I'm sorry, I'm having trouble processing your request. Please call us directly."

    async def send_response(self, to_number: str, message: str) -> bool:
        """
        Send an SMS response using the SMS service
        
        Args:
            to_number: Recipient's phone number
            message: Message to send
            
        Returns:
            bool: True if message sent successfully
        """
        if not self.sms_service:
            logger.error("SMS service not initialized")
            return False
            
        try:
            return await self.sms_service.send_sms(
                to=to_number,
                message=message
            )
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return False
            
    async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle a Twilio SMS webhook by extracting relevant info and processing with LLM if needed
        
        Args:
            webhook_data: The Twilio webhook data (usually from request.form or request.json)
            
        Returns:
            Dict: Result information
        """
        try:
            # Extract relevant fields from webhook data
            from_number = webhook_data.get("From") or webhook_data.get("from")
            to_number = webhook_data.get("To") or webhook_data.get("to")
            message = webhook_data.get("Body") or webhook_data.get("body") or ""
            message_sid = webhook_data.get("MessageSid") or webhook_data.get("messageId") or ""
            
            if not from_number or not message:
                logger.error("Missing required webhook data")
                return {
                    "success": False,
                    "error": "Missing required webhook data",
                    "llm_handled": False
                }
                
            # Check if this should be handled by LLM
            if self.is_automation_message(message):
                # This is an automation message, don't process with LLM
                return {
                    "success": True,
                    "llm_handled": False,
                    "message": "Automation message - not processed by LLM"
                }
                
            # Process with LLM
            llm_success, llm_response = await self.process_message(from_number, message)
            
            if not llm_success:
                return {
                    "success": False,
                    "llm_handled": True,
                    "error": "Failed to process with LLM",
                    "response": llm_response if llm_response else None
                }
                
            # Send response via SMS
            send_success = await self.send_response(from_number, llm_response)
            
            return {
                "success": send_success,
                "llm_handled": True,
                "response": llm_response,
                "message": "Message processed by LLM and response sent" if send_success else "Message processed but failed to send response"
            }
            
        except Exception as e:
            logger.error(f"Error in handle_webhook: {e}")
            return {
                "success": False,
                "llm_handled": False,
                "error": str(e)
            }

# Singleton instance for easy import
_instance = None

def get_llm_integration():
    """Get or create the LLM integration instance"""
    global _instance
    if _instance is None:
        _instance = LLMIntegration()
    return _instance
