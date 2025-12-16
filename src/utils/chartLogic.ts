import { parse, addHours, addDays, isWithinInterval, differenceInMinutes, isBefore, isAfter, startOfDay } from 'date-fns';

export type ViewMode = 'SESSION' | 'CATEGORY' | 'SUBCATEGORY';

export interface LogEntry {
    startTime: string; // HH:mm format
    endTime: string;
    category: string;
    customName?: string; // Session name
    taskId?: number | null;
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
    viewMode: ViewMode;
    categoryColors?: Record<string, string>;
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

export function generateChartData({
    logs,
    currentDate,
    wakeTime,
    bedTime,
    viewMode,
    categoryColors = {},
}: Omit<GenerateChartDataParams, 'dayStartTime'>): ChartSlice[] {
    // Step 1: Define chart boundaries (Strictly 00:00 to 24:00 of selected date)
    const chartStart = startOfDay(currentDate);
    const chartEnd = addHours(chartStart, 24);

    const slices: Array<{ name: string; category: string; start: Date; end: Date }> = [];

    // Step 2: Generate virtual sleep slices (Calendar Day Only)
    try {
        // Morning sleep: 00:00 → wakeTime
        if (wakeTime) {
            const wakeDateTime = parseTimeOnDate(wakeTime, currentDate);
            // Only add if wake time is after midnight
            if (isAfter(wakeDateTime, chartStart) && isBefore(wakeDateTime, chartEnd)) {
                slices.push({
                    name: 'Sleep',
                    category: 'Sleep',
                    start: chartStart,
                    end: wakeDateTime,
                });
            }
        }

        // Night sleep: bedTime → 24:00
        if (bedTime) {
            const bedDateTime = parseTimeOnDate(bedTime, currentDate);
            // Only add if bed time is before midnight end
            if (isAfter(bedDateTime, chartStart) && isBefore(bedDateTime, chartEnd)) {
                slices.push({
                    name: 'Sleep',
                    category: 'Sleep',
                    start: bedDateTime,
                    end: chartEnd,
                });
            }
        }
    } catch (error) {
        console.error('Error generating sleep slices:', error);
    }

    // Step 3: Process real logs
    for (const log of logs) {
        try {
            if (!log.startTime || !log.endTime) continue;

            let logStart = parseTimeOnDate(log.startTime, currentDate);
            let logEnd = parseTimeOnDate(log.endTime, currentDate);

            // SPECIAL CASE: Overnight tasks (e.g., 23:00 - 01:00)
            // If end is before start, it implies it crosses midnight
            if (isBefore(logEnd, logStart)) {
                logEnd = addHours(logEnd, 24);
            }

            // Clip logs to strictly fit within 00:00 - 24:00
            // If a log started yesterday (e.g. 23:00 yesterday - 01:00 today), we only care about 00:00-01:00
            // But strict `parseTimeOnDate` makes everything today.
            // Let's rely on standard logic: if it's within the interval, show it.

            // Check overlap
            const chartInterval = { start: chartStart, end: chartEnd };

            // We need to handle if logic placed the time on "Current Date" but it actually belongs to yesterday/tomorrow context?
            // For now, assuming standard "Start Time/End Time" inputs refer to the current logical day or close to it.
            // If user logged 23:00-01:00 on "Dec 15", they likely mean Dec 15 23:00 to Dec 16 01:00.
            // Chart is Dec 15 00:00 - Dec 16 00:00.
            // So we partially show 23:00-24:00?
            // Actually, usually users log "What I did today".
            // If they log 23:00-01:00 on Dec 15 context, we clip it to 23:00-24:00.

            if (isBefore(logStart, chartStart)) {
                // started before today? (unlikely with parseTimeOnDate unless modified)
                logStart = chartStart;
            }

            // Re-check overlap with strict clipping
            const start = logStart < chartStart ? chartStart : logStart;
            const end = logEnd > chartEnd ? chartEnd : logEnd;

            if (start < end) {
                slices.push({
                    name: log.customName || `Task ${log.taskId}` || 'Unnamed',
                    category: log.category,
                    start: start,
                    end: end,
                });
            }

        } catch (error) {
            console.error('Error processing log:', log, error);
        }
    }

    // Step 4: Calculate total tracked time
    let totalTrackedMinutes = 0;
    for (const slice of slices) {
        const duration = differenceInMinutes(slice.end, slice.start);
        if (duration > 0) {
            totalTrackedMinutes += duration;
        }
    }

    const totalDayMinutes = 24 * 60;
    const untrackedMinutes = Math.max(0, totalDayMinutes - totalTrackedMinutes);

    // Step 5: Aggregate by view mode
    const aggregated = new Map<string, number>();

    for (const slice of slices) {
        let key: string;

        switch (viewMode) {
            case 'SESSION':
                key = slice.name;
                break;
            case 'CATEGORY':
                key = CATEGORY_TYPE_MAP[slice.category] || 'WORK';
                break;
            case 'SUBCATEGORY':
                key = slice.category;
                break;
            default:
                key = slice.category;
        }

        const duration = differenceInMinutes(slice.end, slice.start);
        if (duration > 0) {
            aggregated.set(key, (aggregated.get(key) || 0) + duration);
        }
    }

    // Step 6: Build final chart data
    const chartData: ChartSlice[] = [];
    let sessionIndex = 0;

    for (const [name, value] of aggregated.entries()) {
        if (value > 0) {
            let color: string;

            // For SESSION view mode, use distinct session colors
            if (viewMode === 'SESSION' && name !== 'Sleep') {
                color = getSessionColor(name, sessionIndex);
                sessionIndex++;
            } else {
                // For other modes or Sleep, use predefined colors
                color = categoryColors[name] || COLORS[name as keyof typeof COLORS] || '#94a3b8';
            }

            chartData.push({ name, value, fill: color });
        }
    }

    // Add untracked time
    if (untrackedMinutes > 0) {
        chartData.push({
            name: 'Untracked',
            value: untrackedMinutes,
            fill: COLORS.Untracked,
        });
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
