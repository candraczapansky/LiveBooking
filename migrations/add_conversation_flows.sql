-- Migration: Add conversation_flows table
-- Date: 2025-01-27
-- Description: Add table for storing custom conversation flows for SMS auto-responder

CREATE TABLE IF NOT EXISTS conversation_flows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT NOT NULL, -- JSON array of conversation steps
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_flows_active ON conversation_flows(is_active);
CREATE INDEX IF NOT EXISTS idx_conversation_flows_created_at ON conversation_flows(created_at DESC);

-- Add comment to table
COMMENT ON TABLE conversation_flows IS 'Stores custom conversation flows for SMS auto-responder';
COMMENT ON COLUMN conversation_flows.id IS 'Unique identifier for the flow (UUID format)';
COMMENT ON COLUMN conversation_flows.name IS 'Display name for the conversation flow';
COMMENT ON COLUMN conversation_flows.description IS 'Description of what the flow does';
COMMENT ON COLUMN conversation_flows.steps IS 'JSON array containing the conversation steps';
COMMENT ON COLUMN conversation_flows.is_active IS 'Whether this flow is currently active';
COMMENT ON COLUMN conversation_flows.created_at IS 'When the flow was created';
COMMENT ON COLUMN conversation_flows.updated_at IS 'When the flow was last updated'; 