import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, CheckCircle2, Circle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
    Period,
    PeriodTask,
    fetchAllPeriods,
    createPeriod,
    fetchPeriodDetails,
    createPeriodTask,
    deletePeriodTask
} from '@/services/periodService';

export const PeriodManager = ({ trigger, onUpdate }: { trigger?: React.ReactNode; onUpdate?: () => void }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    const [periods, setPeriods] = useState<Period[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined }>({
        from: undefined,
        to: undefined,
    });

    // Task Form State
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const loadPeriods = async () => {
        try {
            const data = await fetchAllPeriods();
            setPeriods(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (open) loadPeriods();
    }, [open]);

    const handleCreatePeriod = async () => {
        if (!newTitle || !dateRange?.from) return;

        try {
            setIsSubmitting(true);
            await createPeriod({
                title: newTitle,
                start_date: format(dateRange.from, 'yyyy-MM-dd'),
                end_date: format(dateRange.to || dateRange.from, 'yyyy-MM-dd'),
            });
            await loadPeriods();

            toast({
                title: "Success",
                description: "Period created successfully",
            });

            setView('list');
            setNewTitle('');
            setDateRange({ from: undefined, to: undefined });
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error creating period",
                description: error.message || "Unknown error occurred",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectPeriod = async (period: Period) => {
        try {
            const details = await fetchPeriodDetails(period.id);
            setSelectedPeriod(details);
            setView('detail');
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddTask = async () => {
        if (!selectedPeriod || !newTaskTitle) return;
        try {
            await createPeriodTask(selectedPeriod.id, newTaskTitle);
            // Refresh details
            const details = await fetchPeriodDetails(selectedPeriod.id);
            setSelectedPeriod(details);
            setNewTaskTitle('');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!selectedPeriod) return;
        try {
            await deletePeriodTask(taskId);
            const details = await fetchPeriodDetails(selectedPeriod.id);
            setSelectedPeriod(details);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Manage Periods</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {view === 'list' && 'Period Targets'}
                        {view === 'create' && 'New Period'}
                        {view === 'detail' && (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setView('list')}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                {selectedPeriod?.title}
                            </div>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {view === 'list' && (
                        <div className="space-y-4">
                            <Button className="w-full" onClick={() => setView('create')}>
                                <Plus className="h-4 w-4 mr-2" /> Create New Period
                            </Button>
                            <div className="space-y-2">
                                {periods.map(period => (
                                    <div
                                        key={period.id}
                                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => handleSelectPeriod(period)}
                                    >
                                        <div className="font-semibold">{period.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'create' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Period Title</Label>
                                <Input
                                    placeholder="e.g. Weekly Sprint #12"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Date Range</Label>
                                <div className="grid gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="date"
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !dateRange.from && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateRange.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                                            {format(dateRange.to, "LLL dd, y")}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, "LLL dd, y")
                                                    )
                                                ) : (
                                                    <span>Pick a date range</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRange?.from}
                                                selected={dateRange}
                                                onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                                                numberOfMonths={2}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setView('list')}>Cancel</Button>
                                <Button onClick={handleCreatePeriod} disabled={!newTitle || !dateRange?.from || isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Period'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {view === 'detail' && selectedPeriod && (
                        <div className="space-y-6">
                            <div className="bg-muted/20 p-3 rounded-md text-sm text-muted-foreground">
                                {format(new Date(selectedPeriod.start_date), 'MMM d')} - {format(new Date(selectedPeriod.end_date), 'MMM d, yyyy')}
                            </div>

                            <div className="space-y-3">
                                <Label>Target Tasks</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add a target task..."
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                    />
                                    <Button size="icon" onClick={handleAddTask}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-2 mt-4">
                                    {selectedPeriod.tasks?.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                                            <div className="flex items-center gap-3">
                                                {task.is_completed ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                                )}
                                                <div>
                                                    <div className="font-medium text-sm">{task.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Worked on {task.executionValues || 0} times
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!selectedPeriod.tasks || selectedPeriod.tasks.length === 0) && (
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                            No targets set yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
