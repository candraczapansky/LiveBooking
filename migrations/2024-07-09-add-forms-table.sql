-- Migration: Create forms table for client forms feature
CREATE TABLE forms (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  submissions INTEGER DEFAULT 0,
  last_submission DATE,
  created_at TIMESTAMP DEFAULT NOW()
); 