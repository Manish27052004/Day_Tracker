
import { supabase } from '@/lib/supabase';
import { ProfileItem } from './profileService';

export interface MatrixDataPoint {
    date: string; // YYYY-MM-DD
    taskId: number;
    isCompleted: boolean;
}

// Fetch tasks associated with a profile
export const fetchMatrixData = async (profileId: number, from: Date, to: Date) => {
    // 1. Get Profile Items (Templates)
    const { data: items, error: itemsError } = await supabase
        .from('profile_items')
        .select(`
            *,
            template:task_templates(*)
        `)
        .eq('profile_id', profileId)
        .order('order_index');

    if (itemsError) throw itemsError;

    // 2. Get Tasks (Logs)
    const templateNames = items.map(i => i.template.name);
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    // Optimize: only fetch what we need. 
    // If templateNames is empty, skip fetching tasks
    let tasks: any[] = [];
    if (templateNames.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('id, date, name, status, progress')
            .in('name', templateNames)
            .gte('date', fromStr)
            .lte('date', toStr);

        if (tasksError) throw tasksError;
        tasks = tasksData || [];
    }

    return {
        items: items as ProfileItem[],
        tasks: tasks
    };
};

export const upsertTaskStatus = async (
    taskId: number | undefined,
    date: string,
    template: any, // passed from UI
    isCompleted: boolean
) => {
    const status = isCompleted ? 'on-track' : 'lagging';
    const progress = isCompleted ? 100 : 0;

    if (taskId) {
        // Update existing
        const { error } = await supabase
            .from('tasks')
            .update({ status, progress })
            .eq('id', taskId);
        if (error) throw error;
    } else {
        // Create new task from template
        const { error } = await supabase
            .from('tasks')
            .insert({
                date,
                name: template.name,
                status,
                progress,
                priority: template.priority,
                target_time: template.target_time || 60,
                description: template.description,

                user_id: template.user_id
            });
        if (error) throw error;
    }
};
