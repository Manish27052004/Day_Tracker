-- ============================================================================
-- FIXED STREAK SYSTEM - Corrects Backwards Propagation Bug
-- ============================================================================
-- Problem Fixed: Creating Dec 14 was causing Dec 13 to become zero
-- Solution: Ensure propagation ONLY goes forward, never backwards
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
-- STEP 2: CALCULATION FUNCTION (BEFORE INSERT/UPDATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_streak_logic() 
RETURNS TRIGGER AS $$
DECLARE
    prev_achiever INT := 0;
    prev_fighter INT := 0;
    prev_progress INT := 0;
    min_pct INT := 60;
    yesterday_exists BOOLEAN := FALSE;
BEGIN
    -- Only run for Template Tasks
    IF NEW.template_id IS NULL THEN
        NEW.achiever_strike := 0;
        NEW.fighter_strike := 0;
        RETURN NEW;
    END IF;

    -- Get min percentage from template
    BEGIN
        SELECT COALESCE(min_completion_target, 60) INTO min_pct 
        FROM repeating_tasks 
        WHERE id = NEW.template_id 
        LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
            min_pct := 60;
    END;

    -- CRITICAL FIX: Fetch yesterday with proper DATE casting
    SELECT 
        COALESCE(achiever_strike, 0),
        COALESCE(fighter_strike, 0),
        COALESCE(progress, 0),
        TRUE
    INTO prev_achiever, prev_fighter, prev_progress, yesterday_exists
    FROM tasks
    WHERE user_id = NEW.user_id 
      AND template_id = NEW.template_id
      AND date::DATE = (NEW.date::DATE - INTERVAL '1 day')::DATE
    LIMIT 1;

    -- If yesterday doesn't exist, start fresh
    IF NOT yesterday_exists OR prev_progress IS NULL THEN
        prev_achiever := 0;
        prev_fighter := 0;
        prev_progress := 0;
    END IF;

    -- Validate the chain: Did yesterday actually achieve?
    -- ACHIEVER: Must meet min percentage
    IF prev_progress < min_pct THEN
        prev_achiever := 0;
    END IF;
    
    -- FIGHTER: Must exceed 100%
    IF prev_progress <= 100 THEN
        prev_fighter := 0;
    END IF;

    -- Calculate today's bonuses
    IF NEW.progress >= min_pct THEN 
        NEW.achiever_strike := prev_achiever + 1;
    ELSE 
        NEW.achiever_strike := 0;
    END IF;
    
    IF NEW.progress > 100 THEN 
        NEW.fighter_strike := prev_fighter + 1;
    ELSE 
        NEW.fighter_strike := 0;
    END IF;

    RAISE NOTICE 'Calculated strikes for %: Achiever=%, Fighter=% (based on yesterday: exists=%, progress=%)', 
                 NEW.date::DATE, NEW.achiever_strike, NEW.fighter_strike, yesterday_exists, prev_progress;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: PROPAGATION FUNCTION (AFTER UPDATE ONLY)
-- CRITICAL: This should NEVER fire on INSERT, only on UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION propagate_future_update() 
RETURNS TRIGGER AS $$
DECLARE
    next_task_id UUID;
    old_strikes TEXT;
    new_strikes TEXT;
BEGIN
    -- Build debug strings
    old_strikes := OLD.achiever_strike || '/' || OLD.fighter_strike;
    new_strikes := NEW.achiever_strike || '/' || NEW.fighter_strike;

    -- SAFETY 1: Only propagate if strikes ACTUALLY changed
    IF (OLD.achiever_strike = NEW.achiever_strike AND 
        OLD.fighter_strike = NEW.fighter_strike) THEN
        RAISE NOTICE 'No propagation needed for % (strikes unchanged: %)', NEW.date::DATE, new_strikes;
        RETURN NEW;
    END IF;

    -- SAFETY 2: Only propagate for template tasks
    IF NEW.template_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- SAFETY 3: Prevent backwards propagation - CRITICAL CHECK
    -- On INSERT, OLD might be NULL or have default values, causing issues
    -- We add an extra check to ensure we're truly in an UPDATE scenario
    IF TG_OP = 'INSERT' THEN
        RAISE NOTICE 'Skipping propagation on INSERT for %', NEW.date::DATE;
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Strikes changed for %: % → %, checking for tomorrow...', 
                 NEW.date::DATE, old_strikes, new_strikes;

    -- Find TOMORROW (Day N + 1)
    SELECT id INTO next_task_id
    FROM tasks
    WHERE user_id = NEW.user_id
      AND template_id = NEW.template_id
      AND date::DATE = (NEW.date::DATE + INTERVAL '1 day')::DATE
    LIMIT 1;

    -- If tomorrow exists, "touch" it to trigger recalculation
    IF next_task_id IS NOT NULL THEN
        RAISE NOTICE 'Propagating to tomorrow (ID: %) by touching updated_at', next_task_id;
        
        UPDATE tasks 
        SET updated_at = NOW() 
        WHERE id = next_task_id;
    ELSE
        RAISE NOTICE 'No tomorrow task found for %, chain complete', NEW.date::DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

-- Trigger 1: BEFORE INSERT/UPDATE - Calculate strikes
CREATE TRIGGER calculate_streak_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.template_id IS NOT NULL)
    EXECUTE FUNCTION calculate_streak_logic();

-- Trigger 2: AFTER UPDATE ONLY - Propagate forward (NEVER on INSERT!)
CREATE TRIGGER propagate_streak_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.template_id IS NOT NULL AND 
          (OLD.achiever_strike IS DISTINCT FROM NEW.achiever_strike OR 
           OLD.fighter_strike IS DISTINCT FROM NEW.fighter_strike))
    EXECUTE FUNCTION propagate_future_update();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    trigger_count INT;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgrelid = 'tasks'::regclass
      AND tgname IN ('calculate_streak_trigger', 'propagate_streak_trigger');
    
    IF trigger_count = 2 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ SUCCESS! Streak system installed with fixes:';
        RAISE NOTICE '   - calculate_streak_trigger (BEFORE INSERT/UPDATE)';
        RAISE NOTICE '   - propagate_streak_trigger (AFTER UPDATE ONLY - never on INSERT)';
        RAISE NOTICE '';
        RAISE NOTICE '🛡️ Protections enabled:';
        RAISE NOTICE '   - Propagation ONLY goes forward (tomorrow)';
        RAISE NOTICE '   - Propagation NEVER fires on INSERT';
        RAISE NOTICE '   - Proper DATE casting (no timestamp issues)';
        RAISE NOTICE '';
    ELSE
        RAISE WARNING '⚠️ Expected 2 triggers, found %', trigger_count;
    END IF;
END $$;

-- ============================================================================
-- TESTING PROCEDURE
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '📝 Test the fix:';
RAISE NOTICE '1. Create task for Dec 13 with 80%% progress';
RAISE NOTICE '2. Create task for Dec 14 with 80%% progress - Dec 13 should STAY at 1';
RAISE NOTICE '3. Create task for Dec 15 with 80%% progress - Dec 14 should STAY at 2';
RAISE NOTICE '';
RAISE NOTICE 'Use NOTICE messages above to debug what''s happening!';
RAISE NOTICE '';
