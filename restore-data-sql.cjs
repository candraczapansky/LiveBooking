const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function restoreData() {
  console.log('🌱 Restoring essential data...');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Create location first (needed for staff and rooms)
    console.log('📍 Creating location...');
    await sql`INSERT INTO locations (name, address, city, state, zip_code, phone, email, is_active, is_default) VALUES ('Glo Head Spa - Main Location', '123 Main St', 'New York', 'NY', '10001', '(555) 123-4567', 'hello@gloheadspa.com', true, true) ON CONFLICT DO NOTHING`;
    console.log('✅ Location created');

    // Create users first
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user1 = await sql`
      INSERT INTO users (username, password, email, role, first_name, last_name, phone) 
      VALUES ('sarah.johnson', ${hashedPassword}, 'sarah.johnson@gloheadspa.com', 'staff', 'Sarah', 'Johnson', '(555) 123-4567') 
      ON CONFLICT DO NOTHING RETURNING id
    `;
    
    const user2 = await sql`
      INSERT INTO users (username, password, email, role, first_name, last_name, phone) 
      VALUES ('michael.chen', ${hashedPassword}, 'michael.chen@gloheadspa.com', 'staff', 'Michael', 'Chen', '(555) 123-4568') 
      ON CONFLICT DO NOTHING RETURNING id
    `;
    
    console.log('✅ Users created');

    // Create service categories
    console.log('📂 Creating service categories...');
    await sql`INSERT INTO service_categories (name, description, color) VALUES ('Head Spa Treatments', 'Relaxing head spa and scalp treatments', '#667eea') ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO service_categories (name, description, color) VALUES ('Hair Services', 'Haircuts, styling, and coloring services', '#764ba2') ON CONFLICT DO NOTHING`;
    console.log('✅ Service categories created');

    // Create services
    console.log('📝 Creating services...');
    await sql`INSERT INTO services (name, description, duration, price, category_id) VALUES ('Signature Head Spa', 'Complete head spa treatment with massage and conditioning', 60, 99.00, 1) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO services (name, description, duration, price, category_id) VALUES ('Deep Conditioning Treatment', 'Intensive conditioning for damaged hair', 45, 75.00, 1) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO services (name, description, duration, price, category_id) VALUES ('Haircut & Style', 'Professional haircut with styling', 45, 65.00, 2) ON CONFLICT DO NOTHING`;
    console.log('✅ Services created');

    // Create staff (using the correct schema with user_id)
    console.log('👥 Creating staff...');
    if (user1.length > 0) {
      await sql`INSERT INTO staff (user_id, title, bio, hourly_rate, location_id) VALUES (${user1[0].id}, 'Senior Stylist', 'Experienced stylist specializing in head spa treatments', 25.00, 1) ON CONFLICT DO NOTHING`;
    }
    if (user2.length > 0) {
      await sql`INSERT INTO staff (user_id, title, bio, hourly_rate, location_id) VALUES (${user2[0].id}, 'Color Specialist', 'Expert in hair coloring and highlights', 28.00, 1) ON CONFLICT DO NOTHING`;
    }
    console.log('✅ Staff created');

    // Create rooms
    console.log('🚪 Creating rooms...');
    await sql`INSERT INTO rooms (name, description, capacity, is_active, location_id) VALUES ('Spa Room 1', 'Private spa room for head treatments', 1, true, 1) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO rooms (name, description, capacity, is_active, location_id) VALUES ('Styling Station 1', 'Professional styling station', 1, true, 1) ON CONFLICT DO NOTHING`;
    console.log('✅ Rooms created');

    console.log('\n🎉 Data restoration completed!');
    console.log('✅ Services, staff, and locations restored');
    console.log('🔑 Staff login: sarah.johnson / password123');
    console.log('🔑 Staff login: michael.chen / password123');
    
  } catch (error) {
    console.error('❌ Data restoration failed:', error);
  }
}

restoreData().catch(console.error); 