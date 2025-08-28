#!/bin/bash

echo "Starting server with webhook debugging enabled..."
echo "Server will run on port 5000"
echo "================================================"

PORT=5000 npm run dev 2>&1 | tee server-debug.log
