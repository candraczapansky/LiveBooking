// Script to execute the SQL fix
import { exec } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database URL
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Extract database connection parameters
const matches = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/([^?]+)/);

if (!matches) {
  console.error('Invalid DATABASE_URL format');
  process.exit(1);
}

const [, username, password, host, port = '5432', database] = matches;

// Create a temporary .pgpass file for passwordless authentication
const pgpassContent = `${host}:${port}:${database}:${username}:${password}`;
const pgpassPath = '/tmp/.pgpass';

try {
  fs.writeFileSync(pgpassPath, pgpassContent, { mode: 0o600 });
  console.log('Created temporary .pgpass file');
} catch (err) {
  console.error('Error creating .pgpass file:', err);
  process.exit(1);
}

// Execute the SQL file using psql
const command = `PGPASSFILE=${pgpassPath} psql -h ${host} -p ${port} -U ${username} -d ${database} -f fix-staff-login.sql`;

console.log('Executing SQL fix...');

exec(command, (error, stdout, stderr) => {
  // Clean up .pgpass file
  try {
    fs.unlinkSync(pgpassPath);
  } catch (err) {
    console.error('Error deleting .pgpass file:', err);
  }

  if (error) {
    console.error(`Error executing SQL: ${error.message}`);
    if (stderr) console.error(`SQL stderr: ${stderr}`);
    process.exit(1);
  }

  console.log('SQL fix executed successfully!');
  console.log(stdout);
  
  console.log('\n✅ Staff login issues should now be fixed!');
  console.log('Try logging in with a staff username and password "password123".');
});






