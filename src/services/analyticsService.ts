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
export const fetchAnalyticsData = async (userId: string, dateFrom: Date, dateTo: Date) => {
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

    // Filter out "Sleep" sessions from the sessions table to avoid double counting
    // (Since we are generating them virtually from sleep_entries)
    // Use case-insensitive check and trim to be safe
    let allData = (sessionsResult.data as AnalyticsSession[]).filter(s => s.category?.trim().toLowerCase() !== 'sleep');
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

    uniqueSleepEntries.forEach((entry) => {
        // Collect all active session intervals for this day
        const daySessions = allData.filter(s => s.date === entry.date);
        const busyIntervals = daySessions.map(s => ([timeToMins(s.start_time), timeToMins(s.end_time)]));

        // Function to subtract busy intervals from a sleep range
        const subtractBusy = (start: number, end: number): [number, number][] => {
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
                        // Busy cuts start? [BusyStart --- RStart --- BusyEnd --- REnd] -> [BusyEnd, REnd]
                        // Busy cuts end? [RStart --- BusyStart --- REnd --- BusyEnd] -> [RStart, BusyStart]
                        // Busy inside? [RStart --- BusyStart --- BusyEnd --- REnd] -> [RStart, BusyStart], [BusyEnd, REnd]
                        // Busy covers? [BusyStart --- RStart --- REnd --- BusyEnd] -> []

                        // Strict intersections
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

        // Process Morning Sleep (00:00 -> Wake)
        if (entry.wake_up_time) {
            const wakeMins = timeToMins(entry.wake_up_time);
            if (wakeMins > 0) {
                const ranges = subtractBusy(0, wakeMins);
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

        // Process Night Sleep (Bed -> 24:00)
        if (entry.bed_time) {
            const bedMins = timeToMins(entry.bed_time);
            // Sanity Check: Ignore bed times before 18:00 (6 PM) to prevent "Noon" mistakes
            // 18 * 60 = 1080
            if (bedMins < 1440 && bedMins >= 1080) {
                const ranges = subtractBusy(bedMins, 1440);
                ranges.forEach(([start, end], idx) => {
                    sleepSessions.push({
                        id: `sleep-night-${entry.id}-${idx}`,
                        user_id: entry.user_id,
                        date: entry.date,
                        custom_name: 'Night Sleep',
                        category: 'Sleep',
                        category_type: 'Life',
                        start_time: minsToTime(start),
                        end_time: minsToTime(end), // 24:00 might become 24:00 string which is technically valid for end time
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
