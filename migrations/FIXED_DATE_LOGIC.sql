-- ============================================================================
-- FIXED DATE LOGIC - The "Bulletproof" Version
-- ============================================================================
-- The Problem: "2025-12-13" wasn't finding "2025-12-12" despite them looking identical.
-- The Fix: Use TO_DATE() with explicit format and TRIM() to handle any hidden issues.
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_streak_logic() 
RETURNS TRIGGER AS $$
DECLARE
    prev_achiever INT := 0;
    prev_fighter INT := 0;
    prev_progress INT := 0;
    min_pct INT := 60;
    
    -- We use TEXT for safer comparison first, then cast if needed
    target_yesterday TEXT;
BEGIN
    IF NEW.template_id IS NULL THEN
        NEW.achiever_strike := 0;
        NEW.fighter_strike := 0;
        RETURN NEW;
    END IF;

    -- 1. Calculate Yesterday as a STRING (YYYY-MM-DD)
    -- This ensures we match exactly what is likely stored in the text column
    target_yesterday := to_char((NEW.date::DATE - INTERVAL '1 day'), 'YYYY-MM-DD');

    -- 2. fetch yesterday using explicit string matching
    -- We use TRIM() to handle any hidden whitespace
    SELECT 
        COALESCE(achiever_strike, 0),
        COALESCE(fighter_strike, 0),
        COALESCE(progress, 0)
    INTO prev_achiever, prev_fighter, prev_progress
    FROM tasks
    WHERE user_id = NEW.user_id 
      AND template_id = NEW.template_id
      -- The Bulletproof Match:
      AND TRIM(date) = target_yesterday
    LIMIT 1;

    -- Get min percentage
    BEGIN
        SELECT COALESCE(min_completion_target, 60) INTO min_pct 
        FROM repeating_tasks 
        WHERE id = NEW.template_id 
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN min_pct := 60; END;

    -- Validate Chain
    IF prev_progress < min_pct THEN prev_achiever := 0; END IF;
    IF prev_progress <= 100 THEN prev_fighter := 0; END IF;

    -- Calculate Today
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-enable the trigger just in case
DROP TRIGGER IF EXISTS calculate_streak_trigger ON tasks;
CREATE TRIGGER calculate_streak_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.template_id IS NOT NULL)
    EXECUTE FUNCTION calculate_streak_logic();

-- Keep the propagation logic as is (it was working fine)
