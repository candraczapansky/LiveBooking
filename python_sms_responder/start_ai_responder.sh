#!/bin/bash

# Kill any existing Python processes
pkill -f "python.*main" 2>/dev/null || true
pkill -f uvicorn 2>/dev/null || true
sleep 1

# Export webhook base URL
export WEBHOOK_BASE_URL="https://dev-booking-91625-candraczapansky.replit.app"

# Start the Python AI responder
cd /home/runner/workspace/python_sms_responder
echo "Starting AI Responder..."
python main.py
