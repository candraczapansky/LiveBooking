#!/usr/bin/env python3
import requests
import json

# Test the webhook health check
print("Testing webhook health check...")
try:
    response = requests.get("http://localhost:8000/webhooks/helcim")
    print(f"Health check status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Health check error: {e}")

print("\nTesting test webhook...")
try:
    test_data = {
        "transactionId": "TEST123",
        "status": "APPROVED"
    }
    response = requests.post(
        "http://localhost:8000/webhooks/helcim/test",
        json=test_data
    )
    print(f"Test webhook status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Test webhook error: {e}")
