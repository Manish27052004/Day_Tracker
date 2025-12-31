import { supabase } from '@/lib/supabase';
// import { Database } from '@/types/supabase';

// Manual interface definitions if we don't have auto-generated Supabase types yet.
export interface Profile {
    id: number;
    user_id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    created_at: string;
}

export interface ProfileItem {
    id: number;
    profile_id: number;
    template_id: number;
    order_index: number;
    created_at: string;
    // For joined queries
    template?: any;
}

/**
 * PROFILES CRUD
 */
export const fetchProfiles = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Profile[];
};

export const createProfile = async (profile: Partial<Profile>) => {
    const { data, error } = await supabase
        .from('profiles')
        .insert(profile)
        .select()
        .single();

    if (error) throw error;
    return data as Profile;
};

export const updateProfile = async (id: number, updates: Partial<Profile>) => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Profile;
};

export const deleteProfile = async (id: number) => {
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

/**
 * PROFILE ITEMS CRUD
 */
export const fetchProfileItems = async (profileId: number) => {
    const { data, error } = await supabase
        .from('profile_items')
        .select(`
            *,
            template:task_templates(*)
        `)
        .eq('profile_id', profileId)
        .order('order_index', { ascending: true });

    if (error) throw error;
    return data as ProfileItem[];
};


export const addItemsToProfile = async (profileId: number, templateIds: number[]) => {
    if (templateIds.length === 0) return;

    // Get current count to append to the end
    const { count } = await supabase
        .from('profile_items')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);

    const startOrder = count || 0;

    const items = templateIds.map((tid, idx) => ({
        profile_id: profileId,
        template_id: tid,
        order_index: startOrder + idx
    }));

    const { error } = await supabase
        .from('profile_items')
        .insert(items);

    if (error) throw error;
};

export const removeProfileItem = async (itemId: number) => {
    const { error } = await supabase
        .from('profile_items')
        .delete()
        .eq('id', itemId);

    if (error) throw error;
};

export const reorderProfileItems = async (items: { id: number, order_index: number }[]) => {
    // This might be better done via a stored procedure or multiple updates
    // For simplicity in MVP:
    for (const item of items) {
        await supabase
            .from('profile_items')
            .update({ order_index: item.order_index })
            .eq('id', item.id);
    }
};
