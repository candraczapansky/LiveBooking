import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
}
const sql = neon(process.env.DATABASE_URL);
async function migrateBusinessLogo() {
    try {
        console.log('Starting migration: Adding business_logo column to business_settings table...');
        // Check if the column already exists
        const checkColumn = await sql `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_settings' 
      AND column_name = 'business_logo'
    `;
        if (checkColumn.length > 0) {
            console.log('Column business_logo already exists, skipping migration');
            return;
        }
        // Add the business_logo column
        await sql `
      ALTER TABLE business_settings 
      ADD COLUMN business_logo TEXT
    `;
        console.log('Successfully added business_logo column to business_settings table');
        // Insert default business settings if none exist
        const existingSettings = await sql `
      SELECT COUNT(*) as count FROM business_settings
    `;
        if (existingSettings[0].count === 0) {
            await sql `
        INSERT INTO business_settings (business_name, timezone, currency, tax_rate, created_at, updated_at)
        VALUES ('Glo Head Spa', 'America/New_York', 'USD', 0.08, NOW(), NOW())
      `;
            console.log('Created default business settings');
        }
    }
    catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
// Run the migration
migrateBusinessLogo()
    .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
