import { parse, addHours, addDays, subDays, isWithinInterval, differenceInMinutes, isBefore, isAfter, startOfDay } from 'date-fns';

export type ViewMode = 'SESSION' | 'CATEGORY' | 'SUBCATEGORY';

export interface LogEntry {
    startTime: string; // HH:mm format
    endTime: string;
    category: string;
    customName?: string; // Session name
    taskId?: number | null;
    richContent?: string;
    originalSessionId?: number;
}

export interface ChartSlice {
    name: string;
    value: number; // minutes
    fill: string;
}

// Category to type mapping
const CATEGORY_TYPE_MAP: Record<string, 'WORK' | 'LIFE'> = {
    'Deep Focus': 'WORK',
    'Focus': 'WORK',
    'Distracted': 'WORK',
    'Sleep': 'LIFE',
    'Routine': 'LIFE',
    'Habits': 'LIFE',
    'Wasted Time': 'LIFE',
};

// Default color palette
const COLORS = {
    'Deep Focus': '#10b981',
    'Focus': '#3b82f6',
    'Distracted': '#f59e0b',
    'Sleep': '#8b5cf6',
    'Routine': '#6b7280',
    'Habits': '#22c55e',
    'Wasted Time': '#ef4444',
    'WORK': '#3b82f6',
    'LIFE': '#8b5cf6',
    'Untracked': '#e5e7eb',
};

// Color palette for sessions (vibrant, distinguishable colors)
const SESSION_COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // orange
    '#8b5cf6', // purple
    '#ef4444', // red
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange-600
    '#6366f1', // indigo
    '#84cc16', // lime
    '#a855f7', // purple-500
    '#22c55e', // green-500
    '#eab308', // yellow-500
    '#f43f5e', // rose
    '#0ea5e9', // sky
];

// Simple hash function to assign consistent colors to session names
function getSessionColor(sessionName: string, index: number): string {
    // Use a simple hash of the session name
    let hash = 0;
    for (let i = 0; i < sessionName.length; i++) {
        hash = sessionName.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32-bit integer
    }

    // Use absolute value and modulo to get a color index
    const colorIndex = Math.abs(hash) % SESSION_COLORS.length;
    return SESSION_COLORS[colorIndex];
}

interface GenerateChartDataParams {
    logs: LogEntry[];
    currentDate: Date;
    wakeTime?: string;
    bedTime?: string;
    previousBedTime?: string; // 🔥 NEW
    viewMode: ViewMode;
    categoryTypeMap?: Record<string, string>;
    categoryColors?: Record<string, string>;
    dayStartHour?: number;
}

function parseTimeOnDate(timeStr: string, baseDate: Date): Date {
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const result = startOfDay(baseDate);
        result.setHours(hours, minutes, 0, 0);
        return result;
    } catch (error) {
        console.error('Error parsing time:', timeStr, error);
        return baseDate;
    }
}

// 🔥 Helper to parse time and applying logical day shift
// If hour < dayStartHour, it belongs to the NEXT calendar day (i.e. late night of the current logical day)
function parseTimeWithLogicalOffset(timeStr: string, baseDate: Date, dayStartHour: number): Date {
    const date = parseTimeOnDate(timeStr, baseDate);
    if (date.getHours() < dayStartHour) {
        return addDays(date, 1);
    }
    return date;
}

export interface TimelineSlice {
    name: string;
    category: string;
    start: Date;
    end: Date;
    type: 'session' | 'sleep' | 'untracked';
    originalLog?: LogEntry; // Link back to original log for details
    fill?: string;
}

export function generateTimelineSlices({
    logs,
    currentDate,
    wakeTime,
    bedTime,
    previousBedTime,
    dayStartHour = 0,
}: Omit<GenerateChartDataParams, 'viewMode' | 'categoryColors' | 'categoryTypeMap'>): TimelineSlice[] {
    const chartStart = startOfDay(currentDate);
    chartStart.setHours(dayStartHour, 0, 0, 0);
    const chartEnd = addHours(chartStart, 24);

    const slices: TimelineSlice[] = [];

    // --- 1. SLEEP SLICES ---
    try {
        if (wakeTime) {
            const wakeDateTime = parseTimeWithLogicalOffset(wakeTime, currentDate, dayStartHour);
            let sleepStart = chartStart;
            let originalStart = undefined;

            // 🔥 Use Previous Bed Time if available
            if (previousBedTime) {
                // Determine absolute date of previous bed time (Likely Yesterday or Early Today)
                // Since previousBedTime usually means "Last Night", it's ~ Yesterday relative to Logical Date
                // We use parseTimeWithLogicalOffset based on (currentDate - 1 day)
                const prevDate = subDays(currentDate, 1);
                const prevBedDateTime = parseTimeWithLogicalOffset(previousBedTime, prevDate, dayStartHour);

                // If the previous bed time is reasonably before wake time
                if (isBefore(prevBedDateTime, wakeDateTime)) {
                    originalStart = prevBedDateTime;
                }
            }

            if (isAfter(wakeDateTime, chartStart) && isBefore(wakeDateTime, chartEnd)) {
                slices.push({
                    name: 'Sleep',
                    category: 'Sleep',
                    start: chartStart,
                    end: wakeDateTime,
                    type: 'sleep',
                    // Pass metadata for tooltip
                    originalLog: originalStart ? {
                        startTime: previousBedTime!,
                        endTime: wakeTime,
                        category: 'Sleep',
                        customName: 'Sleep'
                    } as any : undefined
                });
            } else if (isAfter(wakeDateTime, chartEnd)) {
                slices.push({
                    name: 'Sleep',
                    category: 'Sleep',
                    start: chartStart,
                    end: chartEnd,
                    type: 'sleep',
                    originalLog: originalStart ? {
                        startTime: previousBedTime!,
                        endTime: wakeTime,
                        category: 'Sleep'
                    } as any : undefined
                });
            }
        }

        if (bedTime) {
            const bedDateTime = parseTimeWithLogicalOffset(bedTime, currentDate, dayStartHour);
            if (isAfter(bedDateTime, chartStart) && isBefore(bedDateTime, chartEnd)) {
                slices.push({ name: 'Sleep', category: 'Sleep', start: bedDateTime, end: chartEnd, type: 'sleep' });
            }
        }
    } catch (error) {
        console.error('Error generating sleep slices:', error);
    }

    // --- 2. SESSION SLICES ---
    for (const log of logs) {
        try {
            if (!log.startTime || !log.endTime) continue;

            let logStart = parseTimeWithLogicalOffset(log.startTime, currentDate, dayStartHour);
            let logEnd = parseTimeWithLogicalOffset(log.endTime, currentDate, dayStartHour);

            if (isBefore(logEnd, logStart)) logEnd = addHours(logEnd, 24); // Handle wrapping
            if (isBefore(logStart, chartStart)) logStart = chartStart; // Clip start

            const start = logStart < chartStart ? chartStart : logStart;
            const end = logEnd > chartEnd ? chartEnd : logEnd;

            if (start < end) {
                // If overlap with sleep? For now, we just push.
                // Ideally, sessions override sleep or vice versa.
                // We'll push session, and in "Untracked" calculation we'll handle overlaps.
                slices.push({
                    name: log.customName || (log.taskId ? `Task ${log.taskId}` : 'Unnamed'),
                    category: log.category,
                    start: start,
                    end: end,
                    type: 'session',
                    originalLog: log
                });
            }
        } catch (error) {
            console.error('Error processing log:', log, error);
        }
    }

    // --- 3. SORT & FILL UNTRACKED ---
    slices.sort((a, b) => a.start.getTime() - b.start.getTime());

    const resultSlices: TimelineSlice[] = [];
    let currentTime = chartStart;

    // We process slices and fill gaps.
    // Handling overlaps: simple strategy - next slice can cut short previous one (unlikely with DB validation)
    // or we just skip if completely covered.

    for (const slice of slices) {
        // GAP?
        if (isBefore(currentTime, slice.start)) {
            // Check if gap > 1 min?
            const gap = differenceInMinutes(slice.start, currentTime);
            if (gap > 0) {
                resultSlices.push({
                    name: 'Untracked',
                    category: 'Untracked',
                    start: currentTime,
                    end: slice.start,
                    type: 'untracked'
                });
            }
        }

        // Add Slice (clip start if needed)
        const effectiveStart = isBefore(slice.start, currentTime) ? currentTime : slice.start;
        if (isAfter(slice.end, effectiveStart)) {
            resultSlices.push({ ...slice, start: effectiveStart });
            currentTime = slice.end;
        }
    }

    // Final Gap
    if (isBefore(currentTime, chartEnd)) {
        resultSlices.push({
            name: 'Untracked',
            category: 'Untracked',
            start: currentTime,
            end: chartEnd,
            type: 'untracked'
        });
    }

    return resultSlices;
}

export function generateChartData({
    logs,
    currentDate,
    wakeTime,
    bedTime,
    previousBedTime, // 🔥 NEW: Fixed destructuring
    viewMode,
    categoryColors = {},
    categoryTypeMap = {},
    dayStartHour = 0,
}: GenerateChartDataParams & { dayStartHour?: number }): ChartSlice[] {

    // 1. Get Normalized Continuous Slices
    const timelineSlices = generateTimelineSlices({ logs, currentDate, wakeTime, bedTime, previousBedTime, dayStartHour });

    // 2. Aggregate for Chart
    const aggregated = new Map<string, number>();
    const keyCategoryMap = new Map<string, string>(); // Track category for coloring

    for (const slice of timelineSlices) {
        let key: string;
        const duration = differenceInMinutes(slice.end, slice.start);
        if (duration <= 0) continue;

        if (slice.type === 'untracked') {
            key = 'Untracked';
        } else if (slice.type === 'sleep') {
            // In Category mode for Pie Chart, Sleep is often grouped or shown as Sleep.
            // Existing logic: viewMode determines key.
            // If viewMode is SESSION, Sleep is Sleep.
            if (viewMode === 'SESSION') key = 'Sleep';
            else if (viewMode === 'CATEGORY') key = 'LIFE'; // As per prev logic
            else key = 'Sleep'; // Subcategory
        } else {
            // Session
            switch (viewMode) {
                case 'SESSION':
                    key = slice.name;
                    break;
                case 'CATEGORY':
                    if (slice.category === 'Untracked') {
                        key = 'Untracked';
                    } else {
                        key = (categoryTypeMap[slice.category] || 'WORK').toUpperCase();
                    }
                    break;
                default: // SUBCATEGORY
                    key = slice.category;
            }
        }

        aggregated.set(key, (aggregated.get(key) || 0) + duration);
        if (slice.category) keyCategoryMap.set(key, slice.category);
    }

    // 3. Build Chart Data
    const chartData: ChartSlice[] = [];
    let sessionIndex = 0;

    for (const [name, value] of aggregated.entries()) {
        let color: string;
        const originalCategory = keyCategoryMap.get(name);

        if (name === 'Untracked' || originalCategory === 'Untracked') {
            color = COLORS.Untracked;
        } else if (viewMode === 'SESSION' && name !== 'Sleep') {
            color = getSessionColor(name, sessionIndex++);
        } else {
            color = categoryColors[name] || COLORS[name as keyof typeof COLORS] || '#94a3b8';
        }
        chartData.push({ name, value, fill: color });
    }

    return chartData;
}

// Helper to format minutes as hours string
export function formatMinutesToHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}
