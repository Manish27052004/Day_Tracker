-- ============================================================================
-- VERIFY STREAKS SCRIPT
-- Run this in Supabase SQL Editor to check if bugs are gone
-- ============================================================================

-- 1. Force Recalculation (Triggers the new logic)
UPDATE tasks 
SET progress = progress 
WHERE date >= '2025-12-10'; 

-- 2. View the Results
-- Look at the 'achiever_strike' and 'fighter_strike' columns.
-- They should increment by 1 each day (if progress met).
SELECT 
    date,
    progress, 
    achiever_strike, 
    fighter_strike,
    template_id
FROM tasks 
WHERE date >= '2025-12-10'
ORDER BY date ASC;
