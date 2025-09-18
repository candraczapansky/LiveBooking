# Recurring Appointments Feature

## Overview
Added complete functionality to edit and manage recurring appointments from the appointments page.

## Features Implemented

### 1. Database Schema Update
- Added `recurringGroupId` field to the appointments table
- Migration automatically runs on server startup to add the column

### 2. Backend API Endpoints
Added new endpoints for managing recurring appointments:

- `GET /api/appointments/recurring/:groupId` - Get all appointments in a recurring series
- `PUT /api/appointments/recurring/:groupId/all` - Update all future appointments in the series  
- `PUT /api/appointments/recurring/:groupId/cancel` - Cancel all future appointments in the series
- `PUT /api/appointments/recurring/:groupId/single/:appointmentId` - Edit a single appointment (breaks from series)

### 3. Appointment Creation Update
- Recurring appointment creation now generates a unique `recurringGroupId`
- All appointments in a recurring series are linked with this ID

### 4. Appointment Details UI
When viewing an appointment that is part of a recurring series:

- Shows a "Recurring Appointment" card with series information
- Displays number of appointments in the series
- Shows count of future and completed appointments
- Provides a "Manage Recurring Series" button with options to:
  - Edit All Future Appointments
  - Cancel All Future Appointments

### 5. Appointment Form Updates
- Added support for editing all future appointments in a series
- Shows "Edit Recurring Appointments" in title when in recurring edit mode
- Displays a warning that changes will apply to all future appointments
- Only updates staff, service, client, and notes for future appointments (not date/time)

## How to Use

### Creating a Recurring Appointment
1. Open the appointment form
2. Select the "Recurring" checkbox
3. Choose frequency (weekly, bi-weekly, tri-weekly, monthly)
4. Set the number of occurrences or select "Indefinite"
5. Create the appointment - all occurrences will be linked with a recurringGroupId

### Editing Recurring Appointments
1. Click on any appointment in a recurring series
2. The appointment details will show a "Recurring Appointment" card
3. Click "Manage Recurring Series"
4. Choose "Edit All Future Appointments" to modify all future appointments
5. Make changes to staff, service, or notes
6. Save to apply changes to all future appointments

### Canceling Recurring Appointments
1. Open any appointment in the recurring series
2. Click "Manage Recurring Series" 
3. Choose "Cancel All Future Appointments"
4. Confirm the action - all future appointments will be cancelled

## Technical Details

### Data Flow
1. Recurring appointments are linked via `recurringGroupId` in the database
2. The UI fetches all appointments with the same `recurringGroupId` to display series info
3. Edit/cancel operations filter for future, non-cancelled appointments only
4. Changes preserve data integrity by only modifying appropriate appointments

### Permissions
- Edit operations require `update_appointments` permission
- Cancel operations require `delete_appointments` permission
- All actions respect existing permission guards

## Testing
1. Create a recurring appointment series
2. View any appointment in the series - verify recurring info is displayed
3. Edit all future appointments - verify only future ones are updated
4. Cancel all future appointments - verify only future ones are cancelled
5. Individual appointment edits should still work normally
