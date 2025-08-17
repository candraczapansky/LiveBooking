import os
import logging
import hmac
import hashlib
import base64
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from database_service import DatabaseService, get_db_service

# --- Pydantic Models for Type Safety ---

class PaymentInitiateRequest(BaseModel):
    amount: float
    terminalId: str
    bookingId: str

# --- Setup ---

logger = logging.getLogger(__name__)
router = APIRouter()
HELICM_API_TOKEN = os.getenv("HELICM_API_TOKEN")
HELICM_WEBHOOK_SECRET = os.getenv("HELICM_WEBHOOK_SECRET")

# --- API Endpoint to Start a Payment ---

@router.post("/payments/initiate")
async def initiate_payment(
    request_data: PaymentInitiateRequest,
    db: DatabaseService = Depends(get_db_service)
):
    logger.info(f"Initiating payment for booking ID: {request_data.bookingId}")
    
    if not HELICM_API_TOKEN:
        raise HTTPException(status_code=500, detail="Helcim API token is not configured.")

    # **ACTION 1: Call Helcim to start the payment**
    # This is where you would use the actual Helcim SDK.
    # For now, we simulate the call and the response.
    transaction_id = f"MOCK_{request_data.bookingId}"
    helcim_response = {
        "success": True,
        "transactionId": transaction_id,
        "status": "processing",
        "message": "Payment initiated on terminal."
    }

    # **ACTION 2: Create a PENDING transaction in our database**
    db.create_pending_transaction(
        booking_id=request_data.bookingId,
        transaction_id=transaction_id,
        amount=request_data.amount
    )
    logger.info(f"Pending transaction {transaction_id} saved to database.")

    return helcim_response

# --- Webhook Endpoint to Receive Payment Confirmation ---

@router.get("/webhooks/helcim")
async def validate_helcim_webhook():
    """
    Handles Helcim's initial GET request to validate the webhook URL.
    This is required for Helcim to accept and save the webhook configuration.
    """
    logger.info("✅ Received Helcim validation GET request. Responding with OK.")
    return {
        "status": "validation_successful",
        "message": "Webhook endpoint is ready to receive Helcim notifications",
        "endpoint": "/webhooks/helcim"
    }

@router.post("/webhooks/helcim")
async def handle_helcim_webhook(
    request: Request,
    db: DatabaseService = Depends(get_db_service)
):
    logger.info("Received Helcim webhook.")
    
    # Log all headers for debugging
    logger.info(f"Webhook headers: {dict(request.headers)}")
    
    raw_body = await request.body()
    logger.info(f"Webhook body: {raw_body.decode()}")
    
    # Check multiple possible signature header names that Helcim might use
    signature_header = (
        request.headers.get('webhook-signature') or
        request.headers.get('x-helcim-signature') or
        request.headers.get('x-webhook-signature') or
        request.headers.get('authorization') or
        request.headers.get('x-authorization')
    )
    logger.info(f"Signature header found: {signature_header}")

    # **ACTION 3: Verify the webhook signature for security**
    if not HELICM_WEBHOOK_SECRET:
        logger.error("Webhook secret not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured.")
    
    if not signature_header:
        logger.error("Webhook signature header missing. Checked headers: webhook-signature, x-helcim-signature, x-webhook-signature, authorization, x-authorization")
        # For debugging, let's see what headers are actually being sent
        logger.info(f"Available headers: {list(request.headers.keys())}")
        raise HTTPException(status_code=400, detail="Webhook signature header missing. Please check Helcim webhook configuration.")

    # Try different signature formats that Helcim might use
    try:
        # Remove 'Bearer ' prefix if present (common in Authorization headers)
        if signature_header.startswith('Bearer '):
            signature_header = signature_header[7:]
        
        # Try base64 decode first (our expected format)
        try:
            hasher = hmac.new(HELICM_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256)
            expected_signature = base64.b64encode(hasher.digest()).decode()
            logger.info(f"Expected signature (base64): {expected_signature}")
            
            if hmac.compare_digest(expected_signature, signature_header):
                logger.info("Webhook signature verified successfully (base64 format).")
                signature_verified = True
            else:
                signature_verified = False
        except Exception as e:
            logger.info(f"Base64 signature verification failed: {e}")
            signature_verified = False
        
        # If base64 failed, try hex format (some services use this)
        if not signature_verified:
            try:
                hasher = hmac.new(HELICM_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256)
                expected_signature_hex = hasher.hexdigest()
                logger.info(f"Expected signature (hex): {expected_signature_hex}")
                
                if hmac.compare_digest(expected_signature_hex, signature_header):
                    logger.info("Webhook signature verified successfully (hex format).")
                    signature_verified = True
                else:
                    signature_verified = False
            except Exception as e:
                logger.info(f"Hex signature verification failed: {e}")
                signature_verified = False
        
        if not signature_verified:
            logger.error("Invalid webhook signature. Tried both base64 and hex formats.")
            logger.error(f"Received signature: {signature_header}")
            raise HTTPException(status_code=403, detail="Invalid signature. Please check webhook secret configuration.")
            
    except Exception as e:
        logger.error(f"Error during signature verification: {e}")
        raise HTTPException(status_code=500, detail=f"Signature verification error: {str(e)}")

    # **ACTION 4: Process the event and update our database**
    try:
        event_data = await request.json()
        logger.info(f"Event data: {event_data}")
        
        transaction_id = event_data.get("transactionId")
        status = event_data.get("status")  # This will be 'APPROVED' or 'DECLINED'

        if status == 'APPROVED':
            db.update_transaction_status(transaction_id, "completed")
            logger.info(f"Transaction {transaction_id} status updated to COMPLETED.")
        else:
            db.update_transaction_status(transaction_id, "failed")
            logger.warning(f"Transaction {transaction_id} status updated to FAILED.")

        return {"status": "received", "transaction_id": transaction_id, "status": status}
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")

# --- Legacy Webhook Endpoint for Backward Compatibility ---
# This handles the old webhook URL that Helcim might still be using

@router.post("/webhook/helcim")
async def handle_legacy_helcim_webhook(
    request: Request,
    db: DatabaseService = Depends(get_db_service)
):
    logger.info("Received legacy Helcim webhook at /webhook/helcim")
    # Forward to the new webhook handler
    return await handle_helcim_webhook(request, db)

# --- Webhook Health Check Endpoints ---
# Note: GET /webhooks/helcim is handled above for Helcim validation

@router.get("/webhook/helcim")
async def legacy_webhook_health_check():
    """Legacy health check endpoint"""
    return {
        "status": "active",
        "endpoint": "/webhook/helcim",
        "message": "Legacy Helcim webhook endpoint is ready"
    }

# --- Test Webhook Endpoint (No Signature Required) ---
# Use this for testing webhook functionality without signature verification

@router.post("/webhooks/helcim/test")
async def test_helcim_webhook(
    request: Request,
    db: DatabaseService = Depends(get_db_service)
):
    logger.info("Received TEST Helcim webhook (no signature verification)")
    
    try:
        raw_body = await request.body()
        logger.info(f"Test webhook body: {raw_body.decode()}")
        
        event_data = await request.json()
        logger.info(f"Test event data: {event_data}")
        
        transaction_id = event_data.get("transactionId")
        status = event_data.get("status")
        
        if status == 'APPROVED':
            db.update_transaction_status(transaction_id, "completed")
            logger.info(f"TEST: Transaction {transaction_id} status updated to COMPLETED.")
        else:
            db.update_transaction_status(transaction_id, "failed")
            logger.info(f"TEST: Transaction {transaction_id} status updated to FAILED.")
        
        return {"status": "test_webhook_processed", "transaction_id": transaction_id, "status": status}
    except Exception as e:
        logger.error(f"Error processing test webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing test webhook: {str(e)}")

# --- Temporary Test Endpoint (No Signature, Simulates Helcim) ---
# Use this to test webhook processing without external access

@router.post("/webhooks/helcim/simulate")
async def simulate_helcim_webhook(
    request: Request,
    db: DatabaseService = Depends(get_db_service)
):
    """Simulates a Helcim webhook for testing purposes"""
    logger.info("Received SIMULATED Helcim webhook")
    
    try:
        raw_body = await request.body()
        logger.info(f"Simulated webhook body: {raw_body.decode()}")
        
        event_data = await request.json()
        logger.info(f"Simulated event data: {event_data}")
        
        transaction_id = event_data.get("transactionId")
        status = event_data.get("status")
        
        if status == 'APPROVED':
            db.update_transaction_status(transaction_id, "completed")
            logger.info(f"SIMULATED: Transaction {transaction_id} status updated to COMPLETED.")
        else:
            db.update_transaction_status(transaction_id, "failed")
            logger.info(f"SIMULATED: Transaction {transaction_id} status updated to FAILED.")
        
        return {
            "status": "simulated_webhook_processed", 
            "transaction_id": transaction_id, 
            "status": status,
            "message": "This was a simulated webhook for testing"
        }
    except Exception as e:
        logger.error(f"Error processing simulated webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing simulated webhook: {str(e)}")

# --- Debug Webhook Endpoint (Shows Raw Data) ---
# Use this to see exactly what Helcim is sending

@router.post("/webhooks/helcim/debug")
async def debug_helcim_webhook(request: Request):
    """Debug endpoint to see exactly what Helcim is sending"""
    logger.info("=== DEBUG WEBHOOK RECEIVED ===")
    
    # Log all headers
    headers = dict(request.headers)
    logger.info(f"All headers: {headers}")
    
    # Log raw body
    raw_body = await request.body()
    logger.info(f"Raw body: {raw_body}")
    
    # Try to parse JSON
    try:
        body_text = raw_body.decode('utf-8')
        logger.info(f"Body as text: {body_text}")
        
        if body_text.strip():
            import json
            parsed_json = json.loads(body_text)
            logger.info(f"Parsed JSON: {parsed_json}")
        else:
            logger.info("Body is empty")
    except Exception as e:
        logger.info(f"Could not parse body as JSON: {e}")
    
    logger.info("=== END DEBUG WEBHOOK ===")
    
    return {
        "status": "debug_received",
        "headers": headers,
        "body_size": len(raw_body),
        "message": "Check server logs for detailed webhook information"
    }
