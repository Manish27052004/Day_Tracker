-- 1. Create the Robust Calculation Function
CREATE OR REPLACE FUNCTION calculate_streak_on_save()
RETURNS TRIGGER AS $$
DECLARE
    yesterday_date DATE;
    min_percentage INTEGER := 60; -- Default
    yesterday_achiever INTEGER := 0;
    yesterday_fighter INTEGER := 0;
    yesterday_progress INTEGER := 0;
    
    base_achiever INTEGER := 0;
    base_fighter INTEGER := 0;
    
    bonus_achiever INTEGER := 0;
    bonus_fighter INTEGER := 0;
BEGIN
    -- Only run for template tasks
    IF NEW.template_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Fetch min_completion_target from template if available
    SELECT COALESCE(min_completion_target, 60) INTO min_percentage
    FROM repeating_tasks
    WHERE id = NEW.template_id;

    -- 1. Identify Yesterday
    yesterday_date := (NEW.date::DATE - INTERVAL '1 day')::DATE;
    
    -- 2. Fetch History (Yesterday's Task)
    SELECT 
        achiever_strike, 
        fighter_strike, 
        progress
    INTO 
        yesterday_achiever, 
        yesterday_fighter, 
        yesterday_progress
    FROM tasks
    WHERE user_id = NEW.user_id
      AND template_id = NEW.template_id
      AND date::DATE = yesterday_date
    LIMIT 1;

    -- If no yesterday record found, values remain 0 (fresh start)

    -- 3. Validation Check (Backwards Logic)
    -- Calculate Base from Yesterday (did yesterday sustain the streak?)
    IF yesterday_progress >= min_percentage THEN
        base_achiever := yesterday_achiever;
    ELSE
        base_achiever := 0;
    END IF;

    IF yesterday_progress > 100 THEN
        base_fighter := yesterday_fighter;
    ELSE
        base_fighter := 0;
    END IF;

    -- 4. Calculate Today's Bonus
    IF NEW.progress >= min_percentage THEN
        bonus_achiever := 1;
    ELSE
        bonus_achiever := 0;
    END IF;

    IF NEW.progress > 100 THEN
        bonus_fighter := 1;
    ELSE
        bonus_fighter := 0;
    END IF;

    -- Set Final Values
    NEW.achiever_strike := base_achiever + bonus_achiever;
    NEW.fighter_strike := base_fighter + bonus_fighter;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Register Trigger 1: Calculate on Save
DROP TRIGGER IF EXISTS trigger_calculate_streak ON tasks;
CREATE TRIGGER trigger_calculate_streak
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION calculate_streak_on_save();


-- 2. Create the "Chain Reaction" Trigger (Propagate Updates)
CREATE OR REPLACE FUNCTION propagate_streak_update_func()
RETURNS TRIGGER AS $$
DECLARE
    tomorrow_date DATE;
BEGIN
    -- If strikes changed, touch tomorrow's task to trigger its re-calc
    IF (OLD.achiever_strike IS DISTINCT FROM NEW.achiever_strike) OR 
       (OLD.fighter_strike IS DISTINCT FROM NEW.fighter_strike) THEN
        
        tomorrow_date := (NEW.date::DATE + INTERVAL '1 day')::DATE;
        
        -- Just update 'updated_at' to trigger the BEFORE UPDATE on tomorrow's task
        UPDATE tasks
        SET updated_at = NOW()
        WHERE user_id = NEW.user_id
          AND template_id = NEW.template_id
          AND date::DATE = tomorrow_date;
          
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Register Trigger 2: Chain Reaction
DROP TRIGGER IF EXISTS trigger_propagate_streak ON tasks;
CREATE TRIGGER trigger_propagate_streak
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION propagate_streak_update_func();

-- 3. The "One-Time Repair" Command
-- Force every task to re-calculate right now to fix stale data
UPDATE tasks SET updated_at = NOW() WHERE template_id IS NOT NULL;
