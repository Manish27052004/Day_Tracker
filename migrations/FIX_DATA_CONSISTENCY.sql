
-- 1. Trim whitespace from Categories table
UPDATE public.categories
SET name = TRIM(name);

-- 2. Trim whitespace from Category Types table
UPDATE public.category_types
SET name = TRIM(name);

-- 3. Trim whitespace from Sessions table (both category and type columns)
UPDATE public.sessions
SET 
  category = TRIM(category),
  category_type = TRIM(category_type);

-- 4. (Optional) Fix specific known issue if 'Shallow Work' should be 'Deep Work' and Shallow Work is deleted?
-- Uncomment the below lines ONLY if you want to merge ALL 'Shallow Work' history into 'Deep Work'
-- UPDATE public.sessions
-- SET category = 'Deep Work'
-- WHERE category = 'Shallow Work';
