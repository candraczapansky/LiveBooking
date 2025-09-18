#!/bin/bash

echo "🚀 Starting Glo Head Spa Voice & SMS Responder..."

# Check if we're in the right directory
if [ ! -d "python_sms_responder" ]; then
    echo "❌ Error: python_sms_responder directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed!"
    exit 1
fi

# Navigate to Python responder directory
cd python_sms_responder

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || echo "⚠️ Could not activate venv"

# Install requirements
echo "📦 Installing requirements..."
pip install -r requirements.txt 2>/dev/null || pip install fastapi uvicorn twilio openai python-dotenv psycopg2-binary

# Start the service
echo "✅ Starting service on port 8000..."
echo "📞 Voice webhook will be at: http://localhost:8000/webhook/voice"
echo "📱 SMS webhook will be at: http://localhost:8000/webhook/sms"
echo ""
echo "🔧 Next steps:"
echo "1. Open a new terminal"
echo "2. Run: ./ngrok http 8000"
echo "3. Copy the ngrok URL (https://xxxxx.ngrok.io)"
echo "4. Update Twilio webhook to: https://xxxxx.ngrok.io/webhook/voice"
echo ""
echo "Starting server..."
echo "------------------------"

# Start the FastAPI server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
