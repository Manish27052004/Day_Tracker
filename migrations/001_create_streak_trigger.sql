-- Migration: Create Streak Calculation Trigger
-- Description: Implements automatic streak calculation on tasks table using PostgreSQL trigger
-- Date: 2025-12-14

-- ============================================================================
-- Function: calculate_streaks()
-- Description: Calculates achiever_strike and fighter_strike based on:
--   1. Yesterday's task (same user_id, template_id, date-1)
--   2. Yesterday's completion status (progress vs min_percentage)
--   3. Today's completion status
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_streaks()
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
    -- STEP 1: Look Back (Yesterday)
    -- Fetch yesterday's task with same user_id and template_id
    -- Note: date column is TEXT, so we need to cast to DATE for arithmetic
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
        AND date = (NEW.date::DATE - INTERVAL '1 day')::TEXT
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
            min_percentage := 60; -- Fallback to default if table doesn't exist
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
-- Trigger: update_streak_logic
-- Description: Executes calculate_streaks() before INSERT or UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS update_streak_logic ON tasks;

CREATE TRIGGER update_streak_logic
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION calculate_streaks();

-- ============================================================================
-- Verification Query (Optional - for testing)
-- ============================================================================

-- Test the trigger by inserting/updating tasks:
-- 
-- Example 1: Insert a new task from a template
-- INSERT INTO tasks (user_id, template_id, date, progress) 
-- VALUES ('user123', 1, '2025-12-14', 75);
-- 
-- Example 2: Update progress to trigger recalculation
-- UPDATE tasks 
-- SET progress = 120 
-- WHERE id = 1;
--
-- Verify strikes were calculated:
-- SELECT id, date, template_id, progress, achiever_strike, fighter_strike 
-- FROM tasks 
-- WHERE template_id IS NOT NULL 
-- ORDER BY date DESC;
