#!/bin/bash
echo "🚀 Deploying Payment Server to Replit Hosting..."

# Stop any local server
pkill -f "start_payment_server" 2>/dev/null || true

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Test the server locally first
echo "🧪 Testing server locally..."
python -c "from main import app; print('✅ Server imports successfully')"

echo ""
echo "🎯 Next Steps:"
echo "1. Click the 'Run' button in Replit (top right)"
echo "2. Wait for deployment to complete"
echo "3. Copy the hosted URL (should appear in the console)"
echo "4. Use that URL in your Helcim webhook configuration"
echo ""
echo "💡 The webhook URL will look like:"
echo "   https://your-repl-name.your-username.replit.dev/webhooks/helcim"
echo ""
echo "🔍 To test after deployment:"
echo "   curl -X GET https://your-repl-url.com/webhooks/helcim"
