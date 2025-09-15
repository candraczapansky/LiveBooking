#!/bin/bash

# Set the correct domain environment variables
export CUSTOM_DOMAIN="https://glofloapp.com"
export VITE_API_BASE_URL="https://glofloapp.com"

echo "Starting app with domain configuration:"
echo "  CUSTOM_DOMAIN=$CUSTOM_DOMAIN"
echo "  VITE_API_BASE_URL=$VITE_API_BASE_URL"

# Start the development server with these environment variables
npm run dev
