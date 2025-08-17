#!/usr/bin/env python3
import requests
import json

# Test the payment endpoint
url = "http://localhost:8000/payments/initiate"
data = {
    "amount": 99.99,
    "terminalId": "TERM001", 
    "bookingId": "TEST123"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
