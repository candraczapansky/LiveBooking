import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

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
        INSERT INTO service_categories (name, description, created_at, updated_at)
        VALUES (${category.name}, ${category.description}, NOW(), NOW())
        RETURNING id, name
      `;
      console.log(`✅ Created category: ${result[0].name} (ID: ${result[0].id})`);
    }

    // 2. Create Services
    console.log('\n📝 Creating services...');
    const services = [
      {
        name: 'Signature Head Spa',
        description: 'Complete head spa treatment with massage and conditioning',
        duration: 60,
        price: 99.00,
        categoryId: 1
      },
      {
        name: 'Deep Conditioning Treatment',
        description: 'Intensive conditioning for damaged hair',
        duration: 45,
        price: 75.00,
        categoryId: 1
      },
      {
        name: 'Scalp Treatment',
        description: 'Therapeutic scalp treatment for healthy hair growth',
        duration: 30,
        price: 55.00,
        categoryId: 1
      },
      {
        name: 'Haircut & Style',
        description: 'Professional haircut with styling',
        duration: 45,
        price: 65.00,
        categoryId: 2
      },
      {
        name: 'Color Treatment',
        description: 'Professional hair coloring service',
        duration: 120,
        price: 150.00,
        categoryId: 2
      },
      {
        name: 'Highlights',
        description: 'Professional highlighting service',
        duration: 90,
        price: 120.00,
        categoryId: 2
      }
    ];

    for (const service of services) {
      const result = await sql`
        INSERT INTO services (name, description, duration, price, category_id, created_at, updated_at)
        VALUES (${service.name}, ${service.description}, ${service.duration}, ${service.price}, ${service.categoryId}, NOW(), NOW())
        RETURNING id, name
      `;
      console.log(`✅ Created service: ${result[0].name} (ID: ${result[0].id})`);
    }

    // 3. Create Staff Members
    console.log('\n👥 Creating staff members...');
    const staffMembers = [
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@gloheadspa.com',
        phone: '(555) 123-4567',
        role: 'Senior Stylist',
        isActive: true,
        hireDate: '2023-01-15',
        hourlyRate: 25.00
      },
      {
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@gloheadspa.com',
        phone: '(555) 123-4568',
        role: 'Color Specialist',
        isActive: true,
        hireDate: '2023-03-20',
        hourlyRate: 28.00
      },
      {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@gloheadspa.com',
        phone: '(555) 123-4569',
        role: 'Receptionist',
        isActive: true,
        hireDate: '2023-02-10',
        hourlyRate: 18.00
      },
      {
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david.wilson@gloheadspa.com',
        phone: '(555) 123-4570',
        role: 'Junior Stylist',
        isActive: true,
        hireDate: '2023-06-01',
        hourlyRate: 22.00
      }
    ];

    for (const staff of staffMembers) {
      const result = await sql`
        INSERT INTO staff (first_name, last_name, email, phone, role, is_active, hire_date, hourly_rate, created_at, updated_at)
        VALUES (${staff.firstName}, ${staff.lastName}, ${staff.email}, ${staff.phone}, ${staff.role}, ${staff.isActive}, ${staff.hireDate}, ${staff.hourlyRate}, NOW(), NOW())
        RETURNING id, first_name, last_name
      `;
      console.log(`✅ Created staff: ${result[0].first_name} ${result[0].last_name} (ID: ${result[0].id})`);
    }

    // 4. Create Clients
    console.log('\n👤 Creating clients...');
    const clients = [
      {
        firstName: 'Lisa',
        lastName: 'Acevedo',
        email: 'lisaacevedo81@gmail.com',
        phone: '(555) 987-6543',
        address: '123 Main St, New York, NY 10001',
        dateOfBirth: '1985-03-15',
        notes: 'Prefers organic products, allergic to certain fragrances'
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '(555) 987-6544',
        address: '456 Oak Ave, New York, NY 10002',
        dateOfBirth: '1990-07-22',
        notes: 'Regular client, likes short haircuts'
      },
      {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@email.com',
        phone: '(555) 987-6545',
        address: '789 Pine St, New York, NY 10003',
        dateOfBirth: '1988-11-08',
        notes: 'Color client, prefers warm tones'
      },
      {
        firstName: 'Robert',
        lastName: 'Brown',
        email: 'robert.brown@email.com',
        phone: '(555) 987-6546',
        address: '321 Elm St, New York, NY 10004',
        dateOfBirth: '1982-05-12',
        notes: 'New client, interested in scalp treatments'
      },
      {
        firstName: 'Jennifer',
        lastName: 'Taylor',
        email: 'jennifer.taylor@email.com',
        phone: '(555) 987-6547',
        address: '654 Maple Dr, New York, NY 10005',
        dateOfBirth: '1992-09-30',
        notes: 'Regular highlights client'
      }
    ];

    for (const client of clients) {
      const result = await sql`
        INSERT INTO clients (first_name, last_name, email, phone, address, date_of_birth, notes, created_at, updated_at)
        VALUES (${client.firstName}, ${client.lastName}, ${client.email}, ${client.phone}, ${client.address}, ${client.dateOfBirth}, ${client.notes}, NOW(), NOW())
        RETURNING id, first_name, last_name
      `;
      console.log(`✅ Created client: ${result[0].first_name} ${result[0].last_name} (ID: ${result[0].id})`);
    }

    // 5. Create Locations
    console.log('\n📍 Creating locations...');
    const locations = [
      {
        name: 'Glo Head Spa - Main Location',
        address: '123 Main St, New York, NY 10001',
        phone: '(555) 123-4567',
        email: 'hello@gloheadspa.com',
        isActive: true
      }
    ];

    for (const location of locations) {
      const result = await sql`
        INSERT INTO locations (name, address, phone, email, is_active, created_at, updated_at)
        VALUES (${location.name}, ${location.address}, ${location.phone}, ${location.email}, ${location.isActive}, NOW(), NOW())
        RETURNING id, name
      `;
      console.log(`✅ Created location: ${result[0].name} (ID: ${result[0].id})`);
    }

    // 6. Create Rooms
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
        INSERT INTO rooms (name, location_id, capacity, is_active, created_at, updated_at)
        VALUES (${room.name}, ${room.locationId}, ${room.capacity}, ${room.isActive}, NOW(), NOW())
        RETURNING id, name
      `;
      console.log(`✅ Created room: ${result[0].name} (ID: ${result[0].id})`);
    }

    // 7. Create Admin User
    console.log('\n👑 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@gloheadspa.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    };

    const adminResult = await sql`
      INSERT INTO users (first_name, last_name, email, password, role, is_active, created_at, updated_at)
      VALUES (${adminUser.firstName}, ${adminUser.lastName}, ${adminUser.email}, ${adminUser.password}, ${adminUser.role}, ${adminUser.isActive}, NOW(), NOW())
      RETURNING id, email
    `;
    console.log(`✅ Created admin user: ${adminResult[0].email} (ID: ${adminResult[0].id})`);

    // 8. Create Sample Appointments
    console.log('\n📅 Creating sample appointments...');
    const appointments = [
      {
        clientId: 1,
        serviceId: 1,
        staffId: 1,
        roomId: 1,
        startTime: '2025-08-07T10:00:00Z',
        endTime: '2025-08-07T11:00:00Z',
        status: 'confirmed',
        notes: 'Regular appointment'
      },
      {
        clientId: 2,
        serviceId: 4,
        staffId: 2,
        roomId: 3,
        startTime: '2025-08-07T14:00:00Z',
        endTime: '2025-08-07T14:45:00Z',
        status: 'confirmed',
        notes: 'Haircut appointment'
      }
    ];

    for (const appointment of appointments) {
      const result = await sql`
        INSERT INTO appointments (client_id, service_id, staff_id, room_id, start_time, end_time, status, notes, created_at, updated_at)
        VALUES (${appointment.clientId}, ${appointment.serviceId}, ${appointment.staffId}, ${appointment.roomId}, ${appointment.startTime}, ${appointment.endTime}, ${appointment.status}, ${appointment.notes}, NOW(), NOW())
        RETURNING id, client_id
      `;
      console.log(`✅ Created appointment for client ${result[0].client_id} (ID: ${result[0].id})`);
    }

    console.log('\n🎉 Data restoration completed successfully!');
    console.log('✅ Services created');
    console.log('✅ Staff members created');
    console.log('✅ Clients created');
    console.log('✅ Service categories created');
    console.log('✅ Locations created');
    console.log('✅ Rooms created');
    console.log('✅ Sample appointments created');
    console.log('✅ Admin user created');
    console.log('\n🔑 Admin login: admin@gloheadspa.com / admin123');

  } catch (error) {
    console.error('❌ Data restoration failed:', error);
    process.exit(1);
  }
}

restoreData().catch(console.error);
