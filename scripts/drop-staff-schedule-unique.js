import { neon } from '@neondatabase/serverless';

async function main() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";
    const sql = neon(DATABASE_URL);

    const dropConstraint = `DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'staff_schedules'
      AND c.conname = 'staff_schedules_staff_id_location_id_day_of_week_start_date_key'
  ) THEN
    EXECUTE 'ALTER TABLE staff_schedules DROP CONSTRAINT staff_schedules_staff_id_location_id_day_of_week_start_date_key';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'staff_schedules' AND indexname = 'staff_schedules_staff_id_location_id_day_of_week_start_date_idx'
  ) THEN
    EXECUTE 'DROP INDEX staff_schedules_staff_id_location_id_day_of_week_start_date_idx';
  END IF;
END $$;`;

    console.log('🔧 Dropping unique constraint (if exists) to allow multiple same-day schedules...');
    await sql(dropConstraint);
    console.log('✅ Constraint drop complete.');
  } catch (err) {
    console.error('❌ Failed to drop constraint:', err);
    process.exit(1);
  }
}

main().then(() => process.exit(0));


