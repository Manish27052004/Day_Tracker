-- MANUAL UPDATE TEST
-- Run this in Supabase SQL Editor to confirm DB accepts values > 1

-- 1. Verify current bad state
SELECT id, date, progress, achiever_strike, fighter_strike 
FROM tasks 
WHERE date = '2025-12-15'
LIMIT 1;

-- 2. Force update to 5
UPDATE tasks 
SET 
  achiever_strike = 5,
  fighter_strike = 5,
  updated_at = NOW()
WHERE date = '2025-12-15';

-- 3. Verify it stuck
SELECT id, date, progress, achiever_strike, fighter_strike 
FROM tasks 
WHERE date = '2025-12-15'
LIMIT 1;
