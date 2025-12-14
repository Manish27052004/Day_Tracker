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
    dayStartTime?: string;
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
    dayStartTime = '04:00',
    wakeTime,
    bedTime,
    viewMode,
    categoryColors = {},
}: GenerateChartDataParams): ChartSlice[] {
    // Step 1: Define chart boundaries
    const chartStart = parseTimeOnDate(dayStartTime, currentDate);
    const chartEnd = addHours(chartStart, 24);

    const slices: Array<{ name: string; category: string; start: Date; end: Date }> = [];

    // Step 2: Generate virtual sleep slices (NEW LOGIC: Calendar Day Only)
    // Sleep is calculated within the SAME calendar day (00:00 to 23:59)
    // NOT based on dayStartTime or spanning across days
    if (wakeTime && bedTime) {
        try {
            // Calendar day boundaries (NOT chart boundaries)
            const calendarDayStart = startOfDay(currentDate); // 00:00:00
            const calendarDayEnd = addHours(calendarDayStart, 24); // 23:59:59 (next day 00:00)

            // Parse wake and bed times on the CURRENT CALENDAR DAY
            const wakeDateTime = parseTimeOnDate(wakeTime, currentDate);
            const bedDateTime = parseTimeOnDate(bedTime, currentDate);

            // Morning sleep: 00:00 → wakeTime (if wake time is within the day)
            if (isAfter(wakeDateTime, calendarDayStart) && isBefore(wakeDateTime, calendarDayEnd)) {
                slices.push({
                    name: 'Sleep',
                    category: 'Sleep',
                    start: calendarDayStart,
                    end: wakeDateTime,
                });
            }

            // Night sleep: bedTime → 23:59:59 (if bed time is within the day)
            if (isAfter(bedDateTime, calendarDayStart) && isBefore(bedDateTime, calendarDayEnd)) {
                slices.push({
                    name: 'Sleep',
                    category: 'Sleep',
                    start: bedDateTime,
                    end: calendarDayEnd,
                });
            }
        } catch (error) {
            console.error('Error generating sleep slices:', error);
        }
    }

    // Step 3: Process real logs
    for (const log of logs) {
        try {
            if (!log.startTime || !log.endTime) continue;

            let logStart = parseTimeOnDate(log.startTime, currentDate);
            let logEnd = parseTimeOnDate(log.endTime, currentDate);

            // If end time is before start time, it spans midnight
            if (isBefore(logEnd, logStart)) {
                logEnd = addHours(logEnd, 24);
            }

            // Try to align log with chart boundaries
            // If log starts way before chart start, shift it by 24h
            const hoursDiff = differenceInMinutes(chartStart, logStart) / 60;
            if (hoursDiff > 12) {
                logStart = addHours(logStart, 24);
                logEnd = addHours(logEnd, 24);
            }

            // Check if log overlaps with chart interval
            const chartInterval = { start: chartStart, end: chartEnd };

            const startsInRange = isWithinInterval(logStart, chartInterval);
            const endsInRange = isWithinInterval(logEnd, chartInterval);
            const spansChart = isBefore(logStart, chartStart) && isAfter(logEnd, chartEnd);

            if (startsInRange || endsInRange || spansChart) {
                // Clip to chart boundaries
                const clippedStart = isBefore(logStart, chartStart) ? chartStart : logStart;
                const clippedEnd = isAfter(logEnd, chartEnd) ? chartEnd : logEnd;

                if (isBefore(clippedStart, clippedEnd)) {
                    slices.push({
                        name: log.customName || `Task ${log.taskId}` || 'Unnamed',
                        category: log.category,
                        start: clippedStart,
                        end: clippedEnd,
                    });
                }
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
