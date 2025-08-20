-- Create essential tables if they don't exist

-- Locations
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#667eea',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES service_categories(id),
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'client',
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    profile_picture TEXT,
    square_customer_id TEXT,
    helcim_customer_id TEXT,
    reset_token TEXT,
    reset_token_expiry TIMESTAMP,
    email_account_management BOOLEAN DEFAULT true,
    email_appointment_reminders BOOLEAN DEFAULT true,
    email_promotions BOOLEAN DEFAULT false,
    sms_account_management BOOLEAN DEFAULT false,
    sms_appointment_reminders BOOLEAN DEFAULT true,
    sms_promotions BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    two_factor_backup_codes TEXT,
    two_factor_method TEXT DEFAULT 'authenticator',
    two_factor_email_code TEXT,
    two_factor_email_code_expiry TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title TEXT,
    bio TEXT,
    specialties TEXT[],
    is_active BOOLEAN DEFAULT true,
    hire_date DATE,
    termination_date DATE,
    hourly_rate DECIMAL(10,2),
    commission_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Staff Services (junction table for staff-service relationships)
CREATE TABLE IF NOT EXISTS staff_services (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    service_id INTEGER REFERENCES services(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(staff_id, service_id)
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    location_id INTEGER REFERENCES locations(id),
    capacity INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Staff Schedules
CREATE TABLE IF NOT EXISTS staff_schedules (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    location_id INTEGER REFERENCES locations(id),
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_blocked BOOLEAN DEFAULT false,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES users(id),
    staff_id INTEGER REFERENCES staff(id),
    service_id INTEGER REFERENCES services(id),
    room_id INTEGER REFERENCES rooms(id),
    location_id INTEGER REFERENCES locations(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_id ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_location_id ON staff_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
