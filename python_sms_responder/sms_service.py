import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
import logging
from typing import Optional

class SMSService:
    """Service for handling SMS operations via Twilio"""
    
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER")
        
        if not all([self.account_sid, self.auth_token, self.from_number]):
            raise ValueError("Missing required Twilio environment variables")
        
        self.client = Client(self.account_sid, self.auth_token)
        self.logger = logging.getLogger(__name__)
    
    async def send_sms(self, to: str, message: str) -> bool:
        """
        Send SMS message via Twilio
        
        Args:
            to: Recipient phone number
            message: Message content
            
        Returns:
            bool: True if message sent successfully, False otherwise
        """
        try:
            # Clean phone number format
            to = self._format_phone_number(to)
            
            # Send message
            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to
            )
            
            self.logger.info(f"SMS sent successfully. SID: {message_obj.sid}")
            return True
            
        except TwilioException as e:
            self.logger.error(f"Twilio error sending SMS: {str(e)}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error sending SMS: {str(e)}")
            return False
    
    async def send_bulk_sms(self, recipients: list, message: str) -> dict:
        """
        Send SMS to multiple recipients
        
        Args:
            recipients: List of phone numbers
            message: Message content
            
        Returns:
            dict: Results of bulk send operation
        """
        results = {
            "successful": [],
            "failed": [],
            "total": len(recipients)
        }
        
        for phone in recipients:
            success = await self.send_sms(phone, message)
            if success:
                results["successful"].append(phone)
            else:
                results["failed"].append(phone)
        
        return results
    
    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for Twilio
        
        Args:
            phone: Raw phone number
            
        Returns:
            str: Formatted phone number
        """
        # Remove all non-digit characters
        digits = ''.join(filter(str.isdigit, phone))
        
        # Ensure it starts with country code
        if len(digits) == 10:
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith('1'):
            return f"+{digits}"
        elif len(digits) == 11:
            return f"+{digits}"
        else:
            # Assume it's already formatted
            return phone
    
    async def check_health(self) -> dict:
        """
        Check SMS service health
        
        Returns:
            dict: Health status information
        """
        try:
            # Test Twilio credentials by making a simple API call
            account = self.client.api.accounts(self.account_sid).fetch()
            
            return {
                "status": "healthy",
                "account_sid": self.account_sid,
                "from_number": self.from_number,
                "account_status": account.status
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    async def get_message_history(self, phone_number: str, limit: int = 10) -> list:
        """
        Get message history for a phone number
        
        Args:
            phone_number: Phone number to get history for
            limit: Maximum number of messages to retrieve
            
        Returns:
            list: List of message objects
        """
        try:
            messages = self.client.messages.list(
                to=phone_number,
                limit=limit
            )
            
            return [
                {
                    "sid": msg.sid,
                    "body": msg.body,
                    "direction": msg.direction,
                    "date_sent": msg.date_sent,
                    "status": msg.status
                }
                for msg in messages
            ]
        except Exception as e:
            self.logger.error(f"Error getting message history: {str(e)}")
            return [] 