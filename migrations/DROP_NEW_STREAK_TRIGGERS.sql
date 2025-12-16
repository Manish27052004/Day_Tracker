-- Migration: Drop ACTIVE New Streak Triggers
-- Description: Explicitly drops the triggers created by the recent 'FIX_STREAK_CALCULATION_TRIGGER.sql' migration.

-- 1. Drop the calculation trigger (BEFORE UPDATE)
DROP TRIGGER IF EXISTS trigger_calculate_streak ON tasks;

-- 2. Drop the propagation trigger (AFTER UPDATE)
DROP TRIGGER IF EXISTS trigger_propagate_streak ON tasks;

-- 3. Drop the backend functions to be clean
DROP FUNCTION IF EXISTS calculate_streak_on_save();
DROP FUNCTION IF EXISTS propagate_streak_update_func();

-- 4. Verify they are gone (Optional check)
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_calculate_streak', 'trigger_propagate_streak');
