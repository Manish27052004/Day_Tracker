-- ============================================================================
-- FIX ROW LEVEL SECURITY (RLS) POLICY FOR STRIKE COLUMNS
-- ============================================================================
-- Problem: Supabase is silently rejecting updates to achiever_strike and 
-- fighter_strike columns due to RLS policy restrictions.
-- ============================================================================

-- 1. Check current policies (for debugging)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tasks';

-- 2. Drop existing restrictive UPDATE policy if it exists
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;

-- 3. Create a permissive UPDATE policy that allows all columns
CREATE POLICY "Users can update their own tasks"
ON tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Verify the policy was created
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tasks' AND cmd = 'UPDATE';

-- Success message
SELECT '✅ RLS policy updated! Users can now update strike columns.' AS status;
