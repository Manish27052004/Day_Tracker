-- ============================================================================
-- DROP ALL STREAK TRIGGERS
-- ============================================================================
-- This script removes all database-side streak calculation logic.
-- Use this when moving streak calculation to the client-side.
-- ============================================================================

-- Drop all triggers
DROP TRIGGER IF EXISTS update_streak_logic ON tasks;
DROP TRIGGER IF EXISTS calculate_streak_trigger ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_trigger ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_changes ON tasks;
DROP TRIGGER IF EXISTS trg_recalc_streaks ON tasks;

-- Drop all functions
DROP FUNCTION IF EXISTS calculate_streaks() CASCADE;
DROP FUNCTION IF EXISTS calculate_streak_logic() CASCADE;
DROP FUNCTION IF EXISTS propagate_streak_change() CASCADE;
DROP FUNCTION IF EXISTS propagate_future_update() CASCADE;
DROP FUNCTION IF EXISTS recalculate_streak_chain(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_recalc_wrapper() CASCADE;

-- Verify cleanup
SELECT 'All streak triggers and functions have been removed.' AS status;
