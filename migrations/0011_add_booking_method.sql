-- Add booking method tracking to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS booking_method TEXT DEFAULT 'staff',
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Add comment for clarity
COMMENT ON COLUMN appointments.booking_method IS 'How the appointment was booked: staff, online, sms, external';
COMMENT ON COLUMN appointments.created_by IS 'User ID of staff member who created the appointment (NULL for online/sms bookings)';

-- Update existing appointments to have the correct default
UPDATE appointments SET booking_method = 'staff' WHERE booking_method IS NULL;



