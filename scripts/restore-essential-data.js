import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

export async function restoreEssentialData() {
  console.log('🌱 Starting essential data restoration...');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Create default location
    console.log('📍 Creating default location...');
    const location = await sql`
      INSERT INTO locations (name, address, city, state, zip_code, phone, email, is_active, is_default) 
      VALUES ('Glo Head Spa - Main Location', '123 Main St', 'New York', 'NY', '10001', '(555) 123-4567', 'hello@gloheadspa.com', true, true) 
      ON CONFLICT (name) DO UPDATE SET is_active = true, is_default = true
      RETURNING id
    `;
    const locationId = location[0].id;
    console.log('✅ Default location created');

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await sql`
      INSERT INTO users (username, password, email, role, first_name, last_name, phone) 
      VALUES ('admin', ${hashedPassword}, 'admin@gloheadspa.com', 'admin', 'Admin', 'User', '(555) 000-0000') 
      ON CONFLICT (username) DO UPDATE SET role = 'admin'
      RETURNING id
    `;
    console.log('✅ Admin user created');

    // Create service categories
    console.log('📂 Creating service categories...');
    const categories = await sql`
      INSERT INTO service_categories (name, description, color) VALUES 
      ('Head Spa Treatments', 'Relaxing head spa and scalp treatments', '#667eea'),
      ('Hair Services', 'Haircuts, styling, and coloring services', '#764ba2'),
      ('Facial Treatments', 'Skincare and facial rejuvenation treatments', '#f6ad55'),
      ('Massage Therapy', 'Therapeutic massage services', '#48bb78')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id, name
    `;
    console.log('✅ Service categories created');

    // Create sample services
    console.log('📝 Creating sample services...');
    for (const category of categories) {
      if (category.name === 'Head Spa Treatments') {
        await sql`
          INSERT INTO services (name, description, duration, price, category_id, color) VALUES 
          ('Signature Head Spa', 'Complete head spa treatment with massage', 60, 99.99, ${category.id}, '#667eea'),
          ('Scalp Treatment', 'Deep cleansing scalp treatment', 45, 79.99, ${category.id}, '#667eea')
          ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price
        `;
      } else if (category.name === 'Hair Services') {
        await sql`
          INSERT INTO services (name, description, duration, price, category_id, color) VALUES 
          ('Haircut & Style', 'Professional haircut and styling', 60, 85.00, ${category.id}, '#764ba2'),
          ('Color & Highlights', 'Full color with highlights', 120, 150.00, ${category.id}, '#764ba2')
          ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price
        `;
      }
    }
    console.log('✅ Sample services created');

    // Create staff users and profiles
    console.log('👥 Creating staff members...');
    const staffMembers = [
      {
        username: 'sarah.johnson',
        email: 'sarah.johnson@gloheadspa.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '(555) 123-4567',
        title: 'Senior Stylist',
        hourlyRate: 25.00,
        commissionRate: 40.00
      },
      {
        username: 'michael.chen',
        email: 'michael.chen@gloheadspa.com',
        firstName: 'Michael',
        lastName: 'Chen',
        phone: '(555) 123-4568',
        title: 'Head Spa Specialist',
        hourlyRate: 28.00,
        commissionRate: 45.00
      }
    ];

    for (const staffMember of staffMembers) {
      // Create user account
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await sql`
        INSERT INTO users (username, password, email, role, first_name, last_name, phone) 
        VALUES (${staffMember.username}, ${hashedPassword}, ${staffMember.email}, 'staff', ${staffMember.firstName}, ${staffMember.lastName}, ${staffMember.phone}) 
        ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
      `;
      
      // Create staff profile
      await sql`
        INSERT INTO staff (user_id, title, is_active, hire_date, hourly_rate, commission_rate) 
        VALUES (${user[0].id}, ${staffMember.title}, true, NOW(), ${staffMember.hourlyRate}, ${staffMember.commissionRate}) 
        ON CONFLICT (user_id) DO UPDATE SET title = EXCLUDED.title
      `;
    }
    console.log('✅ Staff members created');

    // Create rooms
    console.log('🚪 Creating rooms...');
    await sql`
      INSERT INTO rooms (name, location_id, capacity, is_active) VALUES 
      ('Treatment Room 1', ${locationId}, 1, true),
      ('Treatment Room 2', ${locationId}, 1, true),
      ('Styling Station 1', ${locationId}, 1, true),
      ('Styling Station 2', ${locationId}, 1, true)
      ON CONFLICT (name, location_id) DO UPDATE SET is_active = true
    `;
    console.log('✅ Rooms created');

    // Create sample staff schedules
    console.log('📅 Creating staff schedules...');
    const staff = await sql`SELECT id FROM staff`;
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const staffMember of staff) {
      for (const day of weekdays) {
        await sql`
          INSERT INTO staff_schedules (staff_id, location_id, day_of_week, start_time, end_time, start_date) 
          VALUES (
            ${staffMember.id}, 
            ${locationId}, 
            ${day}, 
            '09:00', 
            '17:00', 
            CURRENT_DATE
          )
          ON CONFLICT (staff_id, location_id, day_of_week, start_date) 
          DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time
        `;
      }
    }
    console.log('✅ Staff schedules created');

    console.log('✨ Essential data restoration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error restoring essential data:', error);
    throw error;
  }
}

// Run the restoration if this file is executed directly
import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  restoreEssentialData()
    .then(() => {
      console.log('🎉 Data restoration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Data restoration failed:', error);
      process.exit(1);
    });
}