-- ============================================================================
-- FINAL FIX V3 - Multi-Strategy Date Matching
-- ============================================================================
-- Problem: Previous single-strategy fixes failed to link consecutive days.
-- Solution: Try MULTIPLE strategies to match "yesterday".
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_streak_logic() 
RETURNS TRIGGER AS $$
DECLARE
    prev_achiever INT := 0;
    prev_fighter INT := 0;
    prev_progress INT := 0;
    min_pct INT := 60;
    
    -- Date targets
    target_iso TEXT;       -- YYYY-MM-DD
    target_date DATE;      -- Actual Date Object
BEGIN
    IF NEW.template_id IS NULL THEN
        NEW.achiever_strike := 0;
        NEW.fighter_strike := 0;
        RETURN NEW;
    END IF;

    -- Strategy 1: Calculate Yesterday as Date Object
    target_date := (NEW.date::DATE - INTERVAL '1 day')::DATE;
    
    -- Strategy 2: Calculate Yesterday as String
    target_iso := to_char(target_date, 'YYYY-MM-DD');

    -- FETCH YESTERDAY with "Any Match" Logic
    SELECT 
        COALESCE(achiever_strike, 0),
        COALESCE(fighter_strike, 0),
        COALESCE(progress, 0)
    INTO prev_achiever, prev_fighter, prev_progress
    FROM tasks
    WHERE user_id = NEW.user_id 
      AND template_id = NEW.template_id
      AND (
          -- Match 1: Cast comparison (Standard)
          date::DATE = target_date
          OR 
          -- Match 2: String comparison (Whitespace proof)
          TRIM(date) = target_iso
      )
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

-- Re-apply Trigger
DROP TRIGGER IF EXISTS calculate_streak_trigger ON tasks;
CREATE TRIGGER calculate_streak_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.template_id IS NOT NULL)
    EXECUTE FUNCTION calculate_streak_logic();
