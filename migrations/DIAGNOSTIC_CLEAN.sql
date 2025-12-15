-- ============================================================================
-- DIAGNOSTIC STREAK SYSTEM - Clean Version
-- ============================================================================

DROP TRIGGER IF EXISTS update_streak_logic ON tasks;
DROP TRIGGER IF EXISTS calculate_streak_trigger ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_trigger ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_changes ON tasks CASCADE;

DROP FUNCTION IF EXISTS calculate_streaks() CASCADE;
DROP FUNCTION IF EXISTS calculate_streak_logic() CASCADE;
DROP FUNCTION IF EXISTS propagate_streak_change() CASCADE;
DROP FUNCTION IF EXISTS propagate_future_update() CASCADE;

-- ============================================================================
-- DIAGNOSTIC CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_streak_logic() 
RETURNS TRIGGER AS $$
DECLARE
    prev_achiever INT := 0;
    prev_fighter INT := 0;
    prev_progress INT := 0;
    min_pct INT := 60;
    yesterday_date DATE;
    yesterday_count INT;
    debug_info TEXT;
BEGIN
    -- Only run for Template Tasks
    IF NEW.template_id IS NULL THEN
        NEW.achiever_strike := 0;
        NEW.fighter_strike := 0;
        RAISE NOTICE 'Task % has no template_id, setting strikes to 0', NEW.date;
        RETURN NEW;
    END IF;

    -- Calculate yesterday's date
    yesterday_date := (NEW.date::DATE - INTERVAL '1 day')::DATE;
    
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'DIAGNOSING task for date: %', NEW.date;
    RAISE NOTICE '   Template ID: %', NEW.template_id;
    RAISE NOTICE '   User ID: %', NEW.user_id;
    RAISE NOTICE '   Progress: %%', NEW.progress;
    RAISE NOTICE '   Looking for yesterday: %', yesterday_date;

    -- Get min percentage
    BEGIN
        SELECT COALESCE(min_completion_target, 60) INTO min_pct 
        FROM repeating_tasks 
        WHERE id = NEW.template_id 
        LIMIT 1;
        RAISE NOTICE '   Min percentage: %%', min_pct;
    EXCEPTION
        WHEN OTHERS THEN
            min_pct := 60;
            RAISE NOTICE '   Min percentage: %% (default)', min_pct;
    END;

    -- Count how many yesterday tasks exist
    SELECT COUNT(*) INTO yesterday_count
    FROM tasks
    WHERE user_id = NEW.user_id 
      AND template_id = NEW.template_id
      AND date::DATE = yesterday_date;
    
    RAISE NOTICE '   Yesterday tasks found: %', yesterday_count;

    -- If no yesterday found, show what dates DO exist
    IF yesterday_count = 0 THEN
        RAISE NOTICE '   WARNING: NO YESTERDAY FOUND! Checking what dates exist...';
        
        FOR debug_info IN 
            SELECT '      Date: ' || date::DATE || ', Template: ' || template_id || ', User: ' || user_id
            FROM tasks
            WHERE template_id = NEW.template_id
              AND user_id = NEW.user_id
            ORDER BY date
            LIMIT 5
        LOOP
            RAISE NOTICE '%', debug_info;
        END LOOP;
    END IF;

    -- Fetch yesterday's data
    SELECT 
        COALESCE(achiever_strike, 0),
        COALESCE(fighter_strike, 0),
        COALESCE(progress, 0)
    INTO prev_achiever, prev_fighter, prev_progress
    FROM tasks
    WHERE user_id = NEW.user_id 
      AND template_id = NEW.template_id
      AND date::DATE = yesterday_date
    LIMIT 1;

    RAISE NOTICE '   Yesterday data: achiever=%, fighter=%, progress=%%', prev_achiever, prev_fighter, prev_progress;

    -- Validate the chain
    IF prev_progress < min_pct THEN
        RAISE NOTICE '   Yesterday failed (% < %%), resetting achiever to 0', prev_progress, min_pct;
        prev_achiever := 0;
    ELSE
        RAISE NOTICE '   Yesterday achieved (% >= %%), keeping achiever=%', prev_progress, min_pct, prev_achiever;
    END IF;
    
    IF prev_progress <= 100 THEN
        RAISE NOTICE '   Yesterday not fighter (<= 100%%), resetting fighter to 0';
        prev_fighter := 0;
    ELSE
        RAISE NOTICE '   Yesterday was fighter (% > 100), keeping fighter=%', prev_progress, prev_fighter;
    END IF;

    -- Calculate today's strikes
    IF NEW.progress >= min_pct THEN 
        NEW.achiever_strike := prev_achiever + 1;
        RAISE NOTICE '   Today achieves (% >= %%), strike = % + 1 = %', NEW.progress, min_pct, prev_achiever, NEW.achiever_strike;
    ELSE 
        NEW.achiever_strike := 0;
        RAISE NOTICE '   Today fails (% < %%), strike = 0', NEW.progress, min_pct;
    END IF;
    
    IF NEW.progress > 100 THEN 
        NEW.fighter_strike := prev_fighter + 1;
        RAISE NOTICE '   Today is fighter (% > 100), strike = % + 1 = %', NEW.progress, prev_fighter, NEW.fighter_strike;
    ELSE 
        NEW.fighter_strike := 0;
        RAISE NOTICE '   Today not fighter (<= 100), strike = 0';
    END IF;

    RAISE NOTICE 'FINAL RESULT: Achiever=%, Fighter=%', NEW.achiever_strike, NEW.fighter_strike;
    RAISE NOTICE '==================================================';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROPAGATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION propagate_future_update() 
RETURNS TRIGGER AS $$
DECLARE
    next_task_id UUID;
BEGIN
    IF (OLD.achiever_strike = NEW.achiever_strike AND 
        OLD.fighter_strike = NEW.fighter_strike) THEN
        RETURN NEW;
    END IF;

    IF NEW.template_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        RAISE NOTICE 'Skipping propagation on INSERT for %', NEW.date::DATE;
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Propagating from % (strikes changed)', NEW.date::DATE;

    SELECT id INTO next_task_id
    FROM tasks
    WHERE user_id = NEW.user_id
      AND template_id = NEW.template_id
      AND date::DATE = (NEW.date::DATE + INTERVAL '1 day')::DATE
    LIMIT 1;

    IF next_task_id IS NOT NULL THEN
        RAISE NOTICE '   Touching tomorrow task ID=%', next_task_id;
        UPDATE tasks SET updated_at = NOW() WHERE id = next_task_id;
    ELSE
        RAISE NOTICE '   No tomorrow task found';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER calculate_streak_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.template_id IS NOT NULL)
    EXECUTE FUNCTION calculate_streak_logic();

CREATE TRIGGER propagate_streak_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.template_id IS NOT NULL AND 
          (OLD.achiever_strike IS DISTINCT FROM NEW.achiever_strike OR 
           OLD.fighter_strike IS DISTINCT FROM NEW.fighter_strike))
    EXECUTE FUNCTION propagate_future_update();

-- Done! Now update a task to see diagnostic output
