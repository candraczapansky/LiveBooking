# Domain Configuration Guide

## Overview

This guide explains the configuration needed to ensure your forms and other links use the correct domain (`https://www.glofloapp.com`).

## Files Created/Modified

1. **Environment Files**:
   - `.env` - Contains domain settings for development
   - `.env.production` - Contains domain settings for production

2. **Startup Scripts**:
   - `start-server.sh` - Script that sets environment variables and starts the server

3. **Deployment Configuration**:
   - `ecosystem.config.js` - PM2 configuration file that includes domain settings

## How to Run the Server

### Option 1: Using the startup script
```bash
./start-server.sh
```

### Option 2: Using environment variables directly
```bash
export CUSTOM_DOMAIN=https://www.glofloapp.com
export VITE_API_BASE_URL=https://www.glofloapp.com
npm start
```

### Option 3: Using PM2 (recommended for production)
```bash
pm2 start ecosystem.config.js
```

## Verification

After starting the server, form links sent via SMS or email should now use the correct domain `https://www.glofloapp.com` and properly redirect back to your application when completed.

## Troubleshooting

If forms still use the old domain:
1. Confirm the server was started with the correct environment variables
2. Check that the build process completed successfully
3. Verify no cached values exist in the database that might override these settings









