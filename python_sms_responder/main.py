from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sms_service import SMSService
from llm_service import LLMService
from database_service import DatabaseService
from voice_service import VoiceService
from models import SMSRequest, SMSResponse, VoiceRequest, VoiceResponse

# Load environment variables
load_dotenv()

def send_appointment_confirmation_email(db_service, appointment_id: int, client_email: str):
    """Send appointment confirmation email (placeholder)"""
    try:
        # For now, just log that we would send an email
        # Email sending can be implemented later with proper async handling
        print(f"Would send confirmation email to {client_email} for appointment {appointment_id}")
        
    except Exception as e:
        print(f"Error with confirmation email: {e}")

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

@app.on_event("startup")
async def startup_event():
    """Initialize all services when the application starts"""
    print("🚀 [STARTUP] FastAPI application starting...")
    success = initialize_services()
    if success:
        print("🚀 [STARTUP] Application ready to handle requests!")
    else:
        print("❌ [STARTUP] Application started but services failed to initialize!")

# Initialize services lazily
_sms_service = None
_llm_service = None
_db_service = None
_voice_service = None

def initialize_services():
    """Initialize and link all services together"""
    global _sms_service, _llm_service, _db_service, _voice_service
    
    print("🔧 [INIT] Initializing services...")
    
    try:
        # 1. Create database service
        print("🔧 [INIT] Creating database service...")
        _db_service = DatabaseService()
        print("✅ Database service created successfully")
        
        # 2. Create LLM service
        print("🔧 [INIT] Creating LLM service...")
        _llm_service = LLMService()
        print("✅ LLM service created successfully")
        
        # 3. Create SMS service
        print("🔧 [INIT] Creating SMS service...")
        _sms_service = SMSService()
        print("✅ SMS service created successfully")
        
        # 4. Create voice service
        print("🔧 [INIT] Creating voice service...")
        _voice_service = VoiceService()
        print("✅ Voice service created successfully")
        
        # 5. Link services together (CRITICAL STEP!)
        print("🔧 [INIT] Linking services together...")
        _llm_service.set_db_service(_db_service)
        print("✅ LLM service linked to database service")
        print("✅ Conversation manager initialized in LLM service")
        
        print("🎉 [INIT] All services initialized and linked successfully!")
        return True
        
    except Exception as e:
        print(f"❌ [INIT] Error initializing services: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def get_sms_service():
    """Get SMS service instance"""
    global _sms_service
    if _sms_service is None:
        print("⚠️ [WARNING] SMS service not initialized!")
    return _sms_service

def get_llm_service():
    """Get LLM service instance"""
    global _llm_service
    if _llm_service is None:
        print("⚠️ [WARNING] LLM service not initialized!")
    return _llm_service

def get_db_service():
    """Get database service instance"""
    global _db_service
    if _db_service is None:
        print("⚠️ [WARNING] Database service not initialized!")
    return _db_service

def get_voice_service():
    """Get voice service instance"""
    global _voice_service
    if _voice_service is None:
        print("⚠️ [WARNING] Voice service not initialized!")
    return _voice_service

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Salon SMS Responder is running", "status": "healthy"}

@app.get("/test")
async def test_page():
    """Serve the test page"""
    try:
        with open("../test-sms-web.html", "r") as f:
            html_content = f.read()
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content)
    except Exception as e:
        return {"error": f"Could not load test page: {str(e)}"}

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
        # Format phone numbers properly (add + if missing)
        from_phone = From if From.startswith('+') else f"+{From}" if From else From
        to_phone = To if To.startswith('+') else f"+{To}" if To else To
        
        # Create SMSRequest object from form data
        request = SMSRequest(
            From=from_phone,
            To=to_phone,
            Body=Body,
            MessageSid=MessageSid,
            AccountSid=AccountSid,
            NumMedia=NumMedia
        )
        
        # Log the incoming message
        print(f"Received SMS from {request.From}: {request.Body}")
        
        try:
            print(f"\n📱 [WEBHOOK] SMS received from {request.From}: '{request.Body}'")
            
            # Get pre-initialized services
            print(f"📱 [WEBHOOK] Getting services...")
            db_service = get_db_service()
            llm_service = get_llm_service()
            sms_service = get_sms_service()
            
            print(f"📱 [WEBHOOK] Service status:")
            print(f"   - Database: {'✅ Available' if db_service else '❌ Not available'}")
            print(f"   - LLM: {'✅ Available' if llm_service else '❌ Not available'}")
            print(f"   - SMS: {'✅ Available' if sms_service else '❌ Not available'}")
            
            if not all([db_service, llm_service, sms_service]):
                print(f"❌ [WEBHOOK] CRITICAL: Some services not available!")
                raise Exception("Required services not available")
            
            # Services are already linked during startup - no need to call set_db_service again
            print(f"📱 [WEBHOOK] Services already linked during startup")
            
            # Get client information from database
            print(f"📱 [WEBHOOK] Getting client info for {request.From}...")
            client_info = db_service.get_client_by_phone(request.From)
            print(f"📱 [WEBHOOK] Client info: {'✅ Found' if client_info else '❌ Not found'}")
            
            # Generate AI response using LLM
            print(f"📱 [WEBHOOK] Calling LLM service with message: '{request.Body}'")
            response_data = await llm_service.generate_response(
                user_message=request.Body,
                client_info=client_info,
                phone_number=request.From
            )
            
            print(f"📱 [WEBHOOK] LLM service returned: {response_data}")
            
            # Handle appointment booking if needed
            if isinstance(response_data, dict) and response_data.get("booking_confirmed"):
                # Send confirmation email
                try:
                    send_appointment_confirmation_email(
                        db_service,
                        response_data["appointment_id"],
                        response_data.get("client_email")
                    )
                except Exception as e:
                    print(f"Error sending confirmation email: {e}")
            
            # Get the response text
            ai_response = response_data if isinstance(response_data, str) else response_data.get("response", "")
            print(f"🔍 Final response to send: '{ai_response}'")
            
        except Exception as e:
            print(f"Error processing SMS: {e}")
            ai_response = "I'm sorry, I'm having trouble processing your request. Please call us directly."
        
        # Send response via Twilio
        response_sent = False
        if sms_service:
            try:
                response_sent = sms_service.send_sms(
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
            raise HTTPException(status_code=500, detail="Voice service not available")
        
        # Create initial TwiML response
        twiml_response = voice_service.create_initial_response(request.CallSid)
        
        return VoiceResponse(
            success=True,
            message="Voice call processed successfully",
            twiml_response=twiml_response,
            call_sid=request.CallSid
        )
        
    except Exception as e:
        print(f"Error processing voice call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing voice call: {str(e)}")

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
            raise HTTPException(status_code=500, detail="Voice service not available")
        
        # Process speech and generate response
        if request.SpeechResult:
            twiml_response = voice_service.create_processing_response(
                request.CallSid, 
                request.SpeechResult
            )
        else:
            # No speech detected, create fallback response
            twiml_response = voice_service.create_initial_response(request.CallSid)
        
        return VoiceResponse(
            success=True,
            message="Voice processing completed successfully",
            twiml_response=twiml_response,
            call_sid=request.CallSid
        )
        
    except Exception as e:
        print(f"Error processing voice input: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing voice input: {str(e)}")

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

@app.post("/test/sms")
async def test_sms_endpoint(
    message: str = Form(...),
    from_phone: str = Form("+15551234567")
):
    """
    Test endpoint for SMS conversation - simulates receiving an SMS
    """
    try:
        print(f"\n🧪 [TEST] TEST MODE - Simulating SMS from {from_phone}: {message}")
        
        # Get services
        print(f"🧪 [TEST] Getting services...")
        db_service = get_db_service()
        llm_service = get_llm_service()
        sms_service = get_sms_service()
        
        print(f"🧪 [TEST] Service status:")
        print(f"   - Database: {'✅ Available' if db_service else '❌ Not available'}")
        print(f"   - LLM: {'✅ Available' if llm_service else '❌ Not available'}")
        print(f"   - SMS: {'✅ Available' if sms_service else '❌ Not available'}")
        
        if not all([db_service, llm_service, sms_service]):
            print(f"❌ [TEST] CRITICAL: Some services not available!")
            raise Exception("Required services not available")
        
        # Services are already linked during startup - no need to call set_db_service again
        print(f"🧪 [TEST] Services already linked during startup")
        
        # Get client information from database
        print(f"🧪 [TEST] Getting client info for {from_phone}...")
        client_info = db_service.get_client_by_phone(from_phone)
        print(f"🧪 [TEST] Client info: {'✅ Found' if client_info else '❌ Not found'}")
        
        # Generate AI response using LLM
        print(f"🧪 [TEST] Calling LLM service with message: '{message}'")
        response_data = await llm_service.generate_response(
            user_message=message,
            client_info=client_info,
            phone_number=from_phone
        )
        
        print(f"🧪 [TEST] LLM service returned: {response_data}")
        
        # Send response via SMS service (will be simulated for test numbers)
        response_sent = False
        if sms_service:
            try:
                response_sent = sms_service.send_sms(
                    to=from_phone,
                    message=response_data
                )
            except Exception as e:
                print(f"SMS service error: {e}")
        
        return {
            "success": True,
            "message": "Test SMS processed successfully",
            "ai_response": response_data,
            "response_sent": response_sent,
            "test_mode": True
        }
        
    except Exception as e:
        print(f"Error in test SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in test SMS: {str(e)}")

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
        health_status["services"]["sms_service"] = sms_service.check_health()
    else:
        health_status["services"]["sms_service"] = {"status": "unavailable", "error": "Not configured"}
    
    if llm_service:
        health_status["services"]["llm_service"] = await llm_service.check_health()
    else:
        health_status["services"]["llm_service"] = {"status": "unavailable", "error": "Not configured"}
    
    if db_service:
        health_status["services"]["database_service"] = db_service.check_health()
    else:
        health_status["services"]["database_service"] = {"status": "unavailable", "error": "Not configured"}
    
    if voice_service:
        health_status["services"]["voice_service"] = voice_service.check_health()
    else:
        health_status["services"]["voice_service"] = {"status": "unavailable", "error": "Not configured"}
    
    return health_status

if __name__ == "__main__":
    uvicorn.run(
        "python_sms_responder.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 