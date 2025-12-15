-- ============================================================================
-- TEST DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor
-- ============================================================================

DO $$
DECLARE
    row_count INT;
BEGIN
    RAISE NOTICE '🚀 STARTING TEST...';

    -- 1. Check if the row actually exists
    SELECT COUNT(*) INTO row_count
    FROM tasks
    WHERE date::DATE = '2025-12-13'::DATE 
      AND template_id IS NOT NULL;

    IF row_count = 0 THEN
        RAISE NOTICE '❌ ERROR: No task found for Dec 13 with a template_id!';
        RAISE NOTICE '   Please check your table to ensure the date is exactly 2025-12-13';
        RETURN;
    ELSE
        RAISE NOTICE '✅ Found % task(s). Triggering update...', row_count;
    END IF;

    -- 2. Force an update (Change progress slightly to guarantee write)
    -- This WILL trigger the diagnostic logs
    UPDATE tasks 
    SET progress = progress -- Even a no-change update fires the BEFORE trigger
    WHERE date::DATE = '2025-12-13'::DATE 
      AND template_id IS NOT NULL;

    RAISE NOTICE '🏁 TEST COMPLETE. Check "Messages" tab for "DIAGNOSING task..." logs.';
END $$;
