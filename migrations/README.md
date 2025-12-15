# PostgreSQL Streak Calculation Migration

## Overview

This migration implements automatic streak calculation for tasks using PostgreSQL triggers. Streaks are now calculated **server-side** ensuring consistency and accuracy, even when navigating dates or skipping days.

## What Changed

### ✅ Backend (PostgreSQL)

**New File:** `migrations/001_create_streak_trigger.sql`

- **Function:** `calculate_streaks()` - PL/pgSQL function that implements the streak calculation logic
- **Trigger:** `update_streak_logic` - Fires on `BEFORE INSERT OR UPDATE` of tasks

**Logic:**
1. Only runs for template-based tasks (`template_id IS NOT NULL`)
2. Looks back to yesterday's task (same `user_id` and `template_id`)
3. Validates yesterday's completion:
   - **Achiever:** Did yesterday meet `min_percentage`? (default 60%)
   - **Fighter:** Did yesterday exceed 100%?
4. Calculates today's bonuses based on current `progress`
5. Updates `achiever_strike` and `fighter_strike` columns automatically

### ✅ Frontend (React/TypeScript)

**Modified File:** `src/components/PlanningTable.tsx`

**Removed:**
- `calculateStreaksForTasks()` function - JavaScript streak calculation
- Inline streak computation logic (the complex IIFE in the Strike column)

**Changed:**
- Strike column now displays `task.achieverStrike` and `task.fighterStrike` directly from the database
- No client-side calculation needed

## How to Apply the Migration

### Step 1: Ensure PostgreSQL Database is Set Up

If you haven't already, ensure your PostgreSQL database has the `tasks` table with these columns:
- `id` (UUID, primary key)
- `user_id` (UUID or text)
- `template_id` (UUID or text, nullable)
- `date` (DATE)
- `progress` (NUMERIC or INTEGER)
- `achiever_strike` (INTEGER, default 0)
- `fighter_strike` (INTEGER, default 0)

### Step 2: Run the Migration

Connect to your PostgreSQL database and run:

```bash
psql -U <your_username> -d <your_database> -f migrations/001_create_streak_trigger.sql
```

Or using a migration tool like Supabase CLI:

```bash
supabase db push
```

### Step 3: Verify the Trigger

Test that the trigger is working:

```sql
-- Insert a test task
INSERT INTO tasks (user_id, template_id, date, progress) 
VALUES ('test-user', 'template-123', '2025-12-14', 75);

-- Check the strikes were calculated
SELECT id, date, template_id, progress, achiever_strike, fighter_strike 
FROM tasks 
WHERE template_id = 'template-123' 
ORDER BY date DESC;
```

You should see `achiever_strike = 1` if progress >= 60%.

### Step 4: Update the Frontend

The frontend changes are already applied in `PlanningTable.tsx`. After the migration runs:
1. Restart your dev server (if needed)
2. The UI will automatically display database-calculated streaks

## Benefits

✅ **Data Integrity** - Streaks calculated at write-time, never stale
✅ **Consistency** - Same logic applies whether navigating dates or bulk importing
✅ **Performance** - No client-side lookups for yesterday's tasks
✅ **Maintainability** - Single source of truth (database trigger)
✅ **Retroactive Fixes** - Update any task and streaks recalculate automatically

## Important Notes

### Column Requirements

The trigger expects these columns to exist in the `tasks` table:
- `achiever_strike` (INTEGER)
- `fighter_strike` (INTEGER)
- `template_id` (UUID or TEXT, nullable)

If they don't exist, add them first:

```sql
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS achiever_strike INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fighter_strike INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS template_id TEXT;
```

### Template Configuration

The trigger fetches `min_completion_target` from the `repeating_tasks` table. Ensure:
- You have a `repeating_tasks` table with `id` and `min_completion_target` columns
- Or modify the trigger to use a fixed percentage (e.g., 60%)

### Manual Tasks

Tasks with `template_id = NULL` will automatically have streaks set to `0`. This is intentional - only template-based tasks track streaks.

## Troubleshooting

### Issue: Streaks not updating

**Solution:** Check that the trigger is installed:
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'update_streak_logic';
```

### Issue: Error about missing column

**Solution:** Add the missing columns (see "Column Requirements" above)

### Issue: Incorrect streak values

**Solution:** The trigger runs on INSERT/UPDATE. Update any task to recalculate:
```sql
UPDATE tasks SET updated_at = NOW() WHERE template_id IS NOT NULL;
```

## Next Steps

1. ✅ Migration SQL created
2. ✅ Frontend updated  
3. ⏳ Run migration on PostgreSQL database
4. ⏳ Test with real data
5. ⏳ Remove deprecated `@/utils/streakCalculator.ts` (no longer needed)

---

**Questions?** Review the SQL comments in `001_create_streak_trigger.sql` for detailed logic explanation.
