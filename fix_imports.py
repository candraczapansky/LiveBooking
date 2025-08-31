#!/usr/bin/env python3

import os
import sys

# Get the absolute path of python_sms_responder
sms_responder_path = os.path.abspath(os.path.join(os.getcwd(), 'python_sms_responder'))

# Add the path to sys.path
if sms_responder_path not in sys.path:
    sys.path.insert(0, sms_responder_path)

# Import the FastAPI app
from python_sms_responder.main import app

# Run the app directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("fix_imports:app", host="0.0.0.0", port=8000, reload=True)
