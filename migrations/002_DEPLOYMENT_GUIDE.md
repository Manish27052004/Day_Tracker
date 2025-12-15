# Two-Trigger Streak System - Deployment Guide

## What This Fixes

### Problems Solved

1. ✅ **Date Mismatch:** Fixed timestamp issues (9 AM vs 10 AM) using strict `DATE` casting
2. ✅ **Ripple Effect:** When you update Dec 14, Dec 15, 16, 17... all automatically recalculate
3. ✅ **Infinite Loops:** Protected with change detection

## How It Works

### Trigger 1: Calculation (BEFORE INSERT/UPDATE)
- Calculates `achiever_strike` and `fighter_strike` for the current row
- Uses `date::DATE` casting to find yesterday (ignores time component)
- Logic: 
  - Looks at yesterday's progress
  - If yesterday achieved → keep yesterday's streak
  - If yesterday failed → reset to 0
  - Add +1 if today achieves

### Trigger 2: Propagation (AFTER UPDATE)
- Detects if strikes changed
- Finds tomorrow's task (same user, same template)
- "Touches" tomorrow with `UPDATE ... SET updated_at = NOW()`
- This fires Trigger 1 for tomorrow, creating a chain reaction!

**Example Flow:**
```
Update Dec 14 progress to 80%
  ↓ Trigger 1 calculates new strikes for Dec 14
  ↓ Trigger 2 detects change
  ↓ Updates Dec 15's updated_at
    ↓ Trigger 1 calculates new strikes for Dec 15 (using Dec 14's new values)
    ↓ Trigger 2 detects change in Dec 15
    ↓ Updates Dec 16's updated_at
      ↓ ... and so on!
```

## Deployment Steps

### Step 1: Open Supabase SQL Editor

1. Go to: **https://app.supabase.com**
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Run the Migration

1. Open `migrations/002_two_trigger_streak_system.sql`
2. **Copy ALL contents** (Ctrl+A → Ctrl+C)
3. **Paste** into Supabase SQL Editor
4. Click **Run** (Ctrl+Enter)

### Step 3: Verify Success

You should see:
```
Success. No rows returned
```

Check triggers were created:
```sql
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'tasks'::regclass;
```

Should show:
- `calculate_streak_trigger` (BEFORE)
- `propagate_streak_trigger` (AFTER)

### Step 4: Test the Ripple Effect

```sql
-- 1. Check current strikes
SELECT date, progress, achiever_strike, fighter_strike 
FROM tasks 
WHERE template_id IS NOT NULL 
ORDER BY date;

-- 2. Update an OLD task (e.g., Dec 14)
UPDATE tasks 
SET progress = 80 
WHERE date = '2025-12-14' AND template_id IS NOT NULL
LIMIT 1;

-- 3. Check again - Dec 15, 16, 17... should have updated!
SELECT date, progress, achiever_strike, fighter_strike 
FROM tasks 
WHERE template_id IS NOT NULL 
ORDER BY date;
```

## Key Differences from Previous Version

| Feature | Old (001) | New (002) |
|---------|-----------|-----------|
| **Date Matching** | `date = NEW.date - INTERVAL '1 day'` ❌ | `date::DATE = (NEW.date::DATE - 1)::DATE` ✅ |
| **Ripple Effect** | None - future dates stay stale ❌ | Full propagation ✅ |
| **Triggers** | 1 (BEFORE only) | 2 (BEFORE + AFTER) |
| **Loop Protection** | N/A | Checks if values changed ✅ |

## Important Notes

### About the date::DATE Casting

**Before (Broken):**
```sql
WHERE date = NEW.date - INTERVAL '1 day'
-- Fails if "2025-12-14 09:00:00" vs "2025-12-14 10:00:00"
```

**After (Fixed):**
```sql
WHERE date::DATE = (NEW.date::DATE - INTERVAL '1 day')::DATE
-- Compares only "2025-12-14" vs "2025-12-13" (time ignored)
```

### Infinite Loop Protection

The propagation trigger checks:
```sql
IF (OLD.achiever_strike = NEW.achiever_strike AND 
    OLD.fighter_strike = NEW.fighter_strike) THEN
    RETURN NEW; -- No change, stop the chain
END IF;
```

This ensures the chain stops when strikes stabilize.

## Troubleshooting

### Issue: "Relation 'repeating_tasks' does not exist"

**Solution:** The trigger tries to fetch `min_completion_target` from templates. If the table doesn't exist, it defaults to 60%.

To fix, either:
1. Create the table
2. Or modify the trigger to always use 60%

### Issue: Ripple effect not working

**Solution:** Check if triggers are enabled:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'tasks'::regclass;
```

If disabled, enable:
```sql
ALTER TABLE tasks ENABLE TRIGGER ALL;
```

### Issue: Performance concerns with long chains

The propagation happens **synchronously** (one day at a time). If you have 100+ days to update, it might take a few seconds.

**Future optimization:** Could batch the updates or use a background job.

---

## Next Steps

1. ✅ Run migration in Supabase
2. ✅ Test with a past date update
3. ✅ Verify future dates recalculate
4. ✅ Refresh your frontend - UI should update automatically (Write-Read-Update pattern)

**Questions?** The ripple effect is automatic - update any date and watch the magic! 🔥
