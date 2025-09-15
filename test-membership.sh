#!/bin/bash

echo "Testing direct membership subscription creation..."

# Create a test subscription for cash payment
START_DATE=$(date -Iseconds)
END_DATE=$(date -d "+30 days" -Iseconds 2>/dev/null || date -v+30d -Iseconds)

echo "Creating cash membership subscription..."
curl -X POST http://localhost:5000/api/client-memberships \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": 6,
    \"membershipId\": 6,
    \"startDate\": \"$START_DATE\",
    \"endDate\": \"$END_DATE\",
    \"active\": true,
    \"autoRenew\": false
  }" | python3 -m json.tool

echo -e "\n\nCreating payment record..."
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": 6,
    \"clientMembershipId\": 1,
    \"amount\": 89,
    \"totalAmount\": 89,
    \"method\": \"cash\",
    \"status\": \"completed\",
    \"type\": \"membership\",
    \"description\": \"Test membership payment\",
    \"paymentDate\": \"$START_DATE\"
  }" | python3 -m json.tool
