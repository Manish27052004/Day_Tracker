import { supabase, SupabaseSession } from '@/lib/supabase';
import { type Category } from '@/lib/db';
import { type CategoryType } from '@/components/SettingsDialog';

// We define specific interfaces for Analytics to handle the is_active logic loosely


// Better to define shared types in a separate file, but to avoid large refactors now:
export interface AnalyticsSession extends SupabaseSession {
    // Extend if needed
}

export interface AnalyticsCategory {
    id: number;
    name: string;
    type: string;
    color: string;
    is_active: boolean;
}

export interface AnalyticsCategoryType {
    id: number;
    name: string;
    color?: string;
    is_active: boolean;
}

/**
 * Fetches all sessions within a date range for a specific user.
 * Returns raw data to be processed by the frontend.
 */
export const fetchAnalyticsData = async (userId: string, dateFrom: Date, dateTo: Date, dayStartHour: number = 0) => {
    // Format dates to YYYY-MM-DD for comparison, or ISO if using timestamp columns
    // Assuming 'date' column in sessions is 'YYYY-MM-DD' based on previous context
    const fromStr = dateFrom.toISOString().split('T')[0];
    const toStr = dateTo.toISOString().split('T')[0];

    // Fetch Sessions and Sleep Entries in parallel
    const [sessionsResult, sleepResult] = await Promise.all([
        supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .gte('date', fromStr)
            .lte('date', toStr),
        supabase
            .from('sleep_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('date', fromStr)
            .lte('date', toStr)
    ]);

    if (sessionsResult.error) throw sessionsResult.error;
    if (sleepResult.error) throw sleepResult.error;

    // Do NOT filter out "Sleep" sessions. 
    // Manual sleep sessions (from Execution table) should take precedence or coexist.
    // The subtractBusy logic later will ensure we don't double count if they overlap with calculated sleep.
    let allData = (sessionsResult.data as AnalyticsSession[]);
    const rawSleepData = sleepResult.data || [];

    // Deduplicate Sleep Entries: Ensure only one entry per date (take the latest)
    const uniqueSleepEntries = new Map<string, any>();
    rawSleepData.forEach((entry: any) => {
        uniqueSleepEntries.set(entry.date, entry);
    });

    // Helper to convert time string to minutes
    const timeToMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper to convert minutes back to HH:mm
    const minsToTime = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };

    // Convert Sleep Entries to "Virtual" Sessions dealing with overlaps
    const sleepSessions: AnalyticsSession[] = [];

    // Day Start in Minutes
    const dayStartMins = (dayStartHour || 0) * 60;

    uniqueSleepEntries.forEach((entry) => {
        // Collect all active session intervals for this day
        // Handle wrapping sessions (split them)
        const daySessions = allData.filter(s => s.date === entry.date);
        const busyIntervals: [number, number][] = [];

        daySessions.forEach(s => {
            const start = timeToMins(s.start_time);
            const end = timeToMins(s.end_time);

            if (end < start) {
                // Wraps midnight: [Start, 1440] and [0, End]
                busyIntervals.push([start, 1440]);
                busyIntervals.push([0, end]);
            } else {
                busyIntervals.push([start, end]);
            }
        });

        // Function to subtract busy intervals from a sleep range
        const subtractBusy = (start: number, end: number): [number, number][] => {
            if (start >= end) return [];

            let ranges: [number, number][] = [[start, end]];

            busyIntervals.forEach(([busyStart, busyEnd]) => {
                const nextRanges: [number, number][] = [];
                ranges.forEach(([rStart, rEnd]) => {
                    // No overlap
                    if (busyEnd <= rStart || busyStart >= rEnd) {
                        nextRanges.push([rStart, rEnd]);
                    }
                    // Overlap logic
                    else {
                        const overlapStart = Math.max(rStart, busyStart);
                        const overlapEnd = Math.min(rEnd, busyEnd);

                        if (rStart < overlapStart) {
                            nextRanges.push([rStart, overlapStart]);
                        }
                        if (rEnd > overlapEnd) {
                            nextRanges.push([overlapEnd, rEnd]);
                        }
                    }
                });
                ranges = nextRanges;
            });
            return ranges;
        };

        // Process Morning Sleep (DayStart -> Wake)
        if (entry.wake_up_time) {
            const wakeMins = timeToMins(entry.wake_up_time);
            // Only count if woke up AFTER day start
            if (wakeMins > dayStartMins) {
                const ranges = subtractBusy(dayStartMins, wakeMins);
                ranges.forEach(([start, end], idx) => {
                    sleepSessions.push({
                        id: `sleep-morning-${entry.id}-${idx}`,
                        user_id: entry.user_id,
                        date: entry.date,
                        custom_name: 'Morning Sleep',
                        category: 'Sleep',
                        category_type: 'Life',
                        start_time: minsToTime(start),
                        end_time: minsToTime(end),
                        description: 'Generated from Sleep Entry',
                        created_at: entry.created_at
                    });
                });
            }
        }

        // Process Night Sleep (Bed -> DayStart Next Day)
        if (entry.bed_time) {
            const bedMins = timeToMins(entry.bed_time);

            // Logic: Sleep from BedTime until DayStart (of next day)
            // Two cases:
            // 1. BedTime > DayStart (e.g. 23:00 > 04:00): Sleep 23:00->24:00 AND 00:00->04:00
            // 2. BedTime < DayStart (e.g. 01:00 < 04:00): Sleep 01:00->04:00 (Post-midnight sleep)
            //    (Note: If BedTime is e.g. 03:00, sleep is 03:00->04:00)

            // Case 1: BedTime > DayStart (Pre-midnight start)
            if (bedMins > dayStartMins) {
                // Part A: Bed -> Midnight
                if (bedMins < 1440) {
                    const rangesA = subtractBusy(bedMins, 1440);
                    rangesA.forEach(([start, end], idx) => {
                        sleepSessions.push({
                            id: `sleep-night-a-${entry.id}-${idx}`,
                            user_id: entry.user_id,
                            date: entry.date,
                            custom_name: 'Night Sleep',
                            category: 'Sleep',
                            category_type: 'Life',
                            start_time: minsToTime(start),
                            end_time: minsToTime(end),
                            description: 'Generated from Sleep Entry',
                            created_at: entry.created_at
                        });
                    });
                }

                // Part B: Midnight -> DayStart
                if (dayStartMins > 0) {
                    const rangesB = subtractBusy(0, dayStartMins);
                    rangesB.forEach(([start, end], idx) => {
                        sleepSessions.push({
                            id: `sleep-night-b-${entry.id}-${idx}`,
                            user_id: entry.user_id,
                            date: entry.date,
                            custom_name: 'Night Sleep',
                            category: 'Sleep',
                            category_type: 'Life',
                            start_time: minsToTime(start),
                            end_time: minsToTime(end),
                            description: 'Generated from Sleep Entry',
                            created_at: entry.created_at
                        });
                    });
                }
            }
            // Case 2: BedTime < DayStart (Post-midnight start)
            else {
                const ranges = subtractBusy(bedMins, dayStartMins);
                ranges.forEach(([start, end], idx) => {
                    sleepSessions.push({
                        id: `sleep-night-${entry.id}-${idx}`,
                        user_id: entry.user_id,
                        date: entry.date,
                        custom_name: 'Night Sleep',
                        category: 'Sleep',
                        category_type: 'Life',
                        start_time: minsToTime(start),
                        end_time: minsToTime(end),
                        description: 'Generated from Sleep Entry',
                        created_at: entry.created_at
                    });
                });
            }
        }
    });

    return [...allData, ...sleepSessions];
};

/**
 * Fetches ALL categories (active and inactive) for the Analytics filter.
 */
export const fetchAllCategories = async (userId: string) => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });

    if (error) throw error;
    return data as AnalyticsCategory[];
};

/**
 * Fetches ALL category types (active and inactive) for the Analytics filter.
 */
export const fetchAllCategoryTypes = async (userId: string) => {
    const { data, error } = await supabase
        .from('category_types')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });

    if (error) throw error;
    return data as AnalyticsCategoryType[];
};

export interface AnalyticsGoal {
    id: number;
    user_id: string;
    label: string;
    target_hours: number;
    category_key: string;
    color: string;
    created_at?: string;
}

/**
 * Goals CRUD
 */
export const fetchGoals = async (userId: string) => {
    const { data, error } = await supabase
        .from('analytics_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as AnalyticsGoal[];
};

export const createGoal = async (goal: Omit<AnalyticsGoal, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('analytics_goals')
        .insert(goal)
        .select()
        .single();

    if (error) throw error;
    return data as AnalyticsGoal;
};

export const updateGoal = async (id: number, updates: Partial<AnalyticsGoal>) => {
    const { data, error } = await supabase
        .from('analytics_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as AnalyticsGoal;
};

export const deleteGoal = async (id: number) => {
    const { error } = await supabase
        .from('analytics_goals')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
