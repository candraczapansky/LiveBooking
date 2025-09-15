#!/bin/bash
# Script to start the server with the correct domain settings

# Set environment variables
export CUSTOM_DOMAIN=https://www.glofloapp.com
export VITE_API_BASE_URL=https://www.glofloapp.com

# Print confirmation
echo "Starting server with domain: $CUSTOM_DOMAIN"

# Build the application first (this ensures all code changes are included)
echo "Building application..."
npm run build

# Start the server
echo "Starting server..."
npm start









