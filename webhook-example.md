# Appointment Webhook API

## Overview
The appointment webhook API allows external frontend applications to create new appointments in this calendar system. The webhook automatically handles client, service, and staff creation if they don't exist.

## Endpoint
**POST** `/api/appointments/webhook`

## Required Fields
- `startTime` (ISO string) - Appointment start time
- `endTime` (ISO string) - Appointment end time

## Optional Fields
- `clientId` (number) - Existing client ID
- `serviceId` (number) - Existing service ID  
- `staffId` (number) - Existing staff ID
- `status` (string) - Appointment status (default: "confirmed")
- `notes` (string) - Appointment notes
- `externalAppointmentId` (string) - External system reference ID

## Auto-Creation Objects
If IDs are not provided, you can include these objects to auto-create entities:

### clientInfo
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "phone": "555-123-4567",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "NY",
  "zipCode": "12345"
}
```

### serviceInfo
```json
{
  "name": "Haircut",
  "description": "Professional haircut service",
  "price": 50,
  "duration": 60,
  "categoryName": "Hair Services",
  "color": "#3b82f6"
}
```

### staffInfo
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@salon.com",
  "title": "Senior Stylist",
  "bio": "Professional stylist with 5+ years experience"
}
```

## Example Request
```bash
curl -X POST http://your-domain.com/api/appointments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-07-01T10:00:00Z",
    "endTime": "2025-07-01T11:00:00Z",
    "status": "confirmed",
    "notes": "New client booking",
    "externalAppointmentId": "ext-12345",
    "clientInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "555-123-4567"
    },
    "serviceInfo": {
      "name": "Haircut",
      "price": 50,
      "duration": 60,
      "categoryName": "Hair Services"
    },
    "staffInfo": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@salon.com",
      "title": "Senior Stylist"
    }
  }'
```

## Response
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "appointment": {
    "id": 123,
    "clientId": 45,
    "serviceId": 67,
    "staffId": 89,
    "startTime": "2025-07-01T10:00:00Z",
    "endTime": "2025-07-01T11:00:00Z",
    "status": "confirmed",
    "totalAmount": 50
  },
  "createdEntities": {
    "client": { "id": 45, "created": true },
    "service": { "id": 67, "created": true },
    "staff": { "id": 89, "created": true }
  }
}
```

## Features
- **Auto-creation**: Automatically creates clients, services, and staff if they don't exist
- **Conflict detection**: Checks for scheduling conflicts with existing appointments
- **Automation triggers**: Triggers booking confirmation emails/SMS
- **Notifications**: Creates system notifications for new appointments
- **Price calculation**: Automatically calculates appointment total from service pricing

## Error Responses
- **400**: Missing required fields or validation errors
- **409**: Scheduling conflict with existing appointment
- **500**: Server error during processing

## Testing
Test the endpoint status:
```bash
curl -X GET http://your-domain.com/api/appointments/webhook
```