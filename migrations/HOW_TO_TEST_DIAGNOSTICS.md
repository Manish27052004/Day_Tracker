# How to Check for Bugs (Diagnostic Mode)

Since you ran the diagnostic script, your database is now watching for changes. Here is how to trigger a check:

## Step 1: Run this Test Query

Copy this code into your Supabase SQL Editor and run it. It forces the system to "re-check" December 13th.

```sql
-- Trigger the diagnostic for Dec 13
UPDATE tasks 
SET progress = progress 
WHERE date::DATE = '2025-12-13'::DATE 
  AND template_id IS NOT NULL;
```

## Step 2: Read the Output

Look at the **"Messages"** or **"Results"** tab at the bottom of the SQL Editor. You will see a log like this:

```
DIAGNOSING task for date: 2025-12-13
   Template ID: ...
   User ID: ...
   Looking for yesterday: 2025-12-12
   Yesterday tasks found: 1   <-- CHECK THIS NUMBER
   Yesterday data: achiever=1, fighter=1...
   FINAL RESULT: Achiever=2, Fighter=2
```

## Step 3: Analyze (or Send to Me)

**If "Yesterday tasks found: 0":**
- The system cannot find Dec 12.
- Look at the "Checking what dates exist" section in the logs.
- Check if `Template ID` matches exactly for both dates.

**If "Yesterday tasks found: 1" but Strikes are wrong:**
- The logs will say "Yesterday failed..." or "Yesterday achieved...".
- This explains why it reset to 0.

**Send me the output** if you are unsure!
