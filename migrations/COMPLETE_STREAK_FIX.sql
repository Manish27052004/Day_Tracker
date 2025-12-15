-- ============================================================================
-- COMPLETE STREAK SYSTEM - Single Script for Supabase SQL Editor
-- ============================================================================
-- Purpose: Fix Achiever & Fighter streak calculation with:
--   1. DATE casting (fixes timestamp mismatch)
--   2. Ripple effect (updating Dec 14 fixes Dec 15, 16, 17...)
--   3. Infinite loop protection
-- 
-- How to use:
--   1. Copy this ENTIRE file
--   2. Paste into Supabase SQL Editor
--   3. Click "Run"
--   4. Done! ✅
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEAN SLATE - Drop Everything
-- ============================================================================

DROP TRIGGER IF EXISTS update_streak_logic ON tasks;
DROP TRIGGER IF EXISTS calculate_streak_trigger ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_trigger ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_changes ON tasks;

DROP FUNCTION IF EXISTS calculate_streaks() CASCADE;
DROP FUNCTION IF EXISTS calculate_streak_logic() CASCADE;
DROP FUNCTION IF EXISTS propagate_streak_change() CASCADE;
DROP FUNCTION IF EXISTS propagate_future_update() CASCADE;

-- ============================================================================
-- STEP 2: CALCULATION FUNCTION (Fixes Date Bug)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_streak_logic() 
RETURNS TRIGGER AS $$
DECLARE
    -- Variables for "Yesterday"
    prev_achiever INT := 0;
    prev_fighter INT := 0;
    prev_progress INT := 0;
    
    -- Variables for "Today"
    min_pct INT := 60; -- Default
    today_achiever_bonus INT := 0;
    today_fighter_bonus INT := 0;
BEGIN
    -- Only run for Template Tasks (Manual tasks get 0 strikes)
    IF NEW.template_id IS NULL THEN
        NEW.achiever_strike := 0;
        NEW.fighter_strike := 0;
        RETURN NEW;
    END IF;

    -- 1. Get Template Config (Min Percentage)
    -- Try to fetch from repeating_tasks table if it exists
    BEGIN
        SELECT COALESCE(min_completion_target, 60) INTO min_pct 
        FROM repeating_tasks 
        WHERE id = NEW.template_id 
        LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
            min_pct := 60; -- Fallback if table doesn't exist
    END;

    -- 2. FETCH YESTERDAY (The Critical Fix: ::DATE casting)
    -- We force both dates to be YYYY-MM-DD so time doesn't matter
    -- This solves the "9 AM vs 10 AM" problem
    SELECT 
        COALESCE(achiever_strike, 0),
        COALESCE(fighter_strike, 0),
        COALESCE(progress, 0)
    INTO prev_achiever, prev_fighter, prev_progress
    FROM tasks
    WHERE user_id = NEW.user_id 
      AND template_id = NEW.template_id
      AND date::DATE = (NEW.date::DATE - INTERVAL '1 day')::DATE
    LIMIT 1;

    -- 3. VALIDATE THE CHAIN (Did Yesterday actually survive?)
    -- If yesterday exists but failed criteria, reset base to 0
    IF prev_progress < min_pct OR prev_progress IS NULL THEN
        prev_achiever := 0;
    END IF;
    
    IF prev_progress <= 100 OR prev_progress IS NULL THEN
        prev_fighter := 0;
    END IF;

    -- 4. CALCULATE TODAY'S STATUS
    IF NEW.progress >= min_pct THEN 
        today_achiever_bonus := 1; 
    ELSE 
        today_achiever_bonus := 0; 
    END IF;
    
    IF NEW.progress > 100 THEN 
        today_fighter_bonus := 1; 
    ELSE 
        today_fighter_bonus := 0; 
    END IF;

    -- 5. SET NEW VALUES
    NEW.achiever_strike := prev_achiever + today_achiever_bonus;
    NEW.fighter_strike := prev_fighter + today_fighter_bonus;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: PROPAGATION FUNCTION (Creates Ripple Effect)
-- ============================================================================

CREATE OR REPLACE FUNCTION propagate_future_update() 
RETURNS TRIGGER AS $$
DECLARE
    next_task_id UUID;
BEGIN
    -- SAFETY CHECK 1: Only propagate if strikes actually changed
    -- This prevents infinite loops
    IF (OLD.achiever_strike = NEW.achiever_strike AND 
        OLD.fighter_strike = NEW.fighter_strike) THEN
        RETURN NEW; -- No change, don't propagate
    END IF;

    -- SAFETY CHECK 2: Only propagate for template tasks
    IF NEW.template_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find the task for Day N + 1 (tomorrow)
    -- Same user, same template, next day
    SELECT id INTO next_task_id
    FROM tasks
    WHERE user_id = NEW.user_id
      AND template_id = NEW.template_id
      AND date::DATE = (NEW.date::DATE + INTERVAL '1 day')::DATE
    LIMIT 1;

    -- If tomorrow's task exists, trigger a recalculation
    -- This "touch" will fire the BEFORE trigger, creating a chain reaction
    IF next_task_id IS NOT NULL THEN
        UPDATE tasks 
        SET updated_at = NOW() 
        WHERE id = next_task_id;
        
        -- Optional: Log for debugging (can be removed in production)
        RAISE NOTICE 'Streak propagated from % to next day (Task ID: %)', 
                     NEW.date::DATE, next_task_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

-- Trigger 1: BEFORE INSERT/UPDATE - Calculate the streak for current row
CREATE TRIGGER calculate_streak_trigger
    BEFORE INSERT OR UPDATE OF progress, template_id ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION calculate_streak_logic();

-- Trigger 2: AFTER UPDATE - Propagate changes to future dates
CREATE TRIGGER propagate_streak_trigger
    AFTER UPDATE OF achiever_strike, fighter_strike ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION propagate_future_update();

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Check that triggers were created successfully
DO $$
DECLARE
    trigger_count INT;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgrelid = 'tasks'::regclass
      AND tgname IN ('calculate_streak_trigger', 'propagate_streak_trigger');
    
    IF trigger_count = 2 THEN
        RAISE NOTICE '✅ SUCCESS! Both triggers created successfully.';
        RAISE NOTICE '   - calculate_streak_trigger (BEFORE)';
        RAISE NOTICE '   - propagate_streak_trigger (AFTER)';
    ELSE
        RAISE WARNING '⚠️ Expected 2 triggers, found %', trigger_count;
    END IF;
END $$;

-- ============================================================================
-- TESTING QUERIES (Optional - Uncomment to test)
-- ============================================================================

-- Test 1: View current streaks
-- SELECT date::DATE, progress, achiever_strike, fighter_strike 
-- FROM tasks 
-- WHERE template_id IS NOT NULL 
-- ORDER BY date;

-- Test 2: Update an old task and watch the ripple effect
-- UPDATE tasks 
-- SET progress = 80 
-- WHERE date::DATE = '2025-12-14' 
--   AND template_id IS NOT NULL
-- LIMIT 1;

-- Test 3: Check if future dates updated
-- SELECT date::DATE, progress, achiever_strike, fighter_strike 
-- FROM tasks 
-- WHERE template_id IS NOT NULL 
--   AND date::DATE >= '2025-12-14'
-- ORDER BY date;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- How the Ripple Effect Works:
-- 1. You update Dec 14's progress → BEFORE trigger calculates new strikes
-- 2. Strikes changed → AFTER trigger fires
-- 3. AFTER trigger finds Dec 15 and "touches" it (SET updated_at = NOW())
-- 4. This fires BEFORE trigger for Dec 15 → recalculates using Dec 14's NEW values
-- 5. Dec 15's strikes change → AFTER trigger fires for Dec 15
-- 6. AFTER trigger finds Dec 16 and touches it...
-- 7. ... Chain continues until a day's strikes don't change (natural termination)
-- 
-- Infinite Loop Protection:
-- - AFTER trigger only fires if strikes actually changed
-- - Chain naturally stops when strikes stabilize
-- 
-- Date Casting Fix:
-- - OLD: WHERE date = NEW.date - INTERVAL '1 day' 
--   (Fails if "2025-12-14 09:00" vs "2025-12-13 10:00")
-- - NEW: WHERE date::DATE = (NEW.date::DATE - INTERVAL '1 day')::DATE
--   (Compares only "2025-12-14" vs "2025-12-13", ignores time)
-- 
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '🎉 Streak System Installation Complete!';
RAISE NOTICE '';
RAISE NOTICE '✅ What was fixed:';
RAISE NOTICE '   1. Date matching now uses ::DATE casting (timestamp-proof)';
RAISE NOTICE '   2. Ripple effect enabled (updating Dec 14 fixes Dec 15, 16...)';
RAISE NOTICE '   3. Infinite loop protection (change detection)';
RAISE NOTICE '';
RAISE NOTICE '📝 Next Steps:';
RAISE NOTICE '   1. Refresh your frontend browser';
RAISE NOTICE '   2. Try updating a past task''s progress';
RAISE NOTICE '   3. Watch future dates update automatically!';
RAISE NOTICE '';
