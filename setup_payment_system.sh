#!/bin/bash

echo "🚀 Payment System Setup Script"
echo "================================"
echo ""

# Check if payment.env exists
if [ ! -f "payment.env" ]; then
    echo "❌ payment.env file not found. Creating template..."
    cat > payment.env << EOF
# Helcim API Configuration
HELICM_API_TOKEN=your_helcim_api_token_here
HELICM_WEBHOOK_SECRET=your_webhook_secret_here

# Server Configuration
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=info
EOF
    echo "✅ Created payment.env template"
    echo ""
    echo "📝 Please edit payment.env with your actual values:"
    echo "   - Get HELICM_API_TOKEN from your Helcim dashboard"
    echo "   - Generate HELICM_WEBHOOK_SECRET (32+ characters)"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if environment variables are set
echo "🔍 Checking environment configuration..."

# Source the environment file
source payment.env

# Check required variables
if [ "$HELICM_API_TOKEN" = "your_helcim_api_token_here" ] || [ -z "$HELICM_API_TOKEN" ]; then
    echo "❌ HELICM_API_TOKEN not configured"
    echo "   Please edit payment.env with your actual Helcim API token"
    exit 1
fi

if [ "$HELICM_WEBHOOK_SECRET" = "your_webhook_secret_here" ] || [ -z "$HELICM_WEBHOOK_SECRET" ]; then
    echo "❌ HELICM_WEBHOOK_SECRET not configured"
    echo "   Please edit payment.env with your actual webhook secret"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Check if Python dependencies are installed
echo "🔍 Checking Python dependencies..."
if ! python -c "import fastapi, uvicorn, pydantic" 2>/dev/null; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
else
    echo "✅ Python dependencies already installed"
fi

echo ""

# Test server startup
echo "🧪 Testing server configuration..."
if python -c "from main import app; print('✅ App imports successfully')" 2>/dev/null; then
    echo "✅ Server configuration is valid"
else
    echo "❌ Server configuration has errors"
    exit 1
fi

echo ""

# Show webhook URLs
echo "🌐 Webhook Configuration"
echo "========================"
echo "Primary Webhook:   https://yourdomain.com/webhooks/helcim"
echo "Legacy Webhook:    https://yourdomain.com/webhook/helcim"
echo "Test Webhook:      https://yourdomain.com/webhooks/helcim/test"
echo ""

# Show next steps
echo "🎯 Next Steps"
echo "=============="
echo "1. ✅ Environment variables configured"
echo "2. ✅ Python dependencies installed"
echo "3. ✅ Server configuration validated"
echo "4. 🔧 Configure Helcim webhooks (see HELCIM_WEBHOOK_SETUP.md)"
echo "5. 🚀 Start the server: python start_payment_server.py"
echo ""

echo "📚 Documentation:"
echo "   - HELICM_WEBHOOK_SETUP.md - Webhook configuration guide"
echo "   - PAYMENT_SYSTEM_README.md - System overview"
echo ""

echo "🎉 Setup complete! You can now start the payment server."
