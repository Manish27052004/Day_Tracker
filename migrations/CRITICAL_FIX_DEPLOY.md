# 🔥 CRITICAL BUG FIX - Deploy This NOW

## The Bug You Were Experiencing

**Problem:** Creating Dec 14 made Dec 13 become ZERO. Creating Dec 15 made Dec 14 become ZERO.

**Root Cause:** The propagation trigger was firing on INSERT, causing backwards recalculation.

## The Fix

`FIXED_STREAK_SYSTEM.sql` contains THREE critical fixes:

### 1. Propagation ONLY on UPDATE (not INSERT)
```sql
-- OLD: Fired on both INSERT and UPDATE
AFTER UPDATE OF achiever_strike, fighter_strike

-- NEW: Explicitly checks for UPDATE operation
AFTER UPDATE ON tasks
WHEN (...AND OLD.achiever_strike IS DISTINCT FROM NEW.achiever_strike...)
```

Plus added safety check:
```sql
IF TG_OP = 'INSERT' THEN
    RAISE NOTICE 'Skipping propagation on INSERT';
    RETURN NEW;
END IF;
```

### 2. Better Yesterday Detection
```sql
yesterday_exists BOOLEAN := FALSE;

SELECT ..., TRUE INTO ..., yesterday_exists
FROM tasks WHERE ...

IF NOT yesterday_exists THEN
    -- Start fresh, don't break the chain
END IF;
```

### 3. Debug Logging
Now you'll see messages like:
- "Calculated strikes for 2025-12-14: Achiever=2, Fighter=0"
- "Propagating to tomorrow"
- "Skipping propagation on INSERT"

## Deploy Instructions

1. **Open Supabase SQL Editor**
2. **Copy ALL of `FIXED_STREAK_SYSTEM.sql`**
3. **Paste and RUN**
4. **Test:**
   - Create Dec 13 task (80% progress) → Should get 1 strike
   - Create Dec 14 task (80% progress) → Should get 2 strikes, **Dec 13 stays 1** ✅
   - Create Dec 15 task (80% progress) → Should get 3 strikes, **Dec 14 stays 2** ✅

## What Changed

| Issue | Before | After |
|-------|--------|-------|
| **Creating future dates** | Made past dates ZERO ❌ | Past stays correct ✅ |
| **Propagation** | Fired on INSERT ❌ | Only on UPDATE ✅ |
| **Debugging** | Silent ❌ | Logs everything ✅ |

---

**This should fix your frustration!** Run it and let me know if the problem persists.
