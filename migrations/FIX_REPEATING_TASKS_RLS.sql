-- Check if table exists
SELECT to_regclass('repeating_tasks');

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'repeating_tasks';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'repeating_tasks';

-- Create a permissive policy if none exists (SAFE FIX for 406)
ALTER TABLE "repeating_tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of repeating_tasks"
ON "repeating_tasks"
FOR SELECT
TO authenticated
USING (true);

-- Also allow update?
CREATE POLICY "Allow user update of own repeating_tasks"
ON "repeating_tasks"
FOR ALL
TO authenticated
USING (auth.uid() = user_id);
