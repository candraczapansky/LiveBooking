-- Create classes table (non-destructive)
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location_id INTEGER,
  room_id INTEGER,
  instructor_staff_id INTEGER,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  capacity INTEGER DEFAULT 1,
  price DOUBLE PRECISION DEFAULT 0,
  color TEXT DEFAULT '#22C55E',
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_classes_start_time ON classes(start_time);
CREATE INDEX IF NOT EXISTS idx_classes_location ON classes(location_id);
CREATE INDEX IF NOT EXISTS idx_classes_instructor ON classes(instructor_staff_id);

-- Create enrollments table (non-destructive)
CREATE TABLE IF NOT EXISTS class_enrollments (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  status TEXT DEFAULT 'enrolled',
  created_at TIMESTAMP DEFAULT now()
);

-- Add indexes for enrollments
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_client ON class_enrollments(client_id);

-- Add foreign keys where possible (wrapped to avoid failures if columns/tables differ)
DO $$
BEGIN
  -- Reference locations if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
    BEGIN
      ALTER TABLE classes
      ADD CONSTRAINT classes_location_fk FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  -- Reference staff if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff') THEN
    BEGIN
      ALTER TABLE classes
      ADD CONSTRAINT classes_instructor_staff_fk FOREIGN KEY (instructor_staff_id) REFERENCES staff(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  -- Reference users for enrollments if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    BEGIN
      ALTER TABLE class_enrollments
      ADD CONSTRAINT class_enrollments_client_fk FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  -- Reference classes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classes') THEN
    BEGIN
      ALTER TABLE class_enrollments
      ADD CONSTRAINT class_enrollments_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;


