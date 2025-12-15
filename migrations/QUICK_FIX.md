# Quick Fix: Run This Migration Now

## The Problem
The PostgreSQL trigger hasn't been deployed to your Supabase database yet, so tasks are failing to insert.

## The Solution

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the **ENTIRE contents** of `migrations/001_create_streak_trigger.sql`
5. Paste into the SQL editor
6. Click **Run** (⌘+Enter or Ctrl+Enter)
7. You should see: **Success. No rows returned**

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd "d:\1_web_pproject\TIme Tracker"
supabase db push
```

## After Running the Migration

1. **Refresh your browser** (F5)
2. Try adding the "android" template again
3. It should work now! ✅

## What the Migration Does

- Creates a trigger that automatically calculates streaks whenever a task is inserted/updated
- Handles TEXT date columns properly (your current setup)
- Sets `achiever_strike` and `fighter_strike` automatically based on:
  - Yesterday's task progress
  - Today's progress value

---

**Status:** Frontend is now fixed ✅ - Just need to run the migration!
