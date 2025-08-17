const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function restoreData() {
  console.log('🌱 Restoring essential data...');

  try {
    const sql = neon(DATABASE_URL);
    
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // 1. Create Service Categories first
    console.log('\n📂 Creating service categories...');
    const categories = [
      { name: 'Head Spa Treatments', description: 'Relaxing head spa and scalp treatments' },
      { name: 'Hair Services', description: 'Haircuts, styling, and coloring services' },
      { name: 'Specialty Treatments', description: 'Specialized hair and scalp treatments' }
    ];

    for (const category of categories) {
      const result = await sql`
        INSERT INTO service_categories (name, description)
        VALUES (${category.name}, ${category.description})
        RETURNING id, name
      `;
      console.log(`✅ Created category: ${result[0].name} (ID: ${result[0].id})`);
    }

    // 2. Create Locations
    console.log('\n📍 Creating locations...');
    const locations = [
      {
        name: 'Glo Head Spa - Main Location',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        phone: '(555) 123-4567',
        email: 'hello@gloheadspa.com',
        timezone: 'America/New_York',
        isActive: true,
        isDefault: true,
        description: 'Primary business location'
      }
    ];

    for (const location of locations) {
      const result = await sql`
        INSERT INTO locations (name, address, city, state, zip_code, phone, email, timezone, is_active, is_default, description)
        VALUES (${location.name}, ${location.address}, ${location.city}, ${location.state}, ${location.zipCode}, ${location.phone}, ${location.email}, ${location.timezone}, ${location.isActive}, ${location.isDefault}, ${location.description})
        RETURNING id, name
      `;
      console.log(`✅ Created location: ${result[0].name} (ID: ${result[0].id})`);
    }

    // 3. Create Rooms
    console.log('\n🚪 Creating rooms...');
    const rooms = [
      {
        name: 'Spa Room 1',
        locationId: 1,
        capacity: 1,
        isActive: true
      },
      {
        name: 'Spa Room 2',
        locationId: 1,
        capacity: 1,
        isActive: true
      },
      {
        name: 'Styling Station 1',
        locationId: 1,
        capacity: 1,
        isActive: true
      },
      {
        name: 'Styling Station 2',
        locationId: 1,
        capacity: 1,
        isActive: true
      }
    ];

    for (const room of rooms) {
      const result = await sql`
        INSERT INTO rooms (name, location_id, capacity, is_active)
        VALUES (${room.name}, ${room.locationId}, ${room.capacity}, ${room.isActive})
        RETURNING id, name
      `;
      console.log(`✅ Created room: ${result[0].name} (ID: ${result[0].id})`);
    }

    // 4. Create Services
    console.log('\n📝 Creating services...');
    const services = [
      {
        name: 'Signature Head Spa',
        description: 'Complete head spa treatment with massage and conditioning',
        duration: 60,
        price: 99.00,
        categoryId: 1,
        locationId: 1
      },
      {
        name: 'Deep Conditioning Treatment',
        description: 'Intensive conditioning for damaged hair',
        duration: 45,
        price: 75.00,
        categoryId: 1,
        locationId: 1
      },
      {
        name: 'Scalp Treatment',
        description: 'Therapeutic scalp treatment for healthy hair growth',
        duration: 30,
        price: 55.00,
        categoryId: 1,
        locationId: 1
      },
      {
        name: 'Haircut & Style',
        description: 'Professional haircut with styling',
        duration: 45,
        price: 65.00,
        categoryId: 2,
        locationId: 1
      },
      {
        name: 'Color Treatment',
        description: 'Professional hair coloring service',
        duration: 120,
        price: 150.00,
        categoryId: 2,
        locationId: 1
      },
      {
        name: 'Highlights',
        description: 'Professional highlighting service',
        duration: 90,
        price: 120.00,
        categoryId: 2,
        locationId: 1
      }
    ];

    for (const service of services) {
      const result = await sql`
        INSERT INTO services (name, description, duration, price, category_id, location_id)
        VALUES (${service.name}, ${service.description}, ${service.duration}, ${service.price}, ${service.categoryId}, ${service.locationId})
        RETURNING id, name
      `;
      console.log(`✅ Created service: ${result[0].name} (ID: ${result[0].id})`);
    }

    // 5. Create Client Users
    console.log('\n👤 Creating client users...');
    const clients = [
      {
        username: 'lisa.acevedo',
        email: 'lisaacevedo81@gmail.com',
        password: await bcrypt.hash('password123', 10),
        role: 'client',
        firstName: 'Lisa',
        lastName: 'Acevedo',
        phone: '(555) 987-6543',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001'
      },
      {
        username: 'john.smith',
        email: 'john.smith@email.com',
        password: await bcrypt.hash('password123', 10),
        role: 'client',
        firstName: 'John',
        lastName: 'Smith',
        phone: '(555) 987-6544',
        address: '456 Oak Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10002'
      },
      {
        username: 'maria.garcia',
        email: 'maria.garcia@email.com',
        password: await bcrypt.hash('password123', 10),
        role: 'client',
        firstName: 'Maria',
        lastName: 'Garcia',
        phone: '(555) 987-6545',
        address: '789 Pine St',
        city: 'New York',
        state: 'NY',
        zipCode: '10003'
      },
      {
        username: 'robert.brown',
        email: 'robert.brown@email.com',
        password: await bcrypt.hash('password123', 10),
        role: 'client',
        firstName: 'Robert',
        lastName: 'Brown',
        phone: '(555) 987-6546',
        address: '321 Elm St',
        city: 'New York',
        state: 'NY',
        zipCode: '10004'
      },
      {
        username: 'jennifer.taylor',
        email: 'jennifer.taylor@email.com',
        password: await bcrypt.hash('password123', 10),
        role: 'client',
        firstName: 'Jennifer',
        lastName: 'Taylor',
        phone: '(555) 987-6547',
        address: '654 Maple Dr',
        city: 'New York',
        state: 'NY',
        zipCode: '10005'
      }
    ];

    for (const client of clients) {
      const result = await sql`
        INSERT INTO users (username, email, password, role, first_name, last_name, phone, address, city, state, zip_code)
        VALUES (${client.username}, ${client.email}, ${client.password}, ${client.role}, ${client.firstName}, ${client.lastName}, ${client.phone}, ${client.address}, ${client.city}, ${client.state}, ${client.zipCode})
        RETURNING id, username, first_name, last_name
      `;
      console.log(`✅ Created client: ${result[0].first_name} ${result[0].last_name} (ID: ${result[0].id})`);
    }

    // 6. Create Staff Users
    console.log('\n👥 Creating staff users...');
    const staffUsers = [
      {
        username: 'sarah.johnson',
        email: 'sarah.johnson@gloheadspa.com',
        password: await bcrypt.hash('password123', 10),
        role: 'staff',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '(555) 123-4567'
      },
      {
        username: 'michael.chen',
        email: 'michael.chen@gloheadspa.com',
        password: await bcrypt.hash('password123', 10),
        role: 'staff',
        firstName: 'Michael',
        lastName: 'Chen',
        phone: '(555) 123-4568'
      },
      {
        username: 'emily.davis',
        email: 'emily.davis@gloheadspa.com',
        password: await bcrypt.hash('password123', 10),
        role: 'staff',
        firstName: 'Emily',
        lastName: 'Davis',
        phone: '(555) 123-4569'
      },
      {
        username: 'david.wilson',
        email: 'david.wilson@gloheadspa.com',
        password: await bcrypt.hash('password123', 10),
        role: 'staff',
        firstName: 'David',
        lastName: 'Wilson',
        phone: '(555) 123-4570'
      }
    ];

    for (const staffUser of staffUsers) {
      const result = await sql`
        INSERT INTO users (username, email, password, role, first_name, last_name, phone)
        VALUES (${staffUser.username}, ${staffUser.email}, ${staffUser.password}, ${staffUser.role}, ${staffUser.firstName}, ${staffUser.lastName}, ${staffUser.phone})
        RETURNING id, username, first_name, last_name
      `;
      console.log(`✅ Created staff user: ${result[0].first_name} ${result[0].last_name} (ID: ${result[0].id})`);
    }

    // 7. Create Staff Records
    console.log('\n👥 Creating staff records...');
    const staffMembers = [
      {
        userId: 6, // Sarah Johnson
        title: 'Senior Stylist',
        bio: 'Experienced stylist specializing in head spa treatments',
        commissionType: 'commission',
        commissionRate: 15.0,
        hourlyRate: 25.00,
        locationId: 1
      },
      {
        userId: 7, // Michael Chen
        title: 'Color Specialist',
        bio: 'Expert in hair coloring and highlights',
        commissionType: 'commission',
        commissionRate: 18.0,
        hourlyRate: 28.00,
        locationId: 1
      },
      {
        userId: 8, // Emily Davis
        title: 'Receptionist',
        bio: 'Friendly receptionist and appointment coordinator',
        commissionType: 'hourly',
        hourlyRate: 18.00,
        locationId: 1
      },
      {
        userId: 9, // David Wilson
        title: 'Junior Stylist',
        bio: 'Up-and-coming stylist with passion for hair care',
        commissionType: 'commission',
        commissionRate: 12.0,
        hourlyRate: 22.00,
        locationId: 1
      }
    ];

    for (const staff of staffMembers) {
      const result = await sql`
        INSERT INTO staff (user_id, title, bio, commission_type, commission_rate, hourly_rate, location_id)
        VALUES (${staff.userId}, ${staff.title}, ${staff.bio}, ${staff.commissionType}, ${staff.commissionRate}, ${staff.hourlyRate}, ${staff.locationId})
        RETURNING id, user_id
      `;
      console.log(`✅ Created staff record for user ID ${result[0].user_id} (Staff ID: ${result[0].id})`);
    }

    // 8. Create Admin User
    console.log('\n👑 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      username: 'admin',
      email: 'admin@gloheadspa.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User'
    };

    const adminResult = await sql`
      INSERT INTO users (username, email, password, role, first_name, last_name)
      VALUES (${adminUser.username}, ${adminUser.email}, ${adminUser.password}, ${adminUser.role}, ${adminUser.firstName}, ${adminUser.lastName})
      RETURNING id, username, email
    `;
    console.log(`✅ Created admin user: ${adminResult[0].email} (ID: ${adminResult[0].id})`);

    // 9. Create Sample Appointments
    console.log('\n📅 Creating sample appointments...');
    const appointments = [
      {
        clientId: 1, // Lisa Acevedo
        serviceId: 1, // Signature Head Spa
        staffId: 1, // Sarah Johnson
        roomId: 1, // Spa Room 1
        startTime: '2025-08-07T10:00:00Z',
        endTime: '2025-08-07T11:00:00Z',
        status: 'confirmed',
        locationId: 1
      },
      {
        clientId: 2, // John Smith
        serviceId: 4, // Haircut & Style
        staffId: 2, // Michael Chen
        roomId: 3, // Styling Station 1
        startTime: '2025-08-07T14:00:00Z',
        endTime: '2025-08-07T14:45:00Z',
        status: 'confirmed',
        locationId: 1
      }
    ];

    for (const appointment of appointments) {
      const result = await sql`
        INSERT INTO appointments (client_id, service_id, staff_id, room_id, start_time, end_time, status, location_id)
        VALUES (${appointment.clientId}, ${appointment.serviceId}, ${appointment.staffId}, ${appointment.roomId}, ${appointment.startTime}, ${appointment.endTime}, ${appointment.status}, ${appointment.locationId})
        RETURNING id, client_id
      `;
      console.log(`✅ Created appointment for client ${result[0].client_id} (ID: ${result[0].id})`);
    }

    console.log('\n🎉 Data restoration completed successfully!');
    console.log('✅ Service categories created');
    console.log('✅ Locations created');
    console.log('✅ Rooms created');
    console.log('✅ Services created');
    console.log('✅ Client users created');
    console.log('✅ Staff users created');
    console.log('✅ Staff records created');
    console.log('✅ Admin user created');
    console.log('✅ Sample appointments created');
    console.log('\n🔑 Admin login: admin / admin123');
    console.log('🔑 Client login: lisa.acevedo / password123');
    console.log('🔑 Staff login: sarah.johnson / password123');

  } catch (error) {
    console.error('❌ Data restoration failed:', error);
    process.exit(1);
  }
}

restoreData().catch(console.error);
