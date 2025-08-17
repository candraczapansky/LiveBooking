# Client Booking App Integration Guide

This guide explains how to connect your client booking app with the Glo Head Spa salon management system.

## Overview

Your salon management system already has a complete external API infrastructure that allows client booking apps to:
- Create appointments automatically
- Check staff availability
- Create new clients, services, and staff members as needed
- Handle scheduling conflicts and blocked time slots

## API Endpoints

### 1. Appointment Webhook (Main Integration Point)
- **URL**: `https://your-domain.com/api/appointments/webhook`
- **Method**: `POST`
- **Authentication**: Bearer token in Authorization header
- **Purpose**: Create new appointments from external booking systems

### 2. Health Check
- **URL**: `https://your-domain.com/api/external/health`
- **Method**: `GET`
- **Authentication**: None required
- **Purpose**: Verify API status and get endpoint information

### 3. Staff Availability
- **URL**: `https://your-domain.com/api/external/staff-availability`
- **Method**: `GET`
- **Authentication**: Optional (recommended for production)
- **Purpose**: Get staff availability for specific dates

## Authentication

All protected endpoints require an API key in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

**Default API Key**: `glo-head-spa-external-2024`
**Custom API Key**: Set `EXTERNAL_API_KEY` environment variable

## Appointment Webhook Request Format

### Required Fields
```json
{
  "startTime": "2024-01-15T14:00:00Z",
  "endTime": "2024-01-15T15:00:00Z"
}
```

### Optional Fields
```json
{
  "clientId": 123,                    // Existing client ID
  "serviceId": 456,                   // Existing service ID
  "staffId": 789,                     // Existing staff ID
  "status": "confirmed",              // pending, confirmed, cancelled, completed
  "notes": "Client requested specific stylist",
  "externalAppointmentId": "ext-123", // Your app's appointment ID
  "clientInfo": {                     // Create new client if clientId not provided
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345"
  },
  "serviceInfo": {                    // Create new service if serviceId not provided
    "name": "Signature Head Spa",
    "description": "60-minute head spa treatment",
    "price": 99.00,
    "duration": 60,
    "categoryName": "Head Spa",
    "color": "#3b82f6"
  },
  "staffInfo": {                      // Create new staff if staffId not provided
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "title": "Senior Stylist",
    "bio": "Specializes in head spa treatments"
  }
}
```

## Response Format

### Success Response (201)
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "appointment": {
    "id": 123,
    "clientId": 456,
    "serviceId": 789,
    "staffId": 101,
    "startTime": "2024-01-15T14:00:00Z",
    "endTime": "2024-01-15T15:00:00Z",
    "status": "confirmed",
    "totalAmount": 99.00
  },
  "createdEntities": {
    "client": { "id": 456, "created": true },
    "service": null,
    "staff": null
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": ["startTime: Invalid datetime", "endTime: Invalid datetime"],
  "message": "Invalid appointment data provided"
}
```

#### Scheduling Conflict (409)
```json
{
  "error": "Scheduling Conflict",
  "message": "The requested time slot conflicts with an existing appointment",
  "conflictingAppointment": {
    "id": 123,
    "startTime": "2024-01-15T14:00:00Z",
    "endTime": "2024-01-15T15:00:00Z"
  }
}
```

#### Blocked Time Slot (409)
```json
{
  "error": "Blocked Time Slot",
  "message": "The requested time slot is blocked and unavailable for appointments",
  "blockedSchedule": {
    "startTime": "14:00",
    "endTime": "15:00",
    "dayOfWeek": "Monday"
  }
}
```

## Integration Examples

### JavaScript/Node.js
```javascript
const createAppointment = async (appointmentData) => {
  try {
    const response = await fetch('https://your-domain.com/api/appointments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: JSON.stringify(appointmentData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create appointment');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Appointment creation failed:', error);
    throw error;
  }
};

// Example usage
const appointment = await createAppointment({
  startTime: '2024-01-15T14:00:00Z',
  endTime: '2024-01-15T15:00:00Z',
  clientInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890'
  },
  serviceInfo: {
    name: 'Signature Head Spa',
    price: 99.00,
    duration: 60,
    categoryName: 'Head Spa'
  },
  staffInfo: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    title: 'Senior Stylist'
  }
});
```

### Python
```python
import requests
import json

def create_appointment(appointment_data):
    url = 'https://your-domain.com/api/appointments/webhook'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    }
    
    try:
        response = requests.post(url, headers=headers, json=appointment_data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Appointment creation failed: {e}')
        raise

# Example usage
appointment = create_appointment({
    'startTime': '2024-01-15T14:00:00Z',
    'endTime': '2024-01-15T15:00:00Z',
    'clientInfo': {
        'firstName': 'John',
        'lastName': 'Doe',
        'email': 'john@example.com',
        'phone': '+1234567890'
    },
    'serviceInfo': {
        'name': 'Signature Head Spa',
        'price': 99.00,
        'duration': 60,
        'categoryName': 'Head Spa'
    }
})
```

### PHP
```php
function createAppointment($appointmentData) {
    $url = 'https://your-domain.com/api/appointments/webhook';
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer YOUR_API_KEY'
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($appointmentData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode >= 400) {
        throw new Exception('Appointment creation failed: ' . $response);
    }
    
    return json_decode($response, true);
}

// Example usage
$appointment = createAppointment([
    'startTime' => '2024-01-15T14:00:00Z',
    'endTime' => '2024-01-15T15:00:00Z',
    'clientInfo' => [
        'firstName' => 'John',
        'lastName' => 'Doe',
        'email' => 'john@example.com',
        'phone' => '+1234567890'
    ],
    'serviceInfo' => [
        'name' => 'Signature Head Spa',
        'price' => 99.00,
        'duration' => 60,
        'categoryName' => 'Head Spa'
    ]
]);
```

## Testing the Integration

### 1. Health Check
```bash
curl https://your-domain.com/api/external/health
```

### 2. Test Appointment Creation
```bash
curl -X POST https://your-domain.com/api/appointments/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "startTime": "2024-01-15T14:00:00Z",
    "endTime": "2024-01-15T15:00:00Z",
    "clientInfo": {
      "firstName": "Test",
      "lastName": "Client",
      "email": "test@example.com"
    },
    "serviceInfo": {
      "name": "Test Service",
      "price": 50.00,
      "duration": 30
    }
  }'
```

## Best Practices

1. **Always include authentication** in production requests
2. **Handle errors gracefully** and provide user-friendly messages
3. **Validate data** before sending to the webhook
4. **Use HTTPS** for all production requests
5. **Implement retry logic** for failed requests
6. **Log all requests** for debugging and monitoring
7. **Store external appointment IDs** for reference

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check API key in Authorization header
2. **400 Bad Request**: Validate request body format and required fields
3. **409 Conflict**: Check for scheduling conflicts or blocked time slots
4. **500 Internal Server Error**: Check server logs for detailed error information

### Debug Steps

1. Verify API key is correct
2. Check request body format matches schema
3. Ensure all required fields are provided
4. Check for scheduling conflicts
5. Verify staff availability
6. Check server logs for detailed errors

## Support

For technical support or questions about the integration:
1. Check server logs for detailed error information
2. Verify API endpoint status using health check
3. Test with minimal data to isolate issues
4. Contact system administrator for server-side issues

---

**Last Updated**: January 2024
**Version**: 1.0



