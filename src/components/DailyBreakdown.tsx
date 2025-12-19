import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateChartData, formatMinutesToHours, type ViewMode, type LogEntry } from '@/utils/chartLogic';
import { cn } from '@/lib/utils';
import { getDateString } from '@/lib/db';

interface DailyBreakdownProps {
    selectedDate: Date;
    wakeUpTime?: string;
    bedTime?: string;
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

const DailyBreakdown = ({ selectedDate, wakeUpTime, bedTime }: DailyBreakdownProps) => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        return (localStorage.getItem('daily_breakdown_view_mode') as ViewMode) || 'CATEGORY';
    });

    // Persist viewMode
    useEffect(() => {
        localStorage.setItem('daily_breakdown_view_mode', viewMode);
    }, [viewMode]);

    // Cloud Data State
    const [sessions, setSessions] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryTypes, setCategoryTypes] = useState<any[]>([]); // Added for main types colors
    const [loading, setLoading] = useState(true);

    const dateString = getDateString(selectedDate);

    // Fetch All Data from Supabase
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // 1. Fetch Sessions
                const { data: sessionsData } = await supabase
                    .from('sessions')
                    .select('*')
                    .eq('date', dateString)
                    .eq('user_id', user.id);

                // 2. Fetch Tasks (for naming)
                const { data: tasksData } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('date', dateString)
                    .eq('user_id', user.id);

                // 3. Fetch Categories (Execution)
                const { data: categoriesData } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('user_id', user.id);

                // 4. Fetch Category Types (Main Types for Colors)
                const { data: typesData } = await supabase
                    .from('category_types')
                    .select('*')
                    .eq('user_id', user.id);

                if (sessionsData) {
                    setSessions(sessionsData.map(s => ({
                        id: s.id,
                        taskId: s.task_id,
                        customName: s.custom_name,
                        category: s.category,
                        startTime: s.start_time,
                        endTime: s.end_time
                    })));
                } else {
                    setSessions([]);
                }

                if (tasksData) setTasks(tasksData);
                else setTasks([]);

                if (categoriesData) setCategories(categoriesData);
                else setCategories([]);

                if (typesData) setCategoryTypes(typesData);
                else setCategoryTypes([]);

            } catch (error) {
                console.error("Error fetching breakdown data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateString, user]);


    // Build color map from categories AND category_types
    const categoryColors = useMemo(() => {
        // Fallback to defaults first
        const colorMap: Record<string, string> = { ...DEFAULT_COLORS };

        // 1. Execution Categories Colors
        if (categories) {
            for (const cat of categories) {
                if (cat.color) {
                    if (cat.color.startsWith('#')) {
                        colorMap[cat.name] = cat.color;
                    } else {
                        // Map common tailwind classes
                        if (cat.color.includes('success')) colorMap[cat.name] = '#10b981';
                        else if (cat.color.includes('info') || cat.color.includes('blue')) colorMap[cat.name] = '#3b82f6';
                        else if (cat.color.includes('warning') || cat.color.includes('yellow')) colorMap[cat.name] = '#f59e0b';
                        else if (cat.color.includes('danger') || cat.color.includes('red')) colorMap[cat.name] = '#ef4444';
                        else if (cat.color.includes('purple')) colorMap[cat.name] = '#8b5cf6';
                        else if (cat.color.includes('muted') || cat.color.includes('gray')) colorMap[cat.name] = '#6b7280';
                        else if (cat.color.includes('green')) colorMap[cat.name] = '#22c55e';
                    }
                }
            }
        }

        // 2. Category Types Colors (Main Types like WORK, LIFE, SECRET)
        if (categoryTypes) {
            for (const type of categoryTypes) {
                if (type.color && type.name) {
                    // Logic to extract hex/tailwind color similar to above
                    // The chart logic typically uppercases these keys (e.g. SECRET)
                    const normalizedName = type.name.toUpperCase(); // Ensure match with chart logic

                    if (type.color.startsWith('#')) {
                        colorMap[normalizedName] = type.color;
                        // Also map original case just in case
                        colorMap[type.name] = type.color;
                    } else {
                        // Map common tailwind classes
                        let hex = '#94a3b8'; // default
                        if (type.color.includes('success')) hex = '#10b981';
                        else if (type.color.includes('info') || type.color.includes('blue')) hex = '#3b82f6';
                        else if (type.color.includes('warning') || type.color.includes('yellow')) hex = '#f59e0b';
                        else if (type.color.includes('danger') || type.color.includes('red')) hex = '#ef4444';
                        else if (type.color.includes('purple')) hex = '#8b5cf6';
                        else if (type.color.includes('muted') || type.color.includes('gray')) hex = '#6b7280';
                        else if (type.color.includes('green')) hex = '#22c55e';

                        colorMap[normalizedName] = hex;
                        colorMap[type.name] = hex;
                    }
                }
            }
        }

        return colorMap;
    }, [categories, categoryTypes]);

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

    // Build category type map (Name -> Type)
    const categoryTypeMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (categories) {
            for (const cat of categories) {
                if (cat.name && cat.type) {
                    map[cat.name] = cat.type;
                }
            }
        }
        return map;
    }, [categories]);

    // Generate chart data
    const chartData = useMemo(() => {
        try {
            return generateChartData({
                logs,
                currentDate: selectedDate,
                // Use props directly
                wakeTime: wakeUpTime,
                bedTime: bedTime,
                viewMode,
                categoryColors,
                categoryTypeMap, // 🔥 PASSING DYNAMIC MAP
            });
        } catch (error) {
            console.error('Error generating chart data:', error);
            return [];
        }
    }, [logs, selectedDate, wakeUpTime, bedTime, viewMode, categoryColors, categoryTypeMap]);

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
                <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
                        <p className="text-sm font-semibold">{data.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground pl-4">{formatMinutesToHours(data.value)}</p>
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

    if (loading && !sessions.length) {
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground animate-pulse">Loading breakdown...</p>
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-6 p-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Daily Breakdown</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Total tracked time: <span className="font-medium text-foreground">{formatMinutesToHours(totalTrackedMinutes)}</span>
                    </p>
                </div>

                {/* View Mode Toggle - Segmented Control */}
                <div className="bg-muted/50 p-1 rounded-lg flex items-center gap-1 w-full md:w-auto">
                    {(['SESSION', 'CATEGORY', 'SUBCATEGORY'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={cn(
                                "flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                                viewMode === mode
                                    ? "bg-background text-foreground shadow-sm scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {mode.charAt(0) + mode.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Card */}
            <Card className="p-8 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                {!hasData || totalTrackedMinutes === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium mb-1">No data available</p>
                        <p className="text-sm opacity-70">Add sessions in Execution to see breakdown</p>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-8 items-center">
                        <div className="h-[400px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={100}
                                        outerRadius={160}
                                        paddingAngle={3}
                                        cornerRadius={4}
                                        dataKey="value"
                                        label={renderCenterLabel}
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                                className="transition-opacity duration-200 hover:opacity-80"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Custom Legend */}
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Breakdown Details</h3>
                            {chartData.map((entry, index) => (
                                <motion.div
                                    key={entry.name}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                        style={{ backgroundColor: entry.fill }}
                                    />
                                    <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                                        <p className="text-sm font-medium truncate">{entry.name}</p>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold tabular-nums">
                                                {formatMinutesToHours(entry.value)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {Math.round((entry.value / (24 * 60)) * 100)}% of day
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </motion.div>
    );
};

export default DailyBreakdown;
