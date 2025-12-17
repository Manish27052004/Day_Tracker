-- Add is_active column to category_types (Main Categories)
ALTER TABLE public.category_types 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add is_active column to categories (Subcategories/Activities)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update RLS policies (Optional but good practice if we were strictly enforcing visibility, 
-- but for now we handle it in application logic as per request)
-- We don't strictly need to change RLS if we just filter by is_active in the query.

-- COMMENT: This allows us to "soft delete" by setting is_active = FALSE.
-- Analytics queries will SELECT * (ignoring is_active).
-- Settings/Planning queries will SELECT * WHERE is_active = TRUE.
