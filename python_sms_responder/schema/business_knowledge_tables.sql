-- Business Knowledge Tables

-- Table for storing business information
CREATE TABLE IF NOT EXISTS business_info (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing services by category
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES service_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price VARCHAR(50),
    duration INTEGER, -- in minutes
    active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing promotions and discounts
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    code VARCHAR(50),
    discount_type VARCHAR(20) DEFAULT 'percentage', -- percentage, fixed, free_service
    discount_value NUMERIC,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing staff information
CREATE TABLE IF NOT EXISTS staff_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    bio TEXT,
    specialties TEXT[],
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial data for business_info
INSERT INTO business_info (key, value) VALUES
('name', 'Your Salon & Spa'),
('address', '123 Main Street, Anytown, USA'),
('phone', '(555) 123-4567'),
('email', 'info@yoursalon.com'),
('website', 'www.yoursalon.com'),
('hours_monday', '9:00 AM - 7:00 PM'),
('hours_tuesday', '9:00 AM - 7:00 PM'),
('hours_wednesday', '9:00 AM - 7:00 PM'),
('hours_thursday', '9:00 AM - 7:00 PM'),
('hours_friday', '9:00 AM - 7:00 PM'),
('hours_saturday', '9:00 AM - 7:00 PM'),
('hours_sunday', '10:00 AM - 5:00 PM'),
('description', 'A full-service salon and spa offering hair, nail, and skin services.')
ON CONFLICT (key) DO NOTHING;
