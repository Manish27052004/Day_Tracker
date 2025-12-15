-- CHECK FOR TRIGGERS AND CONSTRAINTS
-- We need to see if something is blocking the update or reverting it.

-- 1. List ALL triggers on the tasks table
SELECT 
    event_object_table AS table,
    trigger_name, 
    event_manipulation AS event,
    action_timing AS timing,
    action_statement AS action
FROM information_schema.triggers
WHERE event_object_table = 'tasks';

-- 2. List ALL constraints (Check constraints can cap values!)
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'tasks'::regclass;

-- 3. Check what the database actually has for these columns
SELECT 
    column_name, 
    data_type, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name LIKE '%strike%';
