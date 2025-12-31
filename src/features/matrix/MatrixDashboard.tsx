
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchMatrixData, upsertTaskStatus } from "@/services/matrixService";
import { format, eachDayOfInterval } from "date-fns";
import { toast } from "sonner"; // Using sonner as per app convention seen in imports

import MatrixGrid from './MatrixGrid';
import ProfileSelector from './ProfileSelector';
import DateFilter from './DateFilter';
import AnalyticsChart from './AnalyticsChart';
import AddHabitDialog from './AddHabitDialog';

const MatrixDashboard = () => {
    // Shared State
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
        const saved = localStorage.getItem('matrixDateRange');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return {
                    from: new Date(parsed.from),
                    to: new Date(parsed.to)
                };
            } catch (e) {
                console.error("Failed to parse saved date range", e);
            }
        }
        return {
            from: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
            to: new Date()
        };
    });

    // Persist date range
    React.useEffect(() => {
        localStorage.setItem('matrixDateRange', JSON.stringify({
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
        }));
    }, [dateRange]);

    // Data Fetching
    const { data, isLoading } = useQuery({
        queryKey: ['matrixData', selectedProfileId, dateRange.from, dateRange.to],
        queryFn: () => {
            if (!selectedProfileId) return Promise.resolve(undefined);
            return fetchMatrixData(selectedProfileId, dateRange.from, dateRange.to);
        },
        enabled: !!selectedProfileId
    });

    const queryClient = useQueryClient();

    // Interaction
    // Optimistic Mutation
    const mutation = useMutation({
        mutationFn: ({ taskId, date, template, isCompleted }: { taskId: number | undefined, date: string, template: any, isCompleted: boolean }) => {
            return upsertTaskStatus(taskId, date, template, isCompleted);
        },
        onMutate: async ({ date, template, isCompleted }) => {
            await queryClient.cancelQueries({ queryKey: ['matrixData'] });

            const previousData = queryClient.getQueryData(['matrixData', selectedProfileId, dateRange.from, dateRange.to]);

            queryClient.setQueryData(['matrixData', selectedProfileId, dateRange.from, dateRange.to], (old: any) => {
                if (!old) return old;

                const newStatus = isCompleted ? 'on-track' : 'lagging';
                const existingTaskIndex = old.tasks.findIndex((t: any) => t.name === template.name && t.date === date);

                const newTasks = [...old.tasks];

                if (existingTaskIndex >= 0) {
                    // Update existing
                    newTasks[existingTaskIndex] = {
                        ...newTasks[existingTaskIndex],
                        status: newStatus
                    };
                } else {
                    // Add new (simulated)
                    newTasks.push({
                        id: Math.random(), // Temp ID
                        date: date,
                        name: template.name,
                        status: newStatus,
                        progress: isCompleted ? 100 : 0
                    });
                }

                return {
                    ...old,
                    tasks: newTasks
                };
            });

            return { previousData };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['matrixData', selectedProfileId, dateRange.from, dateRange.to], context?.previousData);
            toast.error("Failed to update status");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['matrixData'] });
        },
    });

    const handleToggle = (taskId: number | undefined, date: string, template: any, isCompleted: boolean) => {
        mutation.mutate({ taskId, date, template, isCompleted });
    };

    // Transform Data for Chart
    const chartData = useMemo(() => {
        if (!data || !data.items || !dateRange) return [];

        const dayMap = new Map<string, { total: number, completed: number }>();
        const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

        // Initialize Map
        days.forEach(d => {
            const dateStr = format(d, "yyyy-MM-dd");
            dayMap.set(dateStr, { total: 0, completed: 0 });
        });

        // Total possible tasks per day = number of profile items
        const totalTasksPerDay = data.items.length;

        // Iterate tasks to count completions
        data.tasks.forEach(t => {
            const entry = dayMap.get(t.date);
            if (entry && (t.status === 'on-track' || t.status === 'overachiever')) {
                entry.completed += 1;
            }
        });

        // Compute percentage
        return Array.from(dayMap.entries()).map(([date, counts]) => ({
            date,
            percentage: totalTasksPerDay > 0 ? Math.round((counts.completed / totalTasksPerDay) * 100) : 0
        }));
    }, [data, dateRange]);

    return (
        <div className="container mx-auto p-4 space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Habit Matrix</h1>
                    <p className="text-muted-foreground">Track your consistency across profiles.</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedProfileId && (
                        <AddHabitDialog
                            profileId={selectedProfileId}
                            existingTemplateIds={data?.items?.map((item: any) => item.template_id) || []}
                            onHabitAdded={() => queryClient.invalidateQueries({ queryKey: ['matrixData'] })}
                        />
                    )}
                    <ProfileSelector
                        selectedProfileId={selectedProfileId}
                        onSelect={setSelectedProfileId}
                    />
                    <DateFilter
                        range={dateRange}
                        onChange={setDateRange}
                    />
                </div>
            </div>

            <Separator />

            {/* Analytics Section */}
            <div className="grid gap-4 md:grid-cols-1">
                <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Completion Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AnalyticsChart
                            profileId={selectedProfileId}
                            range={dateRange}
                            totalTasks={data?.items.length || 0}
                            data={chartData}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Matrix Grid Section */}
            <Card className="overflow-hidden border-none shadow-md">
                <CardContent className="p-0">
                    <MatrixGrid
                        profileId={selectedProfileId}
                        range={dateRange}
                        data={data}
                        onToggle={handleToggle}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default MatrixDashboard;
