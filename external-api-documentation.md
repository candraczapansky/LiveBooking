# BeautyBook External API Documentation

This document provides comprehensive information about BeautyBook's external APIs for frontend app integration.

## Base URL
```
https://your-beautybook-domain.replit.app
```

## Authentication
Currently, the external APIs are open and do not require authentication. If you need secured endpoints, we can implement API key authentication.

## Available Endpoints

### 1. Staff Availability API

**Endpoint:** `GET /api/external/staff-availability`

**Description:** Get comprehensive staff information including schedules, services, and contact details.

**Query Parameters:**
- `staffId` (optional) - Filter by specific staff member ID
- `date` (optional) - Filter schedules by specific date (future feature)

**Example Request:**
```bash
curl "https://your-domain.replit.app/api/external/staff-availability"
```

**Example Request (Specific Staff):**
```bash
curl "https://your-domain.replit.app/api/external/staff-availability?staffId=6"
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 6,
      "userId": 6,
      "title": "Senior Stylist",
      "commissionType": "commission",
      "commissionRate": 0.3,
      "hourlyRate": null,
      "fixedRate": null,
      "user": {
        "id": 6,
        "firstName": "Candra",
        "lastName": "Czapansky",
        "email": "candraczapansky@gmail.com",
        "phone": "9185048902"
      },
      "schedules": [
        {
          "id": 1,
          "staffId": 6,
          "dayOfWeek": "Monday",
          "startTime": "09:00",
          "endTime": "17:00",
          "location": "Main Salon",
          "serviceCategories": ["Hair Services"],
          "startDate": "2025-07-01",
          "endDate": null,
          "isBlocked": false
        }
      ],
      "services": [
        {
          "id": 1258,
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
  "timestamp": "2025-07-01T05:59:00.000Z",
  "filters": { "staffId": "6" }
}
```

### 2. Services API

**Endpoint:** `GET /api/external/services`

**Description:** Get all services with categories and assigned staff information.

**Query Parameters:**
- `categoryId` (optional) - Filter by service category ID
- `staffId` (optional) - Filter by services assigned to specific staff member

**Example Request:**
```bash
curl "https://your-domain.replit.app/api/external/services"
```

**Example Request (Filtered):**
```bash
curl "https://your-domain.replit.app/api/external/services?categoryId=1&staffId=6"
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1258,
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
  "timestamp": "2025-07-01T05:59:00.000Z",
  "filters": { "categoryId": "1", "staffId": "6" }
}
```

### 3. Service Categories API

**Endpoint:** `GET /api/external/service-categories`

**Description:** Get all service categories.

**Example Request:**
```bash
curl "https://your-domain.replit.app/api/external/service-categories"
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
  "timestamp": "2025-07-01T05:59:00.000Z"
}
```

### 4. Appointment Webhook (Send Appointments)

**Endpoint:** `POST /api/appointments/webhook`

**Description:** Send new appointments to BeautyBook calendar (as previously documented).

**Required Fields:**
- `startTime` - ISO date string
- `endTime` - ISO date string

**Optional Fields:**
- `clientInfo` - Auto-creates client if not exists
- `serviceInfo` - Auto-creates service if not exists  
- `staffInfo` - Auto-creates staff if not exists

## Frontend Integration Examples

### React/JavaScript Implementation

```javascript
// Fetch all staff with availability
async function getStaffAvailability() {
  const response = await fetch('https://your-domain.replit.app/api/external/staff-availability');
  const data = await response.json();
  return data.data; // Array of staff with schedules and services
}

// Fetch services for a specific staff member
async function getServicesForStaff(staffId) {
  const response = await fetch(`https://your-domain.replit.app/api/external/services?staffId=${staffId}`);
  const data = await response.json();
  return data.data; // Array of services assigned to the staff member
}

// Fetch all service categories
async function getServiceCategories() {
  const response = await fetch('https://your-domain.replit.app/api/external/service-categories');
  const data = await response.json();
  return data.data; // Array of categories
}

// Send appointment to BeautyBook
async function sendAppointment(appointmentData) {
  const response = await fetch('https://your-domain.replit.app/api/appointments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentData)
  });
  return response.json();
}
```

### Usage Workflow

1. **Load Initial Data:**
   ```javascript
   const staff = await getStaffAvailability();
   const categories = await getServiceCategories();
   ```

2. **Filter Services by Staff:**
   ```javascript
   const selectedStaffId = 6;
   const services = await getServicesForStaff(selectedStaffId);
   ```

3. **Create Booking Form:**
   - Show available staff members
   - Show services for selected staff
   - Check staff schedules for availability
   - Collect client information

4. **Submit Appointment:**
   ```javascript
   const appointment = {
     startTime: "2025-07-01T10:00:00Z",
     endTime: "2025-07-01T11:30:00Z",
     clientInfo: { firstName: "John", lastName: "Doe", email: "john@example.com" },
     serviceInfo: { name: "Deluxe Head Spa", price: 160, duration: 90 },
     staffInfo: { firstName: "Candra", lastName: "Czapansky" }
   };
   
   const result = await sendAppointment(appointment);
   ```

## Error Handling

All endpoints return errors in this format:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing required fields)
- `404` - Resource not found
- `500` - Server error

## Data Relationships

- **Staff** have **Schedules** (working hours/days)
- **Staff** are assigned to **Services** with optional custom rates
- **Services** belong to **Categories**
- **Appointments** link **Clients**, **Staff**, and **Services**

## Notes

- All timestamps are in ISO 8601 format
- Prices are in dollars (numeric values)
- Duration is in minutes
- Staff schedules use 24-hour time format (HH:MM)
- The system auto-creates missing entities when using the webhook

## Support

For questions or issues with the external APIs, please check the server console logs or contact the BeautyBook development team.