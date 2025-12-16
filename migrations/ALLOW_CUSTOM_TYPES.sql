-- Drop the constraint that restricts category types to 'work' and 'life'
alert table public.categories drop constraint if exists categories_type_check;

-- Optional: If the constraint was named automatically, we might need to find it.
-- But typically 'categories_type_check' is the default naming convention for a check on column 'type'.
-- If it fails, you can run:
-- select * from information_schema.check_constraints where constraint_schema = 'public';
-- to find the name.

-- Alternatively, we can just alter the column to be text without check
-- (Postgres doesn't automatically drop checks when altering types unless specified, but dropping the check specifically is safer)

-- Correct command:
alter table public.categories drop constraint categories_type_check;
