# 🔍 DIAGNOSTIC MODE - Find Out Why Strikes Not Increasing

## The Problem

You're seeing:
- Dec 12: achiever=1, fighter=1
- Dec 13: achiever=1, fighter=1 (should be 2/2!) ❌

This means the trigger is NOT finding Dec 12 when calculating Dec 13.

## Run the Diagnostic

1. **Open Supabase SQL Editor**
2. **Copy ALL of `DIAGNOSTIC_STREAK_SYSTEM.sql`**
3. **Paste and RUN**
4. **Now update or insert a task** (e.g., update Dec 13's progress)
5. **SCROLL UP** in the output panel to see NOTICE messages

## What You'll See

The diagnostic will show messages like:

```
🔍 DIAGNOSING task for date: 2025-12-13
   Template ID: 00000000-0000-0000-0000-000000000001
   User ID: your-user-id
   Progress: 100
   Looking for yesterday: 2025-12-12
   Yesterday tasks found: 0  ⬅️ THIS IS THE PROBLEM!
   ⚠️ NO YESTERDAY FOUND! Checking what dates exist...
      Date: 2025-12-12, Template: DIFFERENT-ID, User: same-user
```

## Common Causes

### 1. Template ID Mismatch
- Dec 12 has template_id: `abc123`
- Dec 13 has template_id: `xyz789`
- Solution: They must have the SAME template_id!

### 2. Date Format Issue
- Database stores: `"2025-12-12T10:00:00"`
- Query looks for: `2025-12-12`
- Solution: The `::DATE` casting should fix this, but let's verify

### 3. User ID Mismatch
- Dec 12 has user_id: `user-a`
- Dec 13 has user_id: `user-b`
- Solution: Must be same user!

## Next Steps

After running the diagnostic:

1. **Copy the NOTICE output** and send it to me
2. I'll tell you EXACTLY what's wrong
3. We'll fix it!

---

**OR** if you want to check manually:

```sql
-- Check your tasks
SELECT 
    date::DATE,
    template_id,
    user_id,
    progress,
    achiever_strike,
    fighter_strike
FROM tasks
WHERE date::DATE IN ('2025-12-12', '2025-12-13')
ORDER BY date;
```

Look for:
- Do both rows have the SAME template_id? ✅
- Do both rows have the SAME user_id? ✅
- If not, that's the problem!
