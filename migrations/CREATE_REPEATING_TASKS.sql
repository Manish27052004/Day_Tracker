-- CREATE REPEATING_TASKS TABLE IF NOT EXISTS
-- This table is required for the streak calculator to fetch min_completion_target

CREATE TABLE IF NOT EXISTS repeating_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    min_completion_target INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add default RLS policies
ALTER TABLE repeating_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates" 
ON repeating_tasks FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates" 
ON repeating_tasks FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON repeating_tasks FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
