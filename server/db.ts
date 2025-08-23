import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use direct neon connection with proper configuration
const sql = neon(process.env.DATABASE_URL, { arrayMode: false, fullResults: false } as any);

// Configure Drizzle with explicit schema mapping
export const db = drizzle(sql as any, { 
  schema
});