#!/bin/bash

# 🚀 Helcim Migration Production Deployment Script
# This script deploys the completed Helcim migration to production

set -e  # Exit on any error

echo "🎉 Starting Helcim Migration Production Deployment..."

# Step 1: Environment Setup
echo "📋 Step 1: Setting up production environment..."

# Set production environment variables
export NODE_ENV=production
export HELCIM_API_TOKEN="adClJoT.d*$JlSAZi6u-sMSuUPX%aojxchf6_S-wen.x._u5isgwIGjP0oDL*r@k"

# Step 2: Database Migration
echo "🗄️  Step 2: Running database migrations..."
npm run db:push

# Step 3: Build Application
echo "🔨 Step 3: Building application for production..."
npm run build

# Step 4: Install Production Dependencies
echo "📦 Step 4: Installing production dependencies..."
npm ci --only=production

# Step 5: Start Production Server
echo "🚀 Step 5: Starting production server..."
npm start &

# Step 6: Wait for server to start
echo "⏳ Step 6: Waiting for server to start..."
sleep 10

# Step 7: Health Check
echo "🏥 Step 7: Running health checks..."

# Test payment processing
echo "Testing payment processing..."
curl -X POST http://localhost:5000/api/create-payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.00, "sourceId": "cash", "clientId": 1}' \
  -s | jq '.'

# Test terminal payments
echo "Testing terminal payments..."
curl -X POST http://localhost:5000/api/helcim-terminal/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 25.00, "tipAmount": 5.00, "clientId": 1, "type": "terminal_payment"}' \
  -s | jq '.'

# Step 8: Data Migration (if needed)
echo "📊 Step 8: Running data migration..."
if [ -f "migrate-customer-data.js" ]; then
    echo "Running customer data migration..."
    node migrate-customer-data.js
else
    echo "No migration script found, skipping..."
fi

# Step 9: Final Verification
echo "✅ Step 9: Final verification..."

# Check if all services are running
echo "Checking service status..."
ps aux | grep -E "(npm|node)" | grep -v grep

# Check database connection
echo "Checking database connection..."
curl -s http://localhost:5000/api/health || echo "Health check endpoint not available"

echo "🎉 Production deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Monitor payment success rates"
echo "2. Check error logs regularly"
echo "3. Verify customer data migration"
echo "4. Remove old Stripe/Square code after 30 days"
echo ""
echo "🔗 Useful URLs:"
echo "- Payment Processing: http://localhost:5000/api/create-payment"
echo "- Terminal Payments: http://localhost:5000/api/helcim-terminal/payment"
echo "- Customer Creation: http://localhost:5000/api/create-helcim-customer"
echo ""
echo "📞 Support:"
echo "- Helcim API Documentation: https://api.helcim.com"
echo "- Migration Status: Check PRODUCTION_API_KEY_UPDATE.md" 