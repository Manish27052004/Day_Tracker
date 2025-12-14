import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Session } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import TimePicker from '@/components/TimePicker';
import { generateChartData, formatMinutesToHours, type ViewMode, type LogEntry } from '@/utils/chartLogic';
import { cn } from '@/lib/utils';

interface DailyBreakdownProps {
    selectedDate: Date;
}

// Default color mappings
const DEFAULT_COLORS: Record<string, string> = {
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

const DailyBreakdown = ({ selectedDate }: DailyBreakdownProps) => {
    const [dayStartTime, setDayStartTime] = useState('04:00');
    const [viewMode, setViewMode] = useState<ViewMode>('CATEGORY');

    const dateString = selectedDate.toISOString().split('T')[0];

    // Fetch sessions for the selected date
    const sessions = useLiveQuery(
        () => db.sessions.where('date').equals(dateString).filter(s => !s.isDeleted).toArray(),
        [dateString]
    );

    // Fetch sleep entry for the selected date
    const sleepEntry = useLiveQuery(
        () => db.sleepEntries.where('date').equals(dateString).first(),
        [dateString]
    );

    // Fetch categories for color mapping
    const categories = useLiveQuery(() => db.categories.toArray());

    // Fetch tasks for the selected date to get task names
    const tasks = useLiveQuery(
        () => db.tasks.where('date').equals(dateString).toArray(),
        [dateString]
    );

    // Build color map from categories
    const categoryColors = useMemo(() => {
        if (!categories) return DEFAULT_COLORS;

        const colorMap: Record<string, string> = { ...DEFAULT_COLORS };

        for (const cat of categories) {
            // Extract color based on CSS class patterns
            if (cat.color.includes('success')) colorMap[cat.name] = '#10b981';
            else if (cat.color.includes('info') || cat.color.includes('blue')) colorMap[cat.name] = '#3b82f6';
            else if (cat.color.includes('warning') || cat.color.includes('yellow')) colorMap[cat.name] = '#f59e0b';
            else if (cat.color.includes('danger') || cat.color.includes('red')) colorMap[cat.name] = '#ef4444';
            else if (cat.color.includes('purple')) colorMap[cat.name] = '#8b5cf6';
            else if (cat.color.includes('muted') || cat.color.includes('gray')) colorMap[cat.name] = '#6b7280';
            else if (cat.color.includes('green')) colorMap[cat.name] = '#22c55e';
        }

        return colorMap;
    }, [categories]);

    // Create a map of taskId to task name
    const taskNameMap = useMemo(() => {
        if (!tasks) return new Map<number, string>();

        const map = new Map<number, string>();
        for (const task of tasks) {
            if (task.id) {
                map.set(task.id, task.name);
            }
        }
        return map;
    }, [tasks]);

    // Transform sessions to LogEntry format
    const logs: LogEntry[] = useMemo(() => {
        if (!sessions || sessions.length === 0) return [];

        return sessions.map((session) => {
            // Get session name with priority:
            // 1. Custom name (if exists and not empty)
            // 2. Task name (if linked to a task)
            // 3. "Unnamed Session" as fallback
            let sessionName = 'Unnamed Session';

            if (session.customName && session.customName.trim()) {
                sessionName = session.customName;
            } else if (session.taskId && taskNameMap.has(session.taskId)) {
                sessionName = taskNameMap.get(session.taskId)!;
            } else if (session.taskId) {
                sessionName = `Task ${session.taskId}`;
            }

            return {
                startTime: session.startTime,
                endTime: session.endTime,
                category: session.category || 'Uncategorized',
                customName: sessionName,
                taskId: session.taskId,
            };
        });
    }, [sessions, taskNameMap]);

    // Generate chart data
    const chartData = useMemo(() => {
        try {
            return generateChartData({
                logs,
                currentDate: selectedDate,
                dayStartTime,
                wakeTime: sleepEntry?.wakeUpTime,
                bedTime: sleepEntry?.bedTime,
                viewMode,
                categoryColors,
            });
        } catch (error) {
            console.error('Error generating chart data:', error);
            return [];
        }
    }, [logs, selectedDate, dayStartTime, sleepEntry, viewMode, categoryColors]);

    // Calculate total tracked time (excluding "Untracked")
    const totalTrackedMinutes = useMemo(() => {
        return chartData
            .filter((slice) => slice.name !== 'Untracked')
            .reduce((sum, slice) => sum + slice.value, 0);
    }, [chartData]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2">
                    <p className="text-sm font-semibold">{data.name}</p>
                    <p className="text-xs text-muted-foreground">{formatMinutesToHours(data.value)}</p>
                </div>
            );
        }
        return null;
    };

    // Custom center label
    const renderCenterLabel = ({ cx, cy }: any) => {
        const hours = (totalTrackedMinutes / 60).toFixed(1);

        return (
            <g>
                <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground text-2xl font-bold"
                >
                    {hours}h
                </text>
                <text
                    x={cx}
                    y={cy + 15}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-xs"
                >
                    Tracked
                </text>
            </g>
        );
    };

    const hasData = chartData.length > 0;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-semibold">Daily Breakdown</h2>
                <p className="text-sm text-muted-foreground">
                    Total tracked: {formatMinutesToHours(totalTrackedMinutes)}
                </p>
            </div>

            {/* Controls */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-6 items-end">
                    {/* Day Start Time */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Day Start Time</Label>
                        <TimePicker
                            value={dayStartTime}
                            onChange={setDayStartTime}
                            placeholder="Select start time"
                            className="w-[120px]"
                        />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="space-y-2 flex-1">
                        <Label className="text-sm font-medium">View Mode</Label>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant={viewMode === 'SESSION' ? 'default' : 'outline'}
                                onClick={() => setViewMode('SESSION')}
                            >
                                Session
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'CATEGORY' ? 'default' : 'outline'}
                                onClick={() => setViewMode('CATEGORY')}
                            >
                                Category
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'SUBCATEGORY' ? 'default' : 'outline'}
                                onClick={() => setViewMode('SUBCATEGORY')}
                            >
                                Subcategory
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Chart */}
            <Card className="p-6">
                {!hasData ? (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        <div className="text-center">
                            <p className="text-lg font-medium mb-2">No data to display</p>
                            <p className="text-sm">Add sessions in the Execution tab to see your breakdown</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={140}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={renderCenterLabel}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Custom Legend */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                            {chartData.map((entry) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: entry.fill }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{entry.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatMinutesToHours(entry.value)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};

export default DailyBreakdown;
