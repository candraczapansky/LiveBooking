# Glo Head Spa External API Documentation v2.0

This document provides comprehensive information about Glo Head Spa's external APIs for frontend app integration with improved authentication and error handling.

## Base URL
```
https://your-glo-head-spa-domain.replit.app
```

## Authentication

### API Key Authentication
Most endpoints now require API key authentication for security. You can provide the API key in two ways:

1. **Header method (recommended):**
   ```
   X-API-Key: glo-head-spa-external-2024
   ```

2. **Authorization header:**
   ```
   Authorization: Bearer glo-head-spa-external-2024
   ```

### Default API Key
The default API key is: `glo-head-spa-external-2024`

**Note:** In production, you should set a custom API key using the `EXTERNAL_API_KEY` environment variable.

## Available Endpoints

### 1. Health Check (No Auth Required)

**Endpoint:** `GET /api/external/health`

**Description:** Check if the external API is healthy and get endpoint information.

**Example Request:**
```bash
curl "https://your-domain.replit.app/api/external/health"
```

**Response:**
```json
{
  "success": true,
  "status": "External API is healthy",
  "timestamp": "2025-01-27T10:00:00.000Z",
  "authenticated": false,
  "endpoints": {
    "staffAvailability": "/api/external/staff-availability",
    "services": "/api/external/services",
    "serviceCategories": "/api/external/service-categories",
    "appointmentWebhook": "/api/appointments/webhook"
  }
}
```

### 2. Staff Availability API (Optional Auth)

**Endpoint:** `GET /api/external/staff-availability`

**Description:** Get comprehensive staff information including schedules, services, and contact details.

**Authentication:** Optional (provides enhanced logging when authenticated)

**Query Parameters:**
- `staffId` (optional) - Filter by specific staff member ID
- `date` (optional) - Filter schedules by specific date (future feature)

**Example Request:**
```bash
# Without authentication
curl "https://your-domain.replit.app/api/external/staff-availability"

# With authentication
curl -H "X-API-Key: glo-head-spa-external-2024" \
     "https://your-domain.replit.app/api/external/staff-availability?staffId=6"
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 6,
      "userId": 12,
      "title": "Senior Stylist",
      "commissionType": "commission",
      "commissionRate": 0.3,
      "hourlyRate": null,
      "fixedRate": null,
      "user": {
        "id": 12,
        "firstName": "Candra",
        "lastName": "Czapansky",
        "email": "candraczapansky@gmail.com",
        "phone": "555-123-4567"
      },
      "schedules": [
        {
          "id": 1,
          "staffId": 6,
          "dayOfWeek": "Monday",
          "startTime": "09:00",
          "endTime": "17:00",
          "isBlocked": false,
          "startDate": "2025-01-01",
          "endDate": null
        }
      ],
      "services": [
        {
          "id": 1,
          "name": "Deluxe Head Spa",
          "duration": 90,
          "price": 160,
          "category": "Head Spa",
          "customRate": null,
          "customCommissionRate": 0.3
        }
      ]
    }
  ],
  "timestamp": "2025-01-27T10:00:00.000Z",
  "filters": { "date": null, "staffId": "6" },
  "authenticated": true
}
```

### 3. Services API (Optional Auth)

**Endpoint:** `GET /api/external/services`

**Description:** Get all services with categories and staff assignments.

**Authentication:** Optional (provides enhanced logging when authenticated)

**Query Parameters:**
- `categoryId` (optional) - Filter by service category
- `staffId` (optional) - Filter services assigned to specific staff member

**Example Request:**
```bash
# Get all services
curl -H "X-API-Key: glo-head-spa-external-2024" \
     "https://your-domain.replit.app/api/external/services"

# Get services for specific staff member
curl -H "X-API-Key: glo-head-spa-external-2024" \
     "https://your-domain.replit.app/api/external/services?staffId=6&categoryId=1"
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Deluxe Head Spa",
      "description": "A luxurious head spa treatment",
      "duration": 90,
      "price": 160,
      "color": "#C8445C",
      "bufferTimeBefore": 0,
      "bufferTimeAfter": 20,
      "category": {
        "id": 1,
        "name": "Head Spa",
        "color": "#3B82F6"
      },
      "assignedStaff": [
        {
          "staffId": 6,
          "customRate": null,
          "customCommissionRate": 0.3,
          "staff": {
            "id": 6,
            "title": "Senior Stylist",
            "user": {
              "firstName": "Candra",
              "lastName": "Czapansky",
              "email": "candraczapansky@gmail.com"
            }
          }
        }
      ]
    }
  ],
  "timestamp": "2025-01-27T10:00:00.000Z",
  "filters": { "categoryId": "1", "staffId": "6" },
  "authenticated": true
}
```

### 4. Service Categories API (Optional Auth)

**Endpoint:** `GET /api/external/service-categories`

**Description:** Get all service categories.

**Authentication:** Optional (provides enhanced logging when authenticated)

**Example Request:**
```bash
curl -H "X-API-Key: glo-head-spa-external-2024" \
     "https://your-domain.replit.app/api/external/service-categories"
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Head Spa",
      "color": "#3B82F6",
      "createdAt": "2025-06-25T05:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Hair Services",
      "color": "#10B981",
      "createdAt": "2025-06-25T05:00:00.000Z"
    }
  ],
  "timestamp": "2025-01-27T10:00:00.000Z",
  "authenticated": true
}
```

### 5. Appointment Webhook (Auth Required)

**Endpoint:** `POST /api/appointments/webhook`

**Description:** Send new appointments to Glo Head Spa calendar.

**Authentication:** **Required** (API Key)

**Required Fields:**
- `startTime` - ISO date string
- `endTime` - ISO date string

**Optional Fields:**
- `clientId` - Existing client ID
- `serviceId` - Existing service ID  
- `staffId` - Existing staff ID
- `status` - Appointment status (default: "confirmed")
- `notes` - Appointment notes
- `externalAppointmentId` - External system reference ID

**Auto-Creation Objects:**
If IDs are not provided, you can include these objects to auto-create entities:

**clientInfo:**
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

**serviceInfo:**
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

**staffInfo:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@salon.com",
  "title": "Senior Stylist",
  "bio": "Professional stylist with 5+ years experience"
}
```

**Example Request:**
```bash
curl -X POST https://your-domain.replit.app/api/appointments/webhook \
  -H "Content-Type: application/json" \
  -H "X-API-Key: glo-head-spa-external-2024" \
  -d '{
    "startTime": "2025-01-27T10:00:00Z",
    "endTime": "2025-01-27T11:00:00Z",
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

**Response:**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "appointment": {
    "id": 123,
    "clientId": 45,
    "serviceId": 67,
    "staffId": 89,
    "startTime": "2025-01-27T10:00:00Z",
    "endTime": "2025-01-27T11:00:00Z",
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

### 6. Webhook Status (No Auth Required)

**Endpoint:** `GET /api/appointments/webhook`

**Description:** Get information about the webhook endpoint.

**Example Request:**
```bash
curl "https://your-domain.replit.app/api/appointments/webhook"
```

**Response:**
```json
{
  "status": "Appointment webhook endpoint is active",
  "endpoint": "/api/appointments/webhook",
  "method": "POST",
  "authentication": "Required (API Key)",
  "description": "Receives new appointments from external frontend applications",
  "requiredFields": ["startTime", "endTime"],
  "optionalFields": [
    "clientId", "serviceId", "staffId",
    "notes", "status", "externalAppointmentId",
    "clientInfo", "serviceInfo", "staffInfo"
  ],
  "features": [
    "Auto-creates clients, services, and staff if not found",
    "Checks for scheduling conflicts",
    "Creates notifications",
    "Calculates service pricing",
    "Validates all input data"
  ]
}
```

## Frontend Integration Examples

### React/JavaScript Implementation

```javascript
const API_KEY = 'glo-head-spa-external-2024';
const BASE_URL = 'https://your-domain.replit.app';

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Fetch all staff with availability
async function getStaffAvailability(staffId = null) {
  const params = staffId ? `?staffId=${staffId}` : '';
  const response = await apiRequest(`/api/external/staff-availability${params}`);
  return response.data;
}

// Fetch services for a specific staff member
async function getServicesForStaff(staffId, categoryId = null) {
  const params = new URLSearchParams({ staffId });
  if (categoryId) params.append('categoryId', categoryId);
  
  const response = await apiRequest(`/api/external/services?${params}`);
  return response.data;
}

// Fetch all service categories
async function getServiceCategories() {
  const response = await apiRequest('/api/external/service-categories');
  return response.data;
}

// Send appointment to Glo Head Spa
async function sendAppointment(appointmentData) {
  return await apiRequest('/api/appointments/webhook', {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });
}

// Check API health
async function checkApiHealth() {
  const response = await fetch(`${BASE_URL}/api/external/health`);
  return response.json();
}
```

### Usage Workflow

1. **Check API Health:**
   ```javascript
   const health = await checkApiHealth();
   console.log('API Status:', health.status);
   ```

2. **Load Initial Data:**
   ```javascript
   const staff = await getStaffAvailability();
   const categories = await getServiceCategories();
   ```

3. **Filter Services by Staff:**
   ```javascript
   const selectedStaffId = 6;
   const services = await getServicesForStaff(selectedStaffId);
   ```

4. **Create Booking Form:**
   - Show available staff members
   - Show services for selected staff
   - Check staff schedules for availability
   - Collect client information

5. **Submit Appointment:**
   ```javascript
   const appointment = {
     startTime: "2025-01-27T10:00:00Z",
     endTime: "2025-01-27T11:30:00Z",
     clientInfo: { 
       firstName: "John", 
       lastName: "Doe", 
       email: "john@example.com" 
     },
     serviceInfo: { 
       name: "Deluxe Head Spa", 
       price: 160, 
       duration: 90 
     },
     staffInfo: { 
       firstName: "Candra", 
       lastName: "Czapansky" 
     }
   };
   
   try {
     const result = await sendAppointment(appointment);
     console.log('Appointment created:', result.appointment);
   } catch (error) {
     console.error('Booking failed:', error.message);
   }
   ```

## Error Handling

All endpoints return errors in this format:
```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing required fields or validation errors)
- `401` - Unauthorized (invalid or missing API key)
- `404` - Resource not found
- `409` - Scheduling conflict
- `500` - Server error

## Data Relationships

- **Staff** have **Schedules** (working hours/days)
- **Staff** are assigned to **Services** with optional custom rates
- **Services** belong to **Categories**
- **Appointments** link **Clients**, **Staff**, and **Services**

## Security Notes

- API keys should be kept secure and not exposed in client-side code
- Consider using environment variables for API keys in production
- The webhook endpoint requires authentication to prevent unauthorized appointments
- All input data is validated before processing

## Migration from v1.0

If you're upgrading from the previous version:

1. **Add API key headers** to all requests
2. **Update error handling** to use the new error format
3. **Test authentication** with the health check endpoint first
4. **Verify webhook authentication** is working before sending appointments

## Support

For questions or issues with the external APIs, please check the server console logs or contact the Glo Head Spa development team. 