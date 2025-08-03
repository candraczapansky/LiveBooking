from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class SMSRequest(BaseModel):
    """Model for incoming SMS webhook from Twilio"""
    From: str = Field(..., description="Phone number of the sender")
    To: str = Field(..., description="Phone number receiving the message")
    Body: str = Field(..., description="Content of the SMS message")
    MessageSid: str = Field(..., description="Unique message identifier")
    AccountSid: str = Field(..., description="Twilio account identifier")
    NumMedia: Optional[str] = Field("0", description="Number of media attachments")
    
class SMSResponse(BaseModel):
    """Model for SMS webhook response"""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    ai_response: Optional[str] = Field(None, description="AI-generated response sent to user")
    error: Optional[str] = Field(None, description="Error message if operation failed")

class ClientInfo(BaseModel):
    """Model for client information from database"""
    id: Optional[int] = None
    name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    last_appointment: Optional[datetime] = None
    upcoming_appointments: Optional[list] = None
    total_appointments: Optional[int] = None
    
class AppointmentInfo(BaseModel):
    """Model for appointment information"""
    id: int
    date: datetime
    service: str
    duration: int
    status: str
    notes: Optional[str] = None

class LLMRequest(BaseModel):
    """Model for LLM service requests"""
    user_message: str
    client_info: Optional[ClientInfo] = None
    phone_number: str
    context: Optional[Dict[str, Any]] = None

class LLMResponse(BaseModel):
    """Model for LLM service responses"""
    response: str
    confidence: float
    intent: Optional[str] = None
    suggested_actions: Optional[list] = None

class VoiceRequest(BaseModel):
    """Model for incoming voice webhook from Twilio"""
    CallSid: str = Field(..., description="Unique call identifier")
    From: str = Field(..., description="Phone number of the caller")
    To: str = Field(..., description="Phone number receiving the call")
    AccountSid: str = Field(..., description="Twilio account identifier")
    CallStatus: str = Field(..., description="Current status of the call")
    SpeechResult: Optional[str] = Field(None, description="Transcribed speech from user")
    SpeechConfidence: Optional[str] = Field(None, description="Confidence score of speech recognition")
    CallDuration: Optional[str] = Field(None, description="Duration of the call in seconds")
    
class VoiceResponse(BaseModel):
    """Model for voice webhook response"""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    twiml_response: Optional[str] = Field(None, description="TwiML response to send to Twilio")
    ai_response: Optional[str] = Field(None, description="AI-generated response")
    call_sid: Optional[str] = Field(None, description="Call identifier")
    error: Optional[str] = Field(None, description="Error message if operation failed")

class CallStatus(BaseModel):
    """Model for call status information"""
    call_sid: str
    status: str
    from_number: str
    to_number: str
    duration: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    conversation_messages: int = 0 