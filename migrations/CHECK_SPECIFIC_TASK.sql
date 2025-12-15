-- DIAGNOSTIC: CHECK UPDATING SPECIFIC TASK
-- We use the exact IDs found in your console logs to verify ownership

-- 1. Check the specific task found in logs
SELECT 
    t.id, 
    t.name, 
    t.user_id as owner_id, 
    auth.uid() as current_user,
    (t.user_id = auth.uid()) as is_owner,
    t.achiever_strike,
    t.fighter_strike
FROM tasks t
WHERE t.id = 'de2ad475-5ba4-405e-aa1d-964a075b8f69';
-- Log ID: de2ad475-5ba4-405e-aa1d-964a075b8f69
-- User ID from logs: ea76f4a7-3a1d-4b6d-a30d-5ae875909eb1

-- 2. Check if ANY user exists with that ID
SELECT id, email FROM auth.users WHERE id = 'ea76f4a7-3a1d-4b6d-a30d-5ae875909eb1';
