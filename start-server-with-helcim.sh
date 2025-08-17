#!/bin/bash

# Set Helcim environment variables
export HELCIM_API_TOKEN='adClJoT.d*$JlSAZi6u-sMSuUPX%aojxchf6_S-wen.x._u5isgwIGjP0oDL*r@k'
export HELCIM_API_URL='https://api.helcim.com/v1'

echo "Starting server with Helcim environment variables..."
echo "HELCIM_API_TOKEN: ${HELCIM_API_TOKEN:0:10}..."
echo "HELCIM_API_URL: $HELCIM_API_URL"

# Start the server
npm start 