#!/usr/bin/env python3
"""
Simple test server to verify basic Python deployment
"""
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from simple test server!", "status": "working"}

@app.get("/test")
def test_endpoint():
    return {"message": "Test endpoint working!", "timestamp": "now"}

if __name__ == "__main__":
    print("🚀 Starting simple test server...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 