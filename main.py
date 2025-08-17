from fastapi import FastAPI
import logging
import os
from payments import router as payments_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Payment Processing API", version="1.0.0")

# Include all the routes from our payments.py file
app.include_router(payments_router)

@app.get("/")
def read_root():
    return {"status": "healthy", "message": "Payment Processing Server is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "endpoints": ["/payments/initiate", "/webhooks/helcim"]}

if __name__ == "__main__":
    import uvicorn
    # Get port from environment variable (Replit sets this) or default to 8000
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    logging.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
