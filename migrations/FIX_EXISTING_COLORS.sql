
-- This script FORCIBLY updates the colors of existing default categories/priorities
-- to match the exact format expected by the Settings UI.

-- 1. CATEGORY TYPES
UPDATE public.category_types SET color = 'bg-success/10 text-success border-success/20' WHERE name = 'Health Care';
UPDATE public.category_types SET color = 'bg-purple-500/10 text-purple-600 border-purple-500/20' WHERE name = 'Life';
UPDATE public.category_types SET color = 'bg-info/10 text-info border-info/20' WHERE name = 'Work';

-- 2. PRIORITIES
UPDATE public.priorities SET color = 'bg-danger/10 text-danger border-danger/20' WHERE name = 'Urgent & Important';
UPDATE public.priorities SET color = 'bg-success/10 text-success border-success/20' WHERE name = 'Urgent & Not Important';
UPDATE public.priorities SET color = 'bg-purple-500/10 text-purple-600 border-purple-500/20' WHERE name = 'Not Urgent & Important';
UPDATE public.priorities SET color = 'bg-muted text-muted-foreground border-border' WHERE name = 'Not Urgent & Not Important';

-- 3. CATEGORIES (Execution Activities)
-- Health Care
UPDATE public.categories SET color = 'bg-success/10 text-success border-success/20' WHERE name = 'Exercise';
UPDATE public.categories SET color = 'bg-warning/10 text-warning border-warning/20' WHERE name = 'Grooming';

-- Life
UPDATE public.categories SET color = 'bg-info/10 text-info border-info/20' WHERE name = 'Sleep';
UPDATE public.categories SET color = 'bg-danger/10 text-danger border-danger/20' WHERE name = 'Time Waste';
UPDATE public.categories SET color = 'bg-warning/10 text-warning border-warning/20' WHERE name = 'Daily Routine'; -- Corrected to Yellow
UPDATE public.categories SET color = 'bg-purple-500/10 text-purple-600 border-purple-500/20' WHERE name = 'Hobbies';

-- Work
UPDATE public.categories SET color = 'bg-info/10 text-info border-info/20' WHERE name = 'Deep Work';
UPDATE public.categories SET color = 'bg-success/10 text-success border-success/20' WHERE name = 'Focused Work';
UPDATE public.categories SET color = 'bg-danger/10 text-danger border-danger/20' WHERE name = 'Distracted Work';
