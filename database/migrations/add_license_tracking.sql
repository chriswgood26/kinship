-- Add license tracking fields to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS license_number text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS license_type text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS license_state text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS license_expiry_date date;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS license_notes text;
