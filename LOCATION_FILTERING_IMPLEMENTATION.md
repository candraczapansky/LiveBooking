# Location-Based Filtering Implementation

## Overview
This implementation adds location-based filtering to the appointments calendar, so that when users toggle between different locations at the top of the app, the calendar shows appointments, staff, services, and schedules specific to that location.

## Server-Side Changes

### 1. Storage Interface Updates (`server/storage.ts`)
- Added `getAppointmentsByLocation(locationId: number): Promise<Appointment[]>` method to the `IStorage` interface
- Implemented the method in `DatabaseStorage` class to filter appointments by location

### 2. Appointments Route Updates (`server/routes/appointments.ts`)
- Updated the GET `/api/appointments` route to support `locationId` query parameter
- Added location filtering logic to return appointments for the specified location

### 3. Staff Route Updates (`server/routes.ts`)
- Updated the GET `/api/staff` route to support `locationId` query parameter
- Added filtering logic to return only staff members assigned to the specified location

### 4. Services Route Updates (`server/routes.ts`)
- Updated the GET `/api/services` route to support `locationId` query parameter
- Added filtering logic to return only services available at the specified location

### 5. Schedules Route Updates (`server/routes.ts`)
- Updated the GET `/api/schedules` route to support `locationId` query parameter
- Added filtering logic to return schedules for staff members at the specified location

## Client-Side Changes

### 1. Appointments Page Updates (`client/src/pages/appointments.tsx`)
- Imported `useLocation` hook from `LocationContext`
- Updated all queries to include location filtering:
  - **Appointments query**: Now includes `selectedLocation?.id` in query key and fetches from `/api/appointments?locationId=${selectedLocation.id}`
  - **Staff query**: Now includes `selectedLocation?.id` in query key and fetches from `/api/staff?locationId=${selectedLocation.id}`
  - **Services query**: Now includes `selectedLocation?.id` in query key and fetches from `/api/services?locationId=${selectedLocation.id}`
  - **Schedules query**: Now includes `selectedLocation?.id` in query key and fetches from `/api/schedules?locationId=${selectedLocation.id}`

## How It Works

1. **Location Selection**: When a user selects a different location from the location selector at the top of the app, the `selectedLocation` state in the `LocationContext` is updated.

2. **Query Invalidation**: The query keys for appointments, staff, services, and schedules include the selected location ID, so when the location changes, React Query automatically refetches the data.

3. **Server Filtering**: The server-side routes now filter data based on the `locationId` parameter:
   - Appointments are filtered by `locationId` field
   - Staff are filtered by `locationId` field
   - Services are filtered by `locationId` field
   - Schedules are filtered by getting staff IDs for the location and filtering schedules accordingly

4. **Calendar Updates**: The calendar automatically updates to show only appointments, staff, and services for the selected location.

## Database Schema
The implementation relies on existing database schema:
- `appointments.locationId` - Links appointments to locations
- `staff.locationId` - Links staff members to locations
- `services.locationId` - Links services to locations
- `staff_schedules.staffId` - Links schedules to staff (used for location filtering)

## Benefits
- **Isolated Data**: Each location has its own calendar with only relevant appointments, staff, and services
- **Performance**: Only fetches data for the selected location, reducing data transfer
- **User Experience**: Clear separation between different locations' operations
- **Scalability**: Easy to add more locations without affecting existing functionality

## Testing
To test the implementation:
1. Start the server: `cd server && npm run dev`
2. Start the client: `cd client && npm run dev`
3. Navigate to the appointments page
4. Toggle between different locations using the location selector
5. Verify that the calendar updates to show only appointments, staff, and services for the selected location 