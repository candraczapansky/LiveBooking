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
        INSERT INTO service_categories (name, description)
        VALUES (${category.name}, ${category.description})
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
        INSERT INTO services (name, description, duration, price, category_id)
        VALUES (${service.name}, ${service.description}, ${service.duration}, ${service.price}, ${service.categoryId})
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
        phone: '(555) 234-5678',
        role: 'Stylist',
        isActive: true,
        hireDate: '2023-03-20',
        hourlyRate: 22.00
      },
      {
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@gloheadspa.com',
        phone: '(555) 345-6789',
        role: 'Receptionist',
        isActive: true,
        hireDate: '2023-02-10',
        hourlyRate: 18.00
      }
    ];

    for (const staff of staffMembers) {
      const result = await sql`
        INSERT INTO staff (first_name, last_name, email, phone, role, is_active, hire_date, hourly_rate)
        VALUES (${staff.firstName}, ${staff.lastName}, ${staff.email}, ${staff.phone}, ${staff.role}, ${staff.isActive}, ${staff.hireDate}, ${staff.hourlyRate})
        RETURNING id, first_name, last_name
      `;
      console.log(`✅ Created staff member: ${result[0].first_name} ${result[0].last_name} (ID: ${result[0].id})`);
    }

    // 4. Create Clients
    console.log('\n👤 Creating clients...');
    const clients = [
      {
        firstName: 'Jennifer',
        lastName: 'Smith',
        email: 'jennifer.smith@email.com',
        phone: '(555) 456-7890',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210'
      },
      {
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david.wilson@email.com',
        phone: '(555) 567-8901',
        address: '456 Oak Ave',
        city: 'Somewhere',
        state: 'CA',
        zipCode: '90211'
      },
      {
        firstName: 'Lisa',
        lastName: 'Brown',
        email: 'lisa.brown@email.com',
        phone: '(555) 678-9012',
        address: '789 Pine St',
        city: 'Elsewhere',
        state: 'CA',
        zipCode: '90212'
      }
    ];

    for (const client of clients) {
      const result = await sql`
        INSERT INTO clients (first_name, last_name, email, phone, address, city, state, zip_code)
        VALUES (${client.firstName}, ${client.lastName}, ${client.email}, ${client.phone}, ${client.address}, ${client.city}, ${client.state}, ${client.zipCode})
        RETURNING id, first_name, last_name
      `;
      console.log(`✅ Created client: ${result[0].first_name} ${result[0].last_name} (ID: ${result[0].id})`);
    }

    // 5. Create Locations
    console.log('\n📍 Creating locations...');
    const locations = [
      {
        name: 'Glo Head Spa - Main Location',
        address: '123 Spa Street',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        phone: '(555) 123-4567',
        email: 'info@gloheadspa.com',
        isActive: true
      }
    ];

    for (const location of locations) {
      const result = await sql`
        INSERT INTO locations (name, address, city, state, zip_code, phone, email, is_active)
        VALUES (${location.name}, ${location.address}, ${location.city}, ${location.state}, ${location.zipCode}, ${location.phone}, ${location.email}, ${location.isActive})
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
        INSERT INTO rooms (name, location_id, capacity, is_active)
        VALUES (${room.name}, ${room.locationId}, ${room.capacity}, ${room.isActive})
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
      INSERT INTO users (first_name, last_name, email, password, role, is_active)
      VALUES (${adminUser.firstName}, ${adminUser.lastName}, ${adminUser.email}, ${adminUser.password}, ${adminUser.role}, ${adminUser.isActive})
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
        INSERT INTO appointments (client_id, service_id, staff_id, room_id, start_time, end_time, status, notes)
        VALUES (${appointment.clientId}, ${appointment.serviceId}, ${appointment.staffId}, ${appointment.roomId}, ${appointment.startTime}, ${appointment.endTime}, ${appointment.status}, ${appointment.notes})
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











