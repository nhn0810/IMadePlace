-- Add core_values column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS core_values JSONB DEFAULT '[]';

-- Update comment for clarity
COMMENT ON COLUMN profiles.core_values IS 'Stores core value Q&A for portfolio generator';
