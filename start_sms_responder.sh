#!/bin/bash

# Set environment variables (if not already in .env)
export OPENAI_API_KEY=${OPENAI_API_KEY:-"your_openai_key_here"}
export TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID:-"your_twilio_sid_here"}
export TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN:-"your_twilio_token_here"}
export TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER:-"your_twilio_number_here"}
export DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:password@localhost:5432/salon_db"}
export ADMIN_TOKEN=${ADMIN_TOKEN:-"admin123"}
export BUSINESS_KNOWLEDGE_FILE=${BUSINESS_KNOWLEDGE_FILE:-"business_knowledge.json"}

# Check if Python virtual environment exists, create if it doesn't
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements if needed
if [ ! -f "requirements.txt" ]; then
    echo "Creating requirements.txt..."
    cat > requirements.txt << EOF
fastapi==0.95.1
uvicorn==0.22.0
python-dotenv==1.0.0
twilio==8.1.0
openai==1.7.0
pydantic==1.10.7
python-multipart==0.0.6
psycopg2-binary==2.9.6
EOF
fi

echo "Installing requirements..."
pip install -r requirements.txt

# Start the server
echo "Starting SMS Responder service..."
cd python_sms_responder
uvicorn main:app --host 0.0.0.0 --port 8000 --reload