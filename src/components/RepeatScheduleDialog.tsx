import { useState, useEffect } from 'react';
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
import DurationPicker from './DurationPicker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PriorityTag from './PriorityTag';
import { type Task, type Priority } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { createTemplate, updateTemplate, TaskTemplate } from '@/services/templateService';
import { toast } from 'sonner';

interface RepeatScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: Task | TaskTemplate;  // Support both for creation/editing
    onSave?: () => void;
}

const RepeatScheduleDialog = ({ open, onOpenChange, task, onSave }: RepeatScheduleDialogProps) => {
    const { user } = useAuth();
    const [priorities, setPriorities] = useState<Priority[]>([]);

    const [name, setName] = useState(task?.name || '');
    const [priority, setPriority] = useState<string | null>(task?.priority || null);
    const [targetTime, setTargetTime] = useState(task?.targetTime || 60);
    const [description, setDescription] = useState(task?.description || '');
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

                // Initialize template specific fields if editing a template
                if ('isActive' in task) {
                    const template = task as TaskTemplate;
                    setMinCompletionTarget(template.minCompletionTarget || 50);
                }
            } else {
                // Creating new template - reset form
                setName('');
                setPriority(null);
                setTargetTime(60);
                setDescription('');
                setMinCompletionTarget(50); // Reset to default
            }
        }
    }, [open, task]);

    const handleSave = async () => {
        if (!user) return;

        const templateData: Partial<TaskTemplate> = {
            user_id: user.id,
            name,
            priority: priority || 'normal',
            targetTime,
            description,
            minCompletionTarget,
            isActive: true,
        };

        // Check if we're editing an existing template
        const isEditingTemplate = task && 'isActive' in task && (task as TaskTemplate).id;

        try {
            if (isEditingTemplate) {
                const templateId = (task as TaskTemplate).id!;
                await updateTemplate(templateId, templateData);
                toast.success("Template updated");
            } else {
                await createTemplate({
                    ...templateData,
                    isDefault: false,
                    achieverStrike: 0,
                    fighterStrike: 0
                });
                toast.success("Template created");
            }

            onOpenChange(false);

            // Reset form
            setName('');
            setDescription('');

            if (onSave) onSave();

        } catch (error: any) {
            console.error("Save failed", error);
            toast.error("Failed to save template");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 flex flex-col bg-card border-border">
                <div className="px-6 pt-6 pb-2">
                    <DialogTitle>{task && 'isActive' in task ? 'Edit Template' : 'Create Template'}</DialogTitle>
                    <DialogDescription>
                        Create a template to quickly add tasks to your plan
                    </DialogDescription>
                </div>

                <div className="overflow-y-auto px-6 py-4 flex-1 no-scrollbar">
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
                    </div>
                </div>

                <div className="border-t px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!name}>
                        {task && 'isActive' in task ? 'Save Changes' : 'Create Template'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RepeatScheduleDialog;
