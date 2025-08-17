import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Check service_categories table
    console.log('\n📂 Service Categories table:');
    const serviceCategoriesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'service_categories' 
      ORDER BY ordinal_position
    `;
    serviceCategoriesColumns.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

    // Check services table
    console.log('\n📝 Services table:');
    const servicesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      ORDER BY ordinal_position
    `;
    servicesColumns.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

    // Check staff table
    console.log('\n👥 Staff table:');
    const staffColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      ORDER BY ordinal_position
    `;
    staffColumns.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

    // Check clients table
    console.log('\n👤 Clients table:');
    const clientsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `;
    clientsColumns.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

    // Check users table
    console.log('\n👑 Users table:');
    const usersColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    usersColumns.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema().catch(console.error);
