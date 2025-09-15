#!/bin/bash

# Test creating a membership subscription
echo "Testing membership subscription creation..."

# Get first client ID
CLIENT_ID=$(curl -s http://localhost:3002/api/users | python3 -c "import sys, json; data = json.load(sys.stdin); clients = [u for u in data if u.get('role') == 'client']; print(clients[0]['id'] if clients else 0)")

# Get first membership ID  
MEMBERSHIP_ID=$(curl -s http://localhost:3002/api/memberships | python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0]['id'] if data else 0)")

echo "Using Client ID: $CLIENT_ID"
echo "Using Membership ID: $MEMBERSHIP_ID"

if [ "$CLIENT_ID" != "0" ] && [ "$MEMBERSHIP_ID" != "0" ]; then
  # Create subscription
  START_DATE=$(date -Iseconds)
  END_DATE=$(date -d "+30 days" -Iseconds 2>/dev/null || date -v+30d -Iseconds)
  
  echo "Creating subscription..."
  curl -X POST http://localhost:3002/api/client-memberships \
    -H "Content-Type: application/json" \
    -d "{
      \"clientId\": $CLIENT_ID,
      \"membershipId\": $MEMBERSHIP_ID,
      \"startDate\": \"$START_DATE\",
      \"endDate\": \"$END_DATE\",
      \"active\": true,
      \"autoRenew\": false
    }" 2>/dev/null | python3 -m json.tool
else
  echo "Could not find client or membership to test with"
fi
