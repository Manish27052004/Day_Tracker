-- VERIFY USER ID AND TASK ID
-- Run this in Supabase SQL Editor
-- This will show us the user_id of the task we are trying to update
-- AND the user_id of the currently logged-in user (you)

SELECT 
  id as task_id, 
  user_id as task_user_id, 
  auth.uid() as current_user_id,
  (user_id = auth.uid()) as is_owner
FROM tasks 
WHERE date = '2025-12-15'
LIMIT 5;
