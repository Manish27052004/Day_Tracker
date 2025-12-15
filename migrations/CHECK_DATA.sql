-- ============================================================================
-- CHECK DATA SCRIPT (No Logs, Just Data)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- This query simply lists your recent tasks so we can SEE what exists.
-- We are looking for:
-- 1. Does Dec 12 and Dec 13 exist?
-- 2. Do they have a template_id? (If NULL, streak logic is skipped)
-- 3. Are the user_ids the same?

SELECT 
    date,                   -- Text or Date column
    date::DATE as real_date,-- Casted version
    template_id,            -- MUST NOT BE NULL
    progress,
    achiever_strike,
    fighter_strike,
    user_id                 -- Must match for both rows
FROM tasks 
WHERE date::DATE >= '2025-12-10'::DATE 
ORDER BY date::DATE ASC;
