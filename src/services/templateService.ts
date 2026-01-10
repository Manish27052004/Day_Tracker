import { supabase } from '@/lib/supabase';
import { RepeatingTask } from '@/lib/db';

// Re-using RepeatingTask interface but extending for DB fields if needed
export interface TaskTemplate extends RepeatingTask {
    user_id: string;
    color?: string;
    // ensure optional fields from DB are handled
}

export interface TaskBundle {
    id: number;
    user_id: string;
    name: string;
    color: string;
    created_at?: string;
    items?: TaskBundleItem[];
}

export interface TaskBundleItem {
    id: number;
    bundle_id: number;
    template_id: number;
    order_index: number;
    template?: TaskTemplate; // For joined queries
}

/**
 * TEMPLATES CRUD
 */
export const fetchTemplates = async (userId: string) => {
    const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;

    // Map DB fields to RepeatingTask interface if needed (snake_case to camelCase)
    return data.map(t => ({
        ...t,
        targetTime: t.target_time,
        repeatPattern: t.repeat_pattern,
        isActive: t.is_active,
        isDefault: t.is_default
    })) as TaskTemplate[];
};

export const createTemplate = async (template: Partial<TaskTemplate>) => {
    // Map camelCase to snake_case for DB
    const dbPayload = {
        user_id: template.user_id,
        name: template.name,
        icon: template.icon,
        color: template.color,
        target_time: template.targetTime,
        priority: template.priority,
        category: template.category,
        description: template.description,
        repeat_pattern: template.repeatPattern,
        is_active: template.isActive,
        is_default: template.isDefault,
        // Add gamification fields if they exist in schema, else ignore
    };

    const { data, error } = await supabase
        .from('task_templates')
        .insert(dbPayload)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateTemplate = async (id: number, updates: Partial<TaskTemplate>) => {
    const dbPayload: any = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.targetTime !== undefined) dbPayload.target_time = updates.targetTime;
    if (updates.repeatPattern !== undefined) dbPayload.repeat_pattern = updates.repeatPattern;
    if (updates.isActive !== undefined) dbPayload.is_active = updates.isActive;
    if (updates.isDefault !== undefined) dbPayload.is_default = updates.isDefault; // Fixed bug here too if it was missing before or just consistent

    // Fix: Add missing fields
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.category !== undefined) dbPayload.category = updates.category;
    if (updates.priority !== undefined) dbPayload.priority = updates.priority;
    if (updates.color !== undefined) dbPayload.color = updates.color;
    if (updates.icon !== undefined) dbPayload.icon = updates.icon;


    const { data, error } = await supabase
        .from('task_templates')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteTemplate = async (id: number) => {
    const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

/**
 * BUNDLES CRUD
 */
export const fetchBundles = async (userId: string) => {
    const { data, error } = await supabase
        .from('task_bundles')
        .select(`
            *,
            items:task_bundle_items(
                *,
                template:task_templates(*)
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    if (error) throw error;

    // Process the data to map nested template fields to camelCase
    return data.map(bundle => ({
        ...bundle,
        items: bundle.items.map((item: any) => ({
            ...item,
            template: item.template ? {
                ...item.template,
                targetTime: item.template.target_time,
                repeatPattern: item.template.repeat_pattern,
                isActive: item.template.is_active,
                isDefault: item.template.is_default,
                // Add other mapped fields if necessary, consistent with fetchTemplates
            } : null
        }))
    }));
};

export const createBundle = async (userId: string, name: string, color: string, templateIds: number[]) => {
    // 1. Create Bundle
    const { data: bundle, error: bundleError } = await supabase
        .from('task_bundles')
        .insert({ user_id: userId, name, color })
        .select()
        .single();

    if (bundleError) throw bundleError;

    // 2. Create Bundle Items
    if (templateIds.length > 0) {
        const itemsPayload = templateIds.map((tid, index) => ({
            bundle_id: bundle.id,
            template_id: tid,
            order_index: index
        }));

        const { error: itemsError } = await supabase
            .from('task_bundle_items')
            .insert(itemsPayload);

        if (itemsError) throw itemsError;
    }

    return bundle;
};

export const deleteBundle = async (id: number) => {
    const { error } = await supabase
        .from('task_bundles')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
