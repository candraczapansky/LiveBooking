const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function restoreData() {
  console.log('🌱 Restoring essential data...');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Create service categories
    console.log('📂 Creating service categories...');
    await sql`INSERT INTO service_categories (name, description, created_at, updated_at) VALUES ('Head Spa Treatments', 'Relaxing head spa and scalp treatments', NOW(), NOW()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO service_categories (name, description, created_at, updated_at) VALUES ('Hair Services', 'Haircuts, styling, and coloring services', NOW(), NOW()) ON CONFLICT DO NOTHING`;
    console.log('✅ Service categories created');

    // Create services
    console.log('📝 Creating services...');
    await sql`INSERT INTO services (name, description, duration, price, category_id, created_at, updated_at) VALUES ('Signature Head Spa', 'Complete head spa treatment with massage and conditioning', 60, 99.00, 1, NOW(), NOW()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO services (name, description, duration, price, category_id, created_at, updated_at) VALUES ('Deep Conditioning Treatment', 'Intensive conditioning for damaged hair', 45, 75.00, 1, NOW(), NOW()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO services (name, description, duration, price, category_id, created_at, updated_at) VALUES ('Haircut & Style', 'Professional haircut with styling', 45, 65.00, 2, NOW(), NOW()) ON CONFLICT DO NOTHING`;
    console.log('✅ Services created');

    // Create staff
    console.log('👥 Creating staff...');
    await sql`INSERT INTO staff (first_name, last_name, email, phone, role, is_active, hire_date, hourly_rate, created_at, updated_at) VALUES ('Sarah', 'Johnson', 'sarah.johnson@gloheadspa.com', '(555) 123-4567', 'Senior Stylist', true, '2023-01-15', 25.00, NOW(), NOW()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO staff (first_name, last_name, email, phone, role, is_active, hire_date, hourly_rate, created_at, updated_at) VALUES ('Michael', 'Chen', 'michael.chen@gloheadspa.com', '(555) 123-4568', 'Color Specialist', true, '2023-03-20', 28.00, NOW(), NOW()) ON CONFLICT DO NOTHING`;
    console.log('✅ Staff created');

    // Create clients
    console.log('👤 Creating clients...');
    await sql`INSERT INTO clients (first_name, last_name, email, phone, address, date_of_birth, notes, created_at, updated_at) VALUES ('Lisa', 'Acevedo', 'lisaacevedo81@gmail.com', '(555) 987-6543', '123 Main St, New York, NY 10001', '1985-03-15', 'Prefers organic products', NOW(), NOW()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO clients (first_name, last_name, email, phone, address, date_of_birth, notes, created_at, updated_at) VALUES ('John', 'Smith', 'john.smith@email.com', '(555) 987-6544', '456 Oak Ave, New York, NY 10002', '1990-07-22', 'Regular client', NOW(), NOW()) ON CONFLICT DO NOTHING`;
    console.log('✅ Clients created');

    // Create location
    console.log('📍 Creating location...');
    await sql`INSERT INTO locations (name, address, phone, email, is_active, created_at, updated_at) VALUES ('Glo Head Spa - Main Location', '123 Main St, New York, NY 10001', '(555) 123-4567', 'hello@gloheadspa.com', true, NOW(), NOW()) ON CONFLICT DO NOTHING`;
    console.log('✅ Location created');

    // Create rooms
    console.log('🚪 Creating rooms...');
    await sql`INSERT INTO rooms (name, location_id, capacity, is_active, created_at, updated_at) VALUES ('Spa Room 1', 1, 1, true, NOW(), NOW()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO rooms (name, location_id, capacity, is_active, created_at, updated_at) VALUES ('Styling Station 1', 1, 1, true, NOW(), NOW()) ON CONFLICT DO NOTHING`;
    console.log('✅ Rooms created');

    console.log('\n🎉 Data restoration completed!');
    console.log('✅ Services, staff, clients, and locations restored');
    
  } catch (error) {
    console.error('❌ Data restoration failed:', error);
  }
}

restoreData().catch(console.error); 