import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface Period {
    id: number;
    user_id: string;
    title: string;
    start_date: string;
    end_date: string;
    created_at?: string;
    tasks?: PeriodTask[];
}

export interface PeriodTask {
    id: number;
    period_id: number;
    title: string;
    is_completed: boolean;
    created_at?: string;
    executionValues?: number; // Count of linked execution tasks
}

/**
 * Fetch periods that are active on a given date.
 */
export const fetchActivePeriods = async (date: Date): Promise<Period[]> => {
    // Format date as YYYY-MM-DD (Local Time) to match DB 'date' column
    const dateStr = format(date, 'yyyy-MM-dd');

    const { data, error } = await supabase
        .from('periods')
        .select(`
            *,
            tasks:period_tasks(*)
        `)
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Period[];
};

/**
 * Fetch all periods for the user (for the manager view).
 */
export const fetchAllPeriods = async (): Promise<Period[]> => {
    const { data, error } = await supabase
        .from('periods')
        .select('*')
        .order('start_date', { ascending: false });

    if (error) throw error;
    return data as Period[];
};

/**
 * Fetch full details of a period, including tasks and their progress.
 */
export const fetchPeriodDetails = async (periodId: number): Promise<Period> => {
    const { data: period, error: periodError } = await supabase
        .from('periods')
        .select('*')
        .eq('id', periodId)
        .single();

    if (periodError) throw periodError;

    // Fetch tasks
    const { data: tasks, error: tasksError } = await supabase
        .from('period_tasks')
        .select('*')
        .eq('period_id', periodId)
        .order('created_at', { ascending: true });

    if (tasksError) throw tasksError;

    // Calculate progress for each task (count execution instances)
    const tasksWithProgress = await Promise.all(tasks.map(async (task) => {
        const { count, error: countError } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('period_task_id', task.id);

        if (countError) console.error('Error counting executions for task', task.id, countError);

        return {
            ...task,
            executionValues: count || 0
        };
    }));

    return {
        ...period,
        tasks: tasksWithProgress
    } as Period;
};

export const createPeriod = async (period: Partial<Period>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('periods')
        .insert({
            user_id: user.id,
            title: period.title,
            start_date: period.start_date,
            end_date: period.end_date
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const createPeriodTask = async (periodId: number, title: string) => {
    const { data, error } = await supabase
        .from('period_tasks')
        .insert({
            period_id: periodId,
            title: title
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updatePeriodTaskStatus = async (taskId: number, isCompleted: boolean) => {
    const { error } = await supabase
        .from('period_tasks')
        .update({ is_completed: isCompleted })
        .eq('id', taskId);

    if (error) throw error;
};

export const deletePeriod = async (periodId: number) => {
    const { error } = await supabase
        .from('periods')
        .delete()
        .eq('id', periodId);

    if (error) throw error;
};

export const deletePeriodTask = async (taskId: number) => {
    const { error } = await supabase
        .from('period_tasks')
        .delete()
        .eq('id', taskId);

    if (error) throw error;
};
