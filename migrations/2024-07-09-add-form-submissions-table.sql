-- Migration: Create form_submissions table for storing form submissions
CREATE TABLE form_submissions (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL,
  form_data TEXT NOT NULL, -- JSON string of form data
  submitted_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE form_submissions 
ADD CONSTRAINT fk_form_submissions_form_id 
FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE; 