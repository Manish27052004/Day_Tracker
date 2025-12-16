import { useState, useEffect } from 'react';
// import { useLiveQuery } from 'dexie-react-hooks'; // REMOVED
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import TimePicker from './TimePicker';
import DurationPicker from './DurationPicker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PriorityTag from './PriorityTag';
import { db, type Task, type RepeatingTask, type Priority } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface RepeatScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: Task | RepeatingTask;  // Task when converting to template, RepeatingTask when editing template
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sun', fullLabel: 'Sunday' },
    { value: 1, label: 'Mon', fullLabel: 'Monday' },
    { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
    { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
    { value: 4, label: 'Thu', fullLabel: 'Thursday' },
    { value: 5, label: 'Fri', fullLabel: 'Friday' },
    { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];

const RepeatScheduleDialog = ({ open, onOpenChange, task }: RepeatScheduleDialogProps) => {
    // const priorities = useLiveQuery(() => db.priorities.orderBy('order').toArray()); // REMOVED
    const { user } = useAuth();
    const [priorities, setPriorities] = useState<Priority[]>([]);

    const [name, setName] = useState(task?.name || '');
    const [priority, setPriority] = useState<Task['priority']>(task?.priority || null); // Changed default to null or 'normal'? 'normal' doesn't exist in new schema usually.
    // Let's stick to null or what was passed. If 'normal' was passed, it might be legacy. 
    // New system uses dynamic strings.
    const [targetTime, setTargetTime] = useState(task?.targetTime || 60);
    const [description, setDescription] = useState(task?.description || '');
    const [repeatPattern, setRepeatPattern] = useState<'daily' | 'weekly' | 'custom'>('daily');
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
    const [addAtTime, setAddAtTime] = useState<string>('');
    const [useTimeSchedule, setUseTimeSchedule] = useState(false);
    const [minCompletionTarget, setMinCompletionTarget] = useState(50); // Default 50%

    // Fetch Priorities from Supabase
    useEffect(() => {
        const fetchPriorities = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('priorities')
                .select('*')
                .eq('user_id', user.id)
                .order('order', { ascending: true });

            if (data) setPriorities(data);
        };
        if (open) fetchPriorities();
    }, [open, user]);


    // Initialize form state when dialog opens or task changes
    useEffect(() => {
        if (open) {
            if (task) {
                // Editing existing task
                setName(task.name || '');
                setPriority(task.priority || null);
                setTargetTime(task.targetTime || 60);
                setDescription(task.description || '');
            } else {
                // Creating new template - reset form
                setName('');
                setPriority(null);
                setTargetTime(60);
                setDescription('');
                setRepeatPattern('daily');
                setSelectedDays([1, 2, 3, 4, 5]);
                setAddAtTime('');
                setUseTimeSchedule(false);
                setMinCompletionTarget(50); // Reset to default
            }

            // Initialize strike fields if editing template
            if (task && 'isActive' in task) {
                const template = task as RepeatingTask;
                setMinCompletionTarget(template.minCompletionTarget || 50);
            }
        }
    }, [open, task]);

    const handleDayToggle = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day].sort((a, b) => a - b)
        );
    };

    const handleSave = async () => {
        const templateData = {
            name,
            priority,
            targetTime,
            description,
            repeatPattern,
            repeatDays: (repeatPattern === 'weekly' || repeatPattern === 'custom') ? selectedDays : undefined,
            addAtTime: useTimeSchedule ? addAtTime : undefined,
            strikeCount: 0, // Legacy field
            minCompletionTarget, // Strike system
            achieverStrike: 0,
            fighterStrike: 0,
            lastCompletedDate: undefined,
            isActive: true,
            updatedAt: new Date(),
        };

        // Check if we're editing an existing template
        const isEditingTemplate = task && 'isActive' in task && task.id;

        if (isEditingTemplate) {
            // Update existing template (still Dexie for now?)
            // The user only asked to migrate Settings/Categories/Priorities.
            // Templates are not mentioned. So I keep Dexie for templates.
            await db.repeatingTasks.update(task.id!, templateData);
        } else {
            // Create new template
            await db.repeatingTasks.add({
                ...templateData,
                isDefault: false, // New templates are not default
                createdAt: new Date(),
            });
        }

        onOpenChange(false);

        // Reset form
        setName('');
        setDescription('');
        setRepeatPattern('daily');
        setSelectedDays([1, 2, 3, 4, 5]);
        setAddAtTime('');
        setUseTimeSchedule(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
                <div className="px-6 pt-6 pb-2">
                    <DialogTitle>{task && 'isActive' in task ? 'Edit Template' : 'Create Repeat Template'}</DialogTitle>
                    <DialogDescription>
                        Configure a template that automatically creates tasks on a schedule
                    </DialogDescription>
                </div>

                <div className="overflow-y-auto px-6 py-4 flex-1">
                    <div className="space-y-4">
                        {/* Task Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Task Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Morning Exercise"
                            />
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={priority || ''} onValueChange={(v) => setPriority(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    {priorities?.map(p => (
                                        <SelectItem key={p.id} value={p.name}>
                                            <PriorityTag priority={p.name} color={p.color} />
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Target Time */}
                        <div className="space-y-2">
                            <Label>Target Duration</Label>
                            <DurationPicker value={targetTime} onChange={setTargetTime} />
                        </div>

                        {/* Minimum Completion Target (Strike System) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="minTarget" className="flex items-center gap-2">
                                    <span>🎯 Minimum Target</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        (for strike tracking)
                                    </span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-primary">
                                        {minCompletionTarget}%
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <input
                                    id="minTarget"
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={minCompletionTarget}
                                    onChange={(e) => setMinCompletionTarget(Number(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tasks completing above this % will count toward your Achiever strike 🔥
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What needs to be done?"
                                rows={2}
                            />
                        </div>

                        {/* Repeat Pattern */}
                        <div className="space-y-2">
                            <Label>Repeat Pattern</Label>
                            <Select value={repeatPattern} onValueChange={(v: any) => setRepeatPattern(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Every Day</SelectItem>
                                    <SelectItem value="weekly">Specific Days of Week</SelectItem>
                                    <SelectItem value="custom">Custom Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Days of Week Selection */}
                        {(repeatPattern === 'weekly' || repeatPattern === 'custom') && (
                            <div className="space-y-2">
                                <Label>Select Days</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => handleDayToggle(day.value)}
                                            className={cn(
                                                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                selectedDays.includes(day.value)
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                            )}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {selectedDays.length === 0
                                        ? 'No days selected'
                                        : `Repeats on: ${selectedDays.map(d => DAYS_OF_WEEK[d].fullLabel).join(', ')}`}
                                </p>
                            </div>
                        )}

                        {/* Time Schedule (Optional) */}
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="use-time"
                                    checked={useTimeSchedule}
                                    onCheckedChange={(checked) => setUseTimeSchedule(checked as boolean)}
                                />
                                <Label htmlFor="use-time" className="cursor-pointer">
                                    Add at specific time (optional)
                                </Label>
                            </div>
                            {useTimeSchedule && (
                                <TimePicker
                                    value={addAtTime}
                                    onChange={setAddAtTime}
                                    placeholder="Select time"
                                />
                            )}
                            <p className="text-xs text-muted-foreground">
                                If enabled, task will be added at the specified time when you open the app
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border-t px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!name || ((repeatPattern === 'weekly' || repeatPattern === 'custom') && selectedDays.length === 0)}>
                        {task && 'isActive' in task ? 'Save Changes' : 'Create Template'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RepeatScheduleDialog;
