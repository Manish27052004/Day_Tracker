-- Migration: Two-Trigger Streak System with Ripple Effect
-- Description: Implements automatic streak calculation with forward propagation
-- Date: 2025-12-14
-- Version: 2.0

-- ============================================================================
-- DROP EXISTING TRIGGERS AND FUNCTIONS (Clean Slate)
-- ============================================================================

DROP TRIGGER IF EXISTS update_streak_logic ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_changes ON tasks;
DROP FUNCTION IF EXISTS calculate_streaks();
DROP FUNCTION IF EXISTS calculate_streak_logic();
DROP FUNCTION IF EXISTS propagate_streak_change();

-- ============================================================================
-- PART 1: CALCULATION TRIGGER (BEFORE INSERT/UPDATE)
-- Function: calculate_streak_logic()
-- Description: Calculates achiever_strike and fighter_strike for current row
-- Key Fix: Uses DATE casting to avoid timestamp mismatch issues
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_streak_logic()
RETURNS TRIGGER AS $$
DECLARE
    prev_achiever INTEGER := 0;
    prev_fighter INTEGER := 0;
    prev_progress NUMERIC := 0;
    min_percentage NUMERIC := 60; -- Default 60%
    base_achiever INTEGER := 0;
    base_fighter INTEGER := 0;
    achiever_bonus INTEGER := 0;
    fighter_bonus INTEGER := 0;
BEGIN
    -- Only run for template-based tasks (manual tasks get 0 strikes)
    IF NEW.template_id IS NULL THEN
        NEW.achiever_strike := 0;
        NEW.fighter_strike := 0;
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- STEP 1: Look Back (Yesterday) - WITH DATE CASTING FIX
    -- Fetch yesterday's task with same user_id and template_id
    -- CRITICAL: Cast to DATE to ignore time component (9 AM vs 10 AM issue)
    -- ========================================================================
    SELECT 
        COALESCE(achiever_strike, 0),
        COALESCE(fighter_strike, 0),
        COALESCE(progress, 0)
    INTO 
        prev_achiever,
        prev_fighter,
        prev_progress
    FROM tasks
    WHERE 
        user_id = NEW.user_id
        AND template_id = NEW.template_id
        AND date::DATE = (NEW.date::DATE - INTERVAL '1 day')::DATE
    LIMIT 1;

    -- If no row found, variables remain 0 (already initialized)

    -- ========================================================================
    -- STEP 1.5: Fetch min_percentage from template (if available)
    -- ========================================================================
    BEGIN
        SELECT COALESCE(min_completion_target, 60)
        INTO min_percentage
        FROM repeating_tasks
        WHERE id = NEW.template_id
        LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
            min_percentage := 60; -- Fallback to default
    END;

    -- ========================================================================
    -- STEP 2: Validate the Chain (The "Real" Check)
    -- Check if yesterday's task ACTUALLY achieved the requirements
    -- ========================================================================
    
    -- Achiever Check: Did yesterday meet the minimum percentage?
    IF prev_progress >= min_percentage THEN
        base_achiever := prev_achiever;
    ELSE
        base_achiever := 0; -- Chain breaks if yesterday didn't achieve
    END IF;

    -- Fighter Check: Did yesterday exceed 100%?
    IF prev_progress > 100 THEN
        base_fighter := prev_fighter;
    ELSE
        base_fighter := 0; -- Chain breaks if yesterday didn't fight
    END IF;

    -- ========================================================================
    -- STEP 3: Calculate Today's Status
    -- Determine if today's task earns bonus strikes
    -- ========================================================================
    
    IF NEW.progress >= min_percentage THEN
        achiever_bonus := 1;
    ELSE
        achiever_bonus := 0;
    END IF;

    IF NEW.progress > 100 THEN
        fighter_bonus := 1;
    ELSE
        fighter_bonus := 0;
    END IF;

    -- ========================================================================
    -- STEP 4: Update the Row
    -- Set the final strike counts
    -- ========================================================================
    
    NEW.achiever_strike := base_achiever + achiever_bonus;
    NEW.fighter_strike := base_fighter + fighter_bonus;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: PROPAGATION TRIGGER (AFTER UPDATE)
-- Function: propagate_streak_change()
-- Description: Creates ripple effect - when Day N changes, update Day N+1
-- This causes a chain reaction that repairs the entire future timeline
-- ============================================================================

CREATE OR REPLACE FUNCTION propagate_streak_change()
RETURNS TRIGGER AS $$
DECLARE
    next_task_id UUID;
BEGIN
    -- ========================================================================
    -- SAFETY CHECK: Only propagate if strikes actually changed
    -- This prevents infinite loops
    -- ========================================================================
    IF (OLD.achiever_strike = NEW.achiever_strike AND 
        OLD.fighter_strike = NEW.fighter_strike) THEN
        RETURN NEW; -- No change, don't propagate
    END IF;

    -- ========================================================================
    -- ONLY propagate if this is a template-based task
    -- ========================================================================
    IF NEW.template_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- STEP 1: Find the task for Day N + 1 (tomorrow)
    -- Same user, same template, next day
    -- ========================================================================
    SELECT id INTO next_task_id
    FROM tasks
    WHERE 
        user_id = NEW.user_id
        AND template_id = NEW.template_id
        AND date::DATE = (NEW.date::DATE + INTERVAL '1 day')::DATE
    LIMIT 1;

    -- ========================================================================
    -- STEP 2: If tomorrow's task exists, trigger a recalculation
    -- We do a "touch" update that will fire the BEFORE trigger
    -- ========================================================================
    IF next_task_id IS NOT NULL THEN
        -- This update will cause calculate_streak_logic() to fire for tomorrow
        -- which will look back at today's newly fixed values
        UPDATE tasks 
        SET updated_at = NOW() 
        WHERE id = next_task_id;
        
        -- Log the propagation for debugging
        RAISE NOTICE 'Streak propagated: % -> Next day (ID: %)', NEW.date, next_task_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Trigger 1: BEFORE INSERT/UPDATE - Calculate the streak
CREATE TRIGGER calculate_streak_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION calculate_streak_logic();

-- Trigger 2: AFTER UPDATE - Propagate changes forward
CREATE TRIGGER propagate_streak_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION propagate_streak_change();

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION calculate_streak_logic() IS 
'Calculates achiever_strike and fighter_strike based on yesterday''s task. 
Uses DATE casting to avoid timestamp mismatch issues.';

COMMENT ON FUNCTION propagate_streak_change() IS 
'Propagates streak changes forward in time. When Day N updates, this triggers 
Day N+1 to recalculate, creating a ripple effect.';

-- ============================================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================================================

-- Test 1: Update an old task's progress and watch the ripple effect
-- UPDATE tasks 
-- SET progress = 80 
-- WHERE date = '2025-12-14' AND template_id IS NOT NULL;
--
-- Test 2: Check if future dates updated
-- SELECT date, progress, achiever_strike, fighter_strike 
-- FROM tasks 
-- WHERE template_id IS NOT NULL 
-- ORDER BY date;
--
-- Test 3: Verify the triggers exist
-- SELECT tgname, tgtype, tgenabled 
-- FROM pg_trigger 
-- WHERE tgrelid = 'tasks'::regclass;
