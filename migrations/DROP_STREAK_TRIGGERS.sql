-- Migration: Drop Streak Calculation Triggers
-- Description: Removes backend triggers to fully rely on client-side streak calculation.

-- 1. Drop the trigger that calls the streak calculation function
DROP TRIGGER IF EXISTS update_streak_logic ON tasks;
DROP TRIGGER IF EXISTS trigger_calculate_streaks ON tasks;

-- 2. Drop the function itself
DROP FUNCTION IF EXISTS calculate_streaks();

-- 3. Cleanup any other legacy triggers related to streaks if they exist
-- (Checking known legacy names if any, but `update_streak_logic` is the main one from 001_create_streak_trigger.sql)
