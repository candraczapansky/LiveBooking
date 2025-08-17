#!/bin/bash

echo "🔧 Setting up Payment System Environment Variables"
echo "=================================================="

# Check if .env file exists
if [ -f "payment.env" ]; then
    echo "✅ Found payment.env file"
    echo "📝 Please edit payment.env with your actual values:"
    echo "   - HELICM_API_TOKEN=your_actual_token"
    echo "   - HELICM_WEBHOOK_SECRET=your_actual_secret"
    echo ""
    echo "Then run: source payment.env"
else
    echo "❌ payment.env file not found"
fi

echo ""
echo "🚀 To start the server with environment variables:"
echo "   1. Edit payment.env with your actual values"
echo "   2. Run: source payment.env"
echo "   3. Run: python start_payment_server.py"
echo ""
echo "🔒 For production, set these as system environment variables:"
echo "   export HELICM_API_TOKEN='your_token'"
echo "   export HELICM_WEBHOOK_SECRET='your_secret'"
