/**
 * Supabase Client Configuration
 * 
 * Initializes the Supabase client for authentication and database operations.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Cloud sync will be disabled.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

// Database types for TypeScript
export interface SupabaseTask {
    id: string;
    user_id: string;
    date: string;
    name: string;
    status: string;
    priority: string;
    target_time: number;
    description: string;
    completed_description: string;
    progress: number;
    is_repeating: boolean;
    strike_count: number;
    created_at: string;
    updated_at: string;
}

export interface SupabaseSession {
    id: string;
    user_id: string;
    date: string;
    task_id?: string;
    custom_name: string;
    category: string;
    category_type: string;
    start_time: string;
    end_time: string;
    description: string;
    created_at: string;
}

export interface SupabaseSleepEntry {
    id: string;
    user_id: string;
    date: string;
    wake_up_time?: string;
    bed_time?: string;
    created_at: string;
}
