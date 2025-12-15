-- AGGRESSIVE CLEANUP: REMOVE ALL STREAK TRIGGERS
-- Your screenshot showed 'streak_calculation_trigger' is present.
-- This trigger runs BEFORE UPDATE and overwrites your client-side values.
-- We must delete it to let the client logic work.

DROP TRIGGER IF EXISTS "streak_calculation_trigger" ON "tasks";
DROP TRIGGER IF EXISTS "trg_recalc_streaks" ON "tasks";
DROP TRIGGER IF EXISTS "calculate_streak_trigger" ON "tasks";
DROP TRIGGER IF EXISTS "propagate_streak_trigger" ON "tasks";

-- Drop the functions they call to be safe
DROP FUNCTION IF EXISTS "calculate_streak_on_progress_update"();
DROP FUNCTION IF EXISTS "recalculate_streak_chain"();
DROP FUNCTION IF EXISTS "calculate_streak_logic"();


-- Verify they are gone
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'tasks';
