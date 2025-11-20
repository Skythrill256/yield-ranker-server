-- Add preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Create index for fast queries on preferences
CREATE INDEX IF NOT EXISTS idx_profiles_preferences 
ON profiles USING gin(preferences);

-- Ensure RLS policy allows users to update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'preferences';

-- Test query (should return empty preferences for all users)
SELECT id, preferences 
FROM profiles 
LIMIT 5;

