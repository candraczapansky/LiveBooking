#!/bin/bash

echo "Testing simple membership creation..."

# Use current date
START_DATE=$(date -Iseconds)
END_DATE=$(date -d "+30 days" -Iseconds 2>/dev/null || date -v+30d -Iseconds)

echo "Creating membership for client 5..."
curl -X POST http://localhost:5000/api/client-memberships \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": 5,
    \"membershipId\": 6,
    \"startDate\": \"$START_DATE\",
    \"endDate\": \"$END_DATE\",
    \"active\": true,
    \"autoRenew\": false
  }" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Success! Created membership ID:', data.get('id'))"

echo -e "\n\nFetching all memberships to verify..."
curl -s http://localhost:5000/api/client-memberships | python3 -c "import sys, json; data = json.load(sys.stdin); print(f'Total memberships: {len(data)}'); [print(f'  - Client {m[\"clientId\"]} (Membership {m[\"id\"]})') for m in data[:5]]"
