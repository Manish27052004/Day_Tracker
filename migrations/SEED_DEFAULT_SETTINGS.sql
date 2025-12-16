-- Seed ONLY the Sleep category (used for Daily Breakdown chart)
-- Users will create their own categories and priorities via Settings

INSERT INTO public.categories (user_id, name, type, color, "order")
SELECT 
    auth.uid(),
    'Sleep',
    'life',
    'text-purple-600',
    999
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = auth.uid() AND name = 'Sleep');
