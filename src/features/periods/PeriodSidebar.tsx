import { useState, useEffect } from 'react';
import { Period, PeriodTask, fetchActivePeriods } from '@/services/periodService';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Plus, Target, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { PeriodManager } from './PeriodManager';
import { cn } from '@/lib/utils'; // Assuming utils exists

export const PeriodSidebar = ({
    selectedDate,
    onTaskAdded
}: {
    selectedDate: Date,
    onTaskAdded: () => void
}) => {
    const [periods, setPeriods] = useState<Period[]>([]);
    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState(true);

    const loadActivePeriods = async () => {
        try {
            setLoading(true);
            const data = await fetchActivePeriods(selectedDate);
            setPeriods(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActivePeriods();
    }, [selectedDate]);

    const handleAddTargetToDay = async (task: PeriodTask) => {
        // Add to Execution Tasks for the day
        const { error } = await supabase
            .from('tasks')
            .insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                date: format(selectedDate, 'yyyy-MM-dd'),
                name: task.title,
                status: 'lagging', // Default status
                target_time: 60, // Default target 1h
                period_task_id: task.id,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error("Failed to add target to day", error);
        } else {
            onTaskAdded();
        }
    };

    if (loading) return null;

    // Optional: If no period, show a "Start a Period" call to action?
    // User Requirement: "If yes, display a 'Period Goals' sidebar" -> implies hide if no period.
    // However, we need a way to create one.
    // We'll show the Manager button always if list is empty? Or just a small icon.

    if (periods.length === 0) {
        return (
            <div className="mb-4">
                <PeriodManager
                    trigger={
                        <Button variant="outline" size="sm" className="w-full border-dashed">
                            <Plus className="h-3 w-3 mr-2" /> Set Period Goal
                        </Button>
                    }
                    onUpdate={loadActivePeriods}
                />
            </div>
        );
    }

    return (
        <div className="mb-4 border rounded-md bg-card shadow-sm overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-6 w-full justify-start hover:bg-transparent">
                            {isOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                            <span className="font-semibold text-sm flex items-center gap-2">
                                <Target className="h-3.5 w-3.5" />
                                Period Goals
                            </span>
                        </Button>
                    </CollapsibleTrigger>
                    <PeriodManager
                        trigger={
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        }
                        onUpdate={loadActivePeriods}
                    />
                </div>

                <CollapsibleContent>
                    <div className="p-2 space-y-4">
                        {periods.map(period => (
                            <div key={period.id} className="space-y-2">
                                <div className="text-xs text-muted-foreground font-medium px-1 flex justify-between">
                                    <span>{period.title}</span>
                                    <span className="opacity-70">{format(new Date(period.end_date), 'MMM d')}</span>
                                </div>
                                <div className="grid gap-1">
                                    {period.tasks?.map(task => (
                                        <button
                                            key={task.id}
                                            onClick={() => handleAddTargetToDay(task)}
                                            className="group flex items-center justify-between w-full text-left bg-background hover:bg-accent border rounded-md p-2 transition-all text-sm"
                                        >
                                            <span className="truncate flex-1">{task.title}</span>
                                            <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                        </button>
                                    ))}
                                    {(!period.tasks || period.tasks.length === 0) && (
                                        <div className="text-xs text-muted-foreground italic px-2 py-1">No targets added.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};
