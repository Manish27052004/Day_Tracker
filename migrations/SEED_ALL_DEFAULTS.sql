-- 1. DROP CONSTRAINT if it exists (Fixing the potential typo from previous migrations and allowing new types)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'categories_type_check' AND table_name = 'categories') THEN
        ALTER TABLE public.categories DROP CONSTRAINT categories_type_check;
    END IF;
END $$;

-- 2. Define the seeding function
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Determine user_id: if called by trigger, use NEW.id; else expect it passed (but triggers don't pass args easily dynamically, so we focus on trigger use case)
    -- actually, this function is designed to be a trigger for new users.
    target_user_id := NEW.id;

    -- A. Insert Default Category Types
    INSERT INTO public.category_types (user_id, name, "order", color)
    VALUES 
    (target_user_id, 'Health Care', 1, 'bg-success/10 text-success border-success/20'),
    (target_user_id, 'Life', 2, 'bg-purple-500/10 text-purple-600 border-purple-500/20'),
    (target_user_id, 'Work', 3, 'bg-info/10 text-info border-info/20')
    ON CONFLICT (user_id, name) DO NOTHING;

    -- B. Insert Default Priorities
    -- Note: We check for existence manually if there is no unique constraint on (user_id, name) for priorities table
    INSERT INTO public.priorities (user_id, name, "order", color)
    SELECT target_user_id, 'Urgent & Important', 1, 'bg-danger/10 text-danger border-danger/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.priorities WHERE user_id = target_user_id AND name = 'Urgent & Important');

    INSERT INTO public.priorities (user_id, name, "order", color)
    SELECT target_user_id, 'Urgent & Not Important', 2, 'bg-success/10 text-success border-success/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.priorities WHERE user_id = target_user_id AND name = 'Urgent & Not Important');

    INSERT INTO public.priorities (user_id, name, "order", color)
    SELECT target_user_id, 'Not Urgent & Important', 3, 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.priorities WHERE user_id = target_user_id AND name = 'Not Urgent & Important');

    INSERT INTO public.priorities (user_id, name, "order", color)
    SELECT target_user_id, 'Not Urgent & Not Important', 4, 'bg-muted text-muted-foreground border-border'
    WHERE NOT EXISTS (SELECT 1 FROM public.priorities WHERE user_id = target_user_id AND name = 'Not Urgent & Not Important');

    -- C. Insert Default Categories (Activities)
    -- Health Care
    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Exercise', 'Health Care', 1, 'bg-success/10 text-success border-success/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Exercise');

    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Grooming', 'Health Care', 2, 'bg-warning/10 text-warning border-warning/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Grooming');

    -- Life
    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Sleep', 'Life', 3, 'bg-info/10 text-info border-info/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Sleep');

    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Time Waste', 'Life', 4, 'bg-danger/10 text-danger border-danger/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Time Waste');

    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Daily Routine', 'Life', 5, 'bg-warning/10 text-warning border-warning/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Daily Routine');

    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Hobbies', 'Life', 6, 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Hobbies');

    -- Work
    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Deep Work', 'Work', 7, 'bg-info/10 text-info border-info/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Deep Work');

    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Focused Work', 'Work', 8, 'bg-success/10 text-success border-success/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Focused Work');

    INSERT INTO public.categories (user_id, name, type, "order", color)
    SELECT target_user_id, 'Distracted Work', 'Work', 9, 'bg-danger/10 text-danger border-danger/20'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = target_user_id AND name = 'Distracted Work');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger for New Users
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- 4. Backfill Existing Users
DO $$
DECLARE
    user_rec RECORD;
BEGIN
    FOR user_rec IN SELECT id FROM auth.users
    LOOP
        -- Re-use logic: we can't call the trigger function directly as a procedure easily with different contexts, 
        -- so we just repeat the insert logic here or wrap it in a separate procedure. 
        -- To keep it valid SQL script, I'll inline the inserts for the loop:
        
        -- A. Types
        INSERT INTO public.category_types (user_id, name, "order", color)
        VALUES 
        (user_rec.id, 'Health Care', 1, 'bg-success/10 text-success border-success/20'),
        (user_rec.id, 'Life', 2, 'bg-purple-500/10 text-purple-600 border-purple-500/20'),
        (user_rec.id, 'Work', 3, 'bg-info/10 text-info border-info/20')
        ON CONFLICT (user_id, name) DO NOTHING;

        -- B. Priorities
        INSERT INTO public.priorities (user_id, name, "order", color)
        SELECT user_rec.id, 'Urgent & Important', 1, 'bg-danger/10 text-danger border-danger/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.priorities WHERE user_id = user_rec.id AND name = 'Urgent & Important');

        INSERT INTO public.priorities (user_id, name, "order", color)
        SELECT user_rec.id, 'Urgent & Not Important', 2, 'bg-success/10 text-success border-success/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.priorities WHERE user_id = user_rec.id AND name = 'Urgent & Not Important');

        INSERT INTO public.priorities (user_id, name, "order", color)
        SELECT user_rec.id, 'Not Urgent & Important', 3, 'bg-purple-500/10 text-purple-600 border-purple-500/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.priorities WHERE user_id = user_rec.id AND name = 'Not Urgent & Important');

        INSERT INTO public.priorities (user_id, name, "order", color)
        SELECT user_rec.id, 'Not Urgent & Not Important', 4, 'bg-muted text-muted-foreground border-border'
        WHERE NOT EXISTS (SELECT 1 FROM public.priorities WHERE user_id = user_rec.id AND name = 'Not Urgent & Not Important');

        -- C. Categories
        -- Health Care
        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Exercise', 'Health Care', 1, 'bg-success/10 text-success border-success/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Exercise');

        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Grooming', 'Health Care', 2, 'bg-warning/10 text-warning border-warning/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Grooming');

        -- Life
        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Sleep', 'Life', 3, 'bg-info/10 text-info border-info/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Sleep');

        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Time Waste', 'Life', 4, 'bg-danger/10 text-danger border-danger/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Time Waste');

        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Daily Routine', 'Life', 5, 'bg-muted text-muted-foreground border-border'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Daily Routine');

        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Hobbies', 'Life', 6, 'bg-purple-500/10 text-purple-600 border-purple-500/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Hobbies');

        -- Work
        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Deep Work', 'Work', 7, 'bg-info/10 text-info border-info/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Deep Work');

        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Focused Work', 'Work', 8, 'bg-success/10 text-success border-success/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Focused Work');

        INSERT INTO public.categories (user_id, name, type, "order", color)
        SELECT user_rec.id, 'Distracted Work', 'Work', 9, 'bg-danger/10 text-danger border-danger/20'
        WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = user_rec.id AND name = 'Distracted Work');
        
    END LOOP;
END $$;
```
