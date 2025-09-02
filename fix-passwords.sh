#!/bin/bash

# Load environment variables
source .env

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

# Create a temporary SQL file
cat > /tmp/fix-staff-login.sql << 'EOF'
-- SQL script to fix staff login issues

-- 1. Ensure all staff users have the correct role
UPDATE users
SET role = 'staff'
FROM staff
WHERE users.id = staff.user_id
AND users.role != 'staff' 
AND users.role != 'admin';

-- 2. Reset passwords to a known value for all staff users
UPDATE users
SET password = 'password123'
FROM staff
WHERE users.id = staff.user_id;

-- 3. Fix any missing usernames
WITH staff_missing_username AS (
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        CASE 
            WHEN u.username IS NULL OR u.username = '' THEN
                LOWER(REGEXP_REPLACE(COALESCE(u.first_name, '') || COALESCE(u.last_name, ''), '[^a-zA-Z0-9]', '', 'g'))
            ELSE u.username
        END as generated_username
    FROM users u
    JOIN staff s ON s.user_id = u.id
    WHERE u.username IS NULL OR u.username = ''
)
UPDATE users 
SET username = 
    CASE 
        WHEN LENGTH(smu.generated_username) < 3 THEN 'staff' || users.id
        ELSE smu.generated_username
    END
FROM staff_missing_username smu
WHERE users.id = smu.id;

-- 4. List updated staff accounts
SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role
FROM users u
JOIN staff s ON s.user_id = u.id
ORDER BY u.first_name, u.last_name;
EOF

# Execute the SQL script
echo "Executing SQL fix script..."
echo $DATABASE_URL | xargs -I{} npx tsx -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: '{}',
});

const fs = require('fs');
const sql = fs.readFileSync('/tmp/fix-staff-login.sql', 'utf8');

async function run() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    const result = await client.query(sql);
    console.log('SQL executed successfully');
    
    if (result[result.length - 1] && result[result.length - 1].rows) {
      console.log('\n✅ Updated Staff Accounts:');
      console.log('ID | Username | Email | Name | Role');
      console.log('---|----------|-------|------|------');
      
      result[result.length - 1].rows.forEach(user => {
        console.log(`${user.id} | ${user.username} | ${user.email} | ${user.first_name} ${user.last_name} | ${user.role}`);
      });
    }
    
    console.log('\n✅ Staff login issues fixed!');
    console.log('You can now login using staff username with password \"password123\"');
    
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
"

# Clean up
rm /tmp/fix-staff-login.sql







