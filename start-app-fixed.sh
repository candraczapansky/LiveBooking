#!/bin/bash
# Script to start the application with correct domain settings and fixed authenticateJWT issue

# Set environment variables
export CUSTOM_DOMAIN=https://www.glofloapp.com
export VITE_API_BASE_URL=https://www.glofloapp.com

# Print confirmation
echo "Starting server with domain: $CUSTOM_DOMAIN"

# Start in development mode for easier debugging
echo "Starting in development mode..."
npm run dev









