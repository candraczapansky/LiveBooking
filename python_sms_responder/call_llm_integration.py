#!/usr/bin/env python3

"""
Bridge script to call LLM integration from Node.js webhook handler.
Receives webhook data via stdin and returns results via stdout.
"""

import os
import sys
import json
import asyncio
from typing import Dict, Any
import logging

# Make sure we can import from the current directory
sys.path.insert(0, os.path.dirname(__file__))

# Configure logging to file for debugging
logging.basicConfig(
    filename='llm_bridge.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('llm_bridge')

async def main():
    try:
        # Read webhook data from stdin
        webhook_data_str = sys.stdin.read()
        logger.info(f"Received data: {webhook_data_str[:100]}...")
        
        # Parse JSON webhook data
        webhook_data = json.loads(webhook_data_str)
        
        # Import LLM integration (import here to avoid circular imports)
        from llm_integration import get_llm_integration
        
        # Get LLM integration instance
        llm_integration = get_llm_integration()
        logger.info("LLM integration initialized")
        
        # Process the webhook data
        result = await llm_integration.handle_webhook(webhook_data)
        logger.info(f"LLM integration result: {result}")
        
        # Return result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"Error in LLM bridge: {e}")
        error_result = {
            "success": False,
            "llm_handled": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    # Run the async function
    asyncio.run(main())
