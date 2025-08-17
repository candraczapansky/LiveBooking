#!/bin/bash

echo "🚀 Starting server with Helcim API token..."

# Set the Helcim API token
export HELCIM_API_TOKEN="adClJoT.d*$JlSAZi6u-sMSuUPX%aojxchf6_S-wen.x._u5isgwIGjP0oDL*r@k"

echo "✅ Helcim API Token set: ${HELCIM_API_TOKEN:0:10}..."

# Start the server
echo "🌐 Starting server..."
npm start 