-- Allow multiple non-overlapping schedules for the same staff, location, and day
-- by dropping the strict uniqueness constraint that prevented multiple same-day shifts.

-- Attempt to drop if it exists (name may vary by environment)
DO $$
BEGIN
  -- Common explicit name used in one migration
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'staff_schedules'
      AND c.conname = 'staff_schedules_staff_id_location_id_day_of_week_start_date_key'
  ) THEN
    EXECUTE 'ALTER TABLE staff_schedules DROP CONSTRAINT staff_schedules_staff_id_location_id_day_of_week_start_date_key';
  END IF;

  -- In case earlier schema used a generic unique index name
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'staff_schedules' AND indexname = 'staff_schedules_staff_id_location_id_day_of_week_start_date_idx'
  ) THEN
    EXECUTE 'DROP INDEX staff_schedules_staff_id_location_id_day_of_week_start_date_idx';
  END IF;
END $$;

-- No new unique added. Overlap prevention is handled in API (server/routes.ts)

