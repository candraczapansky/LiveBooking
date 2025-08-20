import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, locations, serviceCategories, services, staff, staffSchedules, rooms } from '../server/schema';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function restoreData() {
  try {
    console.log('🌱 Starting data restoration...');
    
    const sql = neon(DATABASE_URL);
    const db = drizzle(sql);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Create default location
    console.log('📍 Creating default location...');
    const [location] = await db.insert(locations).values({
      name: 'Glo Head Spa - Main Location',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      phone: '(555) 123-4567',
      email: 'hello@gloheadspa.com',
      isActive: true,
      isDefault: true,
    }).onConflictDoUpdate({
      target: locations.name,
      set: {
        isActive: true,
        isDefault: true,
      },
    }).returning();
    console.log('✅ Default location created');

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@gloheadspa.com',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      phone: '(555) 000-0000',
    }).onConflictDoUpdate({
      target: users.username,
      set: {
        role: 'admin',
      },
    }).returning();
    console.log('✅ Admin user created');

    // Create service categories
    console.log('📂 Creating service categories...');
    const categories = await db.insert(serviceCategories).values([
      {
        name: 'Head Spa Treatments',
        description: 'Relaxing head spa and scalp treatments',
        color: '#667eea',
      },
      {
        name: 'Hair Services',
        description: 'Haircuts, styling, and coloring services',
        color: '#764ba2',
      },
      {
        name: 'Facial Treatments',
        description: 'Skincare and facial rejuvenation treatments',
        color: '#f6ad55',
      },
      {
        name: 'Massage Therapy',
        description: 'Therapeutic massage services',
        color: '#48bb78',
      },
    ]).onConflictDoUpdate({
      target: serviceCategories.name,
      set: {
        description: sql`EXCLUDED.description`,
      },
    }).returning();
    console.log('✅ Service categories created');

    // Create sample services
    console.log('📝 Creating sample services...');
    for (const category of categories) {
      if (category.name === 'Head Spa Treatments') {
        await db.insert(services).values([
          {
            name: 'Signature Head Spa',
            description: 'Complete head spa treatment with massage',
            duration: 60,
            price: 99.99,
            categoryId: category.id,
            color: '#667eea',
          },
          {
            name: 'Scalp Treatment',
            description: 'Deep cleansing scalp treatment',
            duration: 45,
            price: 79.99,
            categoryId: category.id,
            color: '#667eea',
          },
        ]).onConflictDoUpdate({
          target: services.name,
          set: {
            price: sql`EXCLUDED.price`,
          },
        });
      } else if (category.name === 'Hair Services') {
        await db.insert(services).values([
          {
            name: 'Haircut & Style',
            description: 'Professional haircut and styling',
            duration: 60,
            price: 85.00,
            categoryId: category.id,
            color: '#764ba2',
          },
          {
            name: 'Color & Highlights',
            description: 'Full color with highlights',
            duration: 120,
            price: 150.00,
            categoryId: category.id,
            color: '#764ba2',
          },
        ]).onConflictDoUpdate({
          target: services.name,
          set: {
            price: sql`EXCLUDED.price`,
          },
        });
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
        commissionRate: 40.00,
      },
      {
        username: 'michael.chen',
        email: 'michael.chen@gloheadspa.com',
        firstName: 'Michael',
        lastName: 'Chen',
        phone: '(555) 123-4568',
        title: 'Head Spa Specialist',
        hourlyRate: 28.00,
        commissionRate: 45.00,
      },
    ];

    for (const staffMember of staffMembers) {
      // Create user account
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [user] = await db.insert(users).values({
        username: staffMember.username,
        password: hashedPassword,
        email: staffMember.email,
        role: 'staff',
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        phone: staffMember.phone,
      }).onConflictDoUpdate({
        target: users.username,
        set: {
          email: sql`EXCLUDED.email`,
        },
      }).returning();
      
      // Create staff profile
      await db.insert(staff).values({
        userId: user.id,
        title: staffMember.title,
        isActive: true,
        hireDate: new Date(),
        hourlyRate: staffMember.hourlyRate,
        commissionRate: staffMember.commissionRate,
      }).onConflictDoUpdate({
        target: staff.userId,
        set: {
          title: sql`EXCLUDED.title`,
        },
      });
    }
    console.log('✅ Staff members created');

    // Create rooms
    console.log('🚪 Creating rooms...');
    await db.insert(rooms).values([
      {
        name: 'Treatment Room 1',
        locationId: location.id,
        capacity: 1,
        isActive: true,
      },
      {
        name: 'Treatment Room 2',
        locationId: location.id,
        capacity: 1,
        isActive: true,
      },
      {
        name: 'Styling Station 1',
        locationId: location.id,
        capacity: 1,
        isActive: true,
      },
      {
        name: 'Styling Station 2',
        locationId: location.id,
        capacity: 1,
        isActive: true,
      },
    ]).onConflictDoUpdate({
      target: [rooms.name, rooms.locationId],
      set: {
        isActive: true,
      },
    });
    console.log('✅ Rooms created');

    // Create sample staff schedules
    console.log('📅 Creating staff schedules...');
    const staffList = await db.select().from(staff);
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const staffMember of staffList) {
      for (const day of weekdays) {
        await db.insert(staffSchedules).values({
          staffId: staffMember.id,
          locationId: location.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          startDate: new Date(),
          isBlocked: false,
        }).onConflictDoUpdate({
          target: [staffSchedules.staffId, staffSchedules.locationId, staffSchedules.dayOfWeek, staffSchedules.startDate],
          set: {
            startTime: sql`EXCLUDED.start_time`,
            endTime: sql`EXCLUDED.end_time`,
          },
        });
      }
    }
    console.log('✅ Staff schedules created');

    console.log('✨ Data restoration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error restoring data:', error);
    process.exit(1);
  }
}

// Run the restoration if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  restoreData()
    .then(() => {
      console.log('🎉 Data restoration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Data restoration failed:', error);
      process.exit(1);
    });
}
