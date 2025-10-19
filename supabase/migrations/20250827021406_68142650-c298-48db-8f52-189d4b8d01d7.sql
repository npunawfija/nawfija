-- Update user_status enum to include 'suspended'
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'suspended';