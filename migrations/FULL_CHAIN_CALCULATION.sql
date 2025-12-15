-- ============================================================================
-- FULL CHAIN RECALCULATION SYSTEM (FIXED)
-- ============================================================================
-- Strategy: complete rebuild of streaks for a template whenever any task changes.
-- This guarantees consistency and handles gaps/edits perfectly.
-- ============================================================================

-- 1. CLEANUP: Drop all previous attempts
DROP TRIGGER IF EXISTS update_streak_logic ON tasks;
DROP TRIGGER IF EXISTS calculate_streak_trigger ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_trigger ON tasks;
DROP TRIGGER IF EXISTS propagate_streak_changes ON tasks;

DROP FUNCTION IF EXISTS calculate_streaks() CASCADE;
DROP FUNCTION IF EXISTS calculate_streak_logic() CASCADE;
DROP FUNCTION IF EXISTS propagate_streak_change() CASCADE;
DROP FUNCTION IF EXISTS propagate_future_update() CASCADE;
DROP FUNCTION IF EXISTS recalculate_streak_chain() CASCADE;

-- 2. THE LOGIC: Recalculate everything for a specific template chain
CREATE OR REPLACE FUNCTION recalculate_streak_chain(
    target_user_id UUID, 
    target_template_id UUID
)
RETURNS VOID AS $$
DECLARE
    t_record RECORD;
    
    -- Running Counters
    running_achiever INT := 0;
    running_fighter INT := 0;
    
    -- State Tracking
    last_date DATE := NULL;
    curr_task_date DATE; -- Renamed to avoid keyword conflict
    
    -- Config
    min_pct INT := 60;
    
    -- Flags
    is_achiever BOOLEAN;
    is_fighter BOOLEAN;
    
    -- Calculated values for the current row
    final_achiever INT;
    final_fighter INT;
BEGIN
    -- Get configuration once
    BEGIN
        SELECT COALESCE(min_completion_target, 60) INTO min_pct 
        FROM repeating_tasks 
        WHERE id = target_template_id;
    EXCEPTION WHEN OTHERS THEN 
        min_pct := 60; 
    END;

    -- Iterate through ALL tasks for this chain, ordered by date
    FOR t_record IN 
        SELECT id, date, progress, achiever_strike, fighter_strike
        FROM tasks 
        WHERE user_id = target_user_id 
          AND template_id = target_template_id
        ORDER BY date::DATE ASC
    LOOP
        curr_task_date := t_record.date::DATE;

        -- GAP CHECK: If this task is not exactly 1 day after the previous one, RESET.
        -- Exception: If it's the very first task (last_date is NULL)
        IF last_date IS NOT NULL AND curr_task_date <> (last_date + INTERVAL '1 day')::DATE THEN
            RAISE NOTICE 'Gap detected between % and %. Resetting chains.', last_date, curr_task_date;
            running_achiever := 0;
            running_fighter := 0;
        END IF;

        -- Determine Success for this day
        is_achiever := (t_record.progress >= min_pct);
        is_fighter := (t_record.progress > 100);

        -- Calculate Result (Accumulate BEFORE resetting for next day)
        -- Logic: If today success, it's (previous_chain + 1). Else 0.
        
        -- Achiever Math
        IF is_achiever THEN
             -- Add to the running streak coming from yesterday
            final_achiever := running_achiever + 1;
        ELSE
            final_achiever := 0;
        END IF;

        -- Fighter Math
        IF is_fighter THEN
            final_fighter := running_fighter + 1;
        ELSE
            final_fighter := 0;
        END IF;

        -- UPDATE THE ROW if values changed (optimization)
        IF (final_achiever <> COALESCE(t_record.achiever_strike, -1)) OR 
           (final_fighter <> COALESCE(t_record.fighter_strike, -1)) THEN
            
            UPDATE tasks 
            SET achiever_strike = final_achiever,
                fighter_strike = final_fighter
            WHERE id = t_record.id;
            
        END IF;

        -- PREPARE FOR NEXT DAY
        -- If today succeeded, the running streak for tomorrow starts at today's value.
        -- If today failed, the running streak for tomorrow starts at 0.
        
        -- Correct Setup for Next Loop:
        IF is_achiever THEN
            running_achiever := final_achiever;
        ELSE
            running_achiever := 0; -- Chain broke today
        END IF;

        IF is_fighter THEN
            running_fighter := final_fighter;
        ELSE
            running_fighter := 0; -- Chain broke today
        END IF;

        last_date := curr_task_date;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. THE TRIGGER FUNCTION wrapper
CREATE OR REPLACE FUNCTION trigger_recalc_wrapper()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run for template tasks
    IF NEW.template_id IS NOT NULL THEN
        -- Run the chain recalculation
        -- We perform this AFTER the insert/update is committed to the table
        -- so the loop sees the NEW data in its correct sort order.
        PERFORM recalculate_streak_chain(NEW.user_id, NEW.template_id);
    END IF;
    RETURN NULL; -- Return value ignored for AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- 4. THE TRIGGER
CREATE TRIGGER trg_recalc_streaks
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalc_wrapper();
