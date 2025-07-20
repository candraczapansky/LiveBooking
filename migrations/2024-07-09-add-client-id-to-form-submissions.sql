-- Migration: Add client_id field to form_submissions table
ALTER TABLE form_submissions ADD COLUMN client_id INTEGER;

-- Add foreign key constraint to link to users table
ALTER TABLE form_submissions 
ADD CONSTRAINT fk_form_submissions_client_id 
FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_form_submissions_client_id ON form_submissions(client_id); 