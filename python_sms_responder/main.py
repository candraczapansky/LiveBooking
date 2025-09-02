from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

from .sms_service import SMSService
from .llm_service import LLMService
from .database_service import DatabaseService
from .voice_service import VoiceService
from .models import SMSRequest, SMSResponse, VoiceRequest, VoiceResponse

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Salon SMS Responder",
    description="AI-powered SMS responder for salon appointment management",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services lazily
_sms_service = None
_llm_service = None
_db_service = None
_voice_service = None

def get_sms_service():
    """Get SMS service instance"""
    global _sms_service
    if _sms_service is None:
        try:
            _sms_service = SMSService()
        except Exception as e:
            print(f"Warning: SMS Service initialization failed: {e}")
            _sms_service = None
    return _sms_service

def get_llm_service():
    """Get LLM service instance"""
    global _llm_service
    if _llm_service is None:
        try:
            _llm_service = LLMService()
        except Exception as e:
            print(f"Warning: LLM Service initialization failed: {e}")
            _llm_service = None
    return _llm_service

def get_db_service():
    """Get database service instance"""
    global _db_service
    if _db_service is None:
        try:
            _db_service = DatabaseService()
        except Exception as e:
            print(f"Warning: Database Service initialization failed: {e}")
            _db_service = None
    return _db_service

def get_voice_service():
    """Get voice service instance"""
    global _voice_service
    if _voice_service is None:
        try:
            _voice_service = VoiceService()
        except Exception as e:
            print(f"Warning: Voice Service initialization failed: {e}")
            _voice_service = None
    return _voice_service

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Salon SMS Responder is running", "status": "healthy"}

@app.post("/webhook/sms", response_model=SMSResponse)
async def handle_sms_webhook(
    From: str = Form(...),
    To: str = Form(...),
    Body: str = Form(...),
    MessageSid: str = Form(...),
    AccountSid: str = Form(...),
    NumMedia: str = Form("0")
):
    """
    Handle incoming SMS webhook from Twilio
    """
    try:
        # Create SMSRequest object from form data
        request = SMSRequest(
            From=From,
            To=To,
            Body=Body,
            MessageSid=MessageSid,
            AccountSid=AccountSid,
            NumMedia=NumMedia
        )
        
        # Log the incoming message
        print(f"Received SMS from {request.From}: {request.Body}")
        
        # Get services
        db_service = get_db_service()
        llm_service = get_llm_service()
        sms_service = get_sms_service()
        
        # Get client information from database
        client_info = None
        if db_service:
            client_info = await db_service.get_client_by_phone(request.From)
        
        # Generate AI response using LLM
        ai_response = "Thank you for your message. Please call us directly for assistance."
        if llm_service:
            try:
                ai_response = await llm_service.generate_response(
                    user_message=request.Body,
                    client_info=client_info,
                    phone_number=request.From
                )
            except Exception as e:
                print(f"LLM service error: {e}")
                ai_response = "I'm sorry, I'm having trouble processing your request. Please call us directly."
        
        # Send response via Twilio
        response_sent = False
        if sms_service:
            try:
                response_sent = await sms_service.send_sms(
                    to=request.From,
                    message=ai_response
                )
            except Exception as e:
                print(f"SMS service error: {e}")
        
        if response_sent:
            return SMSResponse(
                success=True,
                message="SMS processed and response sent successfully",
                ai_response=ai_response
            )
        else:
            return SMSResponse(
                success=True,
                message="SMS processed but response not sent (service unavailable)",
                ai_response=ai_response
            )
            
    except Exception as e:
        print(f"Error processing SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing SMS: {str(e)}")

@app.post("/webhook/voice")
async def handle_voice_webhook(
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
    AccountSid: str = Form(...),
    CallStatus: str = Form(...),
    SpeechResult: str = Form(None),
    SpeechConfidence: str = Form(None),
    CallDuration: str = Form(None)
):
    """
    Handle incoming voice call webhook from Twilio
    """
    from fastapi.responses import Response
    from twilio.twiml.voice_response import VoiceResponse
    
    try:
        # Create VoiceRequest object from form data
        request = VoiceRequest(
            CallSid=CallSid,
            From=From,
            To=To,
            AccountSid=AccountSid,
            CallStatus=CallStatus,
            SpeechResult=SpeechResult,
            SpeechConfidence=SpeechConfidence,
            CallDuration=CallDuration
        )
        
        # Log the incoming call
        print(f"Received voice call from {request.From} (CallSid: {request.CallSid})")
        
        # Get voice service
        voice_service = get_voice_service()
        
        if not voice_service:
            print("ERROR: Voice service not available - creating fallback response")
            # Create fallback TwiML response
            response = VoiceResponse()
            response.say(
                "I'm sorry, our system is temporarily unavailable. Please try again later.",
                voice='alice',
                language='en-US'
            )
            response.hangup()
            return Response(content=str(response), media_type="application/xml")
        
        # Create initial TwiML response
        twiml_response = voice_service.create_initial_response(request.CallSid)
        
        # Return TwiML directly for Twilio
        return Response(content=twiml_response, media_type="application/xml")
        
    except Exception as e:
        import traceback
        print(f"ERROR processing voice call: {str(e)}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        
        # Create error TwiML response
        response = VoiceResponse()
        response.say(
            "I'm sorry, an error occurred. Please try again later.",
            voice='alice',
            language='en-US'
        )
        response.hangup()
        return Response(content=str(response), media_type="application/xml")

@app.post("/webhook/voice/process")
async def handle_voice_processing(
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
    AccountSid: str = Form(...),
    CallStatus: str = Form(...),
    SpeechResult: str = Form(None),
    SpeechConfidence: str = Form(None),
    CallDuration: str = Form(None)
):
    """
    Handle voice call processing with speech recognition
    """
    from fastapi.responses import Response
    from twilio.twiml.voice_response import VoiceResponse
    
    try:
        # Create VoiceRequest object from form data
        request = VoiceRequest(
            CallSid=CallSid,
            From=From,
            To=To,
            AccountSid=AccountSid,
            CallStatus=CallStatus,
            SpeechResult=SpeechResult,
            SpeechConfidence=SpeechConfidence,
            CallDuration=CallDuration
        )
        
        # Log the speech input
        print(f"Processing speech from {request.From}: {request.SpeechResult}")
        
        # Get voice service
        voice_service = get_voice_service()
        
        if not voice_service:
            print("ERROR: Voice service not available - creating fallback response")
            # Create fallback TwiML response
            response = VoiceResponse()
            response.say(
                "I'm sorry, our system is temporarily unavailable. Please try again later.",
                voice='alice',
                language='en-US'
            )
            response.hangup()
            return Response(content=str(response), media_type="application/xml")
        
        # Process speech and generate response
        if request.SpeechResult:
            twiml_response = voice_service.create_processing_response(
                request.CallSid, 
                request.SpeechResult
            )
        else:
            # No speech detected, create fallback response
            twiml_response = voice_service.create_initial_response(request.CallSid)
        
        # Return TwiML directly for Twilio
        return Response(content=twiml_response, media_type="application/xml")
        
    except Exception as e:
        import traceback
        print(f"ERROR processing voice input: {str(e)}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        
        # Create error TwiML response
        response = VoiceResponse()
        response.say(
            "I'm sorry, an error occurred while processing your request. Please try again later.",
            voice='alice',
            language='en-US'
        )
        response.hangup()
        return Response(content=str(response), media_type="application/xml")

@app.post("/webhook/voice/status")
async def handle_call_status_update(
    CallSid: str = Form(...),
    CallStatus: str = Form(...),
    CallDuration: str = Form(None)
):
    """
    Handle call status updates (call ended, etc.)
    """
    try:
        print(f"Call status update: {CallSid} - {CallStatus}")
        
        # Get voice service
        voice_service = get_voice_service()
        
        if voice_service and CallStatus in ['completed', 'failed', 'busy', 'no-answer']:
            # Clean up conversation history when call ends
            voice_service.cleanup_conversation(CallSid)
        
        return {"success": True, "message": "Call status processed"}
        
    except Exception as e:
        print(f"Error processing call status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing call status: {str(e)}")

@app.get("/voice/status/{call_sid}")
async def get_call_status(call_sid: str):
    """
    Get status information about a specific call
    """
    try:
        voice_service = get_voice_service()
        
        if not voice_service:
            raise HTTPException(status_code=500, detail="Voice service not available")
        
        status = voice_service.get_call_status(call_sid)
        
        if "error" in status:
            raise HTTPException(status_code=404, detail=status["error"])
        
        return status
        
    except Exception as e:
        print(f"Error getting call status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting call status: {str(e)}")

@app.get("/health")
async def health_check():
    """Detailed health check"""
    sms_service = get_sms_service()
    llm_service = get_llm_service()
    db_service = get_db_service()
    voice_service = get_voice_service()
    
    health_status = {
        "status": "healthy",
        "services": {}
    }
    
    if sms_service:
        health_status["services"]["sms_service"] = await sms_service.check_health()
    else:
        health_status["services"]["sms_service"] = {"status": "unavailable", "error": "Not configured"}
    
    if llm_service:
        health_status["services"]["llm_service"] = await llm_service.check_health()
    else:
        health_status["services"]["llm_service"] = {"status": "unavailable", "error": "Not configured"}
    
    if db_service:
        health_status["services"]["database_service"] = await db_service.check_health()
    else:
        health_status["services"]["database_service"] = {"status": "unavailable", "error": "Not configured"}
    
    if voice_service:
        health_status["services"]["voice_service"] = voice_service.check_health()
    else:
        health_status["services"]["voice_service"] = {"status": "unavailable", "error": "Not configured"}
    
    return health_status

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 