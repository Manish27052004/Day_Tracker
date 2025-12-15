-- LIST ALL TRIGGERS ON TASKS TABLE
-- If there are any stray triggers returning NULL, they will block updates.

SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as definition
FROM information_schema.triggers
WHERE event_object_table = 'tasks';
