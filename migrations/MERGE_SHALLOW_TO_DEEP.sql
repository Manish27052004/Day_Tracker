
-- PREVIEW: This script will rename all "Shallow Work" sessions to "Deep Work".
-- Use this ONLY if you want to eliminate "Shallow Work" from your history completely.

-- 1. Ensure "Deep Work" matches your actual target category name exactly (case sensitive).
-- 2. Run the update.

UPDATE public.sessions
SET category = 'Deep Work' -- <--- Change this to your desired target Category Name
WHERE category = 'Shallow Work'; -- <--- The name of the category you want to merge/remove

-- After running this, "Shallow Work" will disappear from charts as its data is now "Deep Work".
