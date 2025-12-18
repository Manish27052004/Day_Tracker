import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
    createGoal,
    deleteGoal,
    fetchGoals,
    updateGoal,
    type AnalyticsGoal,
    type AnalyticsCategory,
    type AnalyticsCategoryType
} from '@/services/analyticsService';
import { Target, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a cn utility

interface GoalSettingsDialogProps {
    analyticsCategories: AnalyticsCategory[];
    analyticsTypes: AnalyticsCategoryType[];
    onGoalsUpdated: (goals: AnalyticsGoal[]) => void;
}

const COLORS = [
    '#ef4444', // Red 500
    '#f97316', // Orange 500
    '#eab308', // Yellow 500
    '#22c55e', // Green 500
    '#06b6d4', // Cyan 500
    '#3b82f6', // Blue 500
    '#6366f1', // Indigo 500
    '#a855f7', // Purple 500
    '#ec4899', // Pink 500
    '#64748b', // Slate 500
];

const GoalSettingsDialog = ({ analyticsCategories, analyticsTypes, onGoalsUpdated }: GoalSettingsDialogProps) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [goals, setGoals] = useState<AnalyticsGoal[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State for creating/editing
    const [editingId, setEditingId] = useState<number | null>(null);
    const [label, setLabel] = useState('');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [categoryKey, setCategoryKey] = useState('');
    const [color, setColor] = useState(COLORS[0]);

    // Combined options for dropdown
    const categoryOptions: { label: string; value: string; disabled?: boolean }[] = [
        { label: '--- Categories ---', value: 'disabled-cat', disabled: true },
        ...analyticsTypes.map(t => ({ label: t.name, value: t.name })),
        { label: '--- Subcategories ---', value: 'disabled-sub', disabled: true },
        ...analyticsCategories.map(c => ({ label: c.name, value: c.name }))
    ];

    useEffect(() => {
        if (open && user) {
            loadGoals();
        }
    }, [open, user]);

    const loadGoals = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await fetchGoals(user.id);
            setGoals(data);
            onGoalsUpdated(data);
        } catch (error) {
            console.error("Failed to load goals", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setLabel('');
        setHours('');
        setMinutes('');
        setCategoryKey('');
        setColor(COLORS[0]);
    };

    const startEditing = (goal: AnalyticsGoal) => {
        setEditingId(goal.id);
        setLabel(goal.label);
        const h = Math.floor(goal.target_hours);
        const m = Math.round((goal.target_hours - h) * 60);
        setHours(h.toString());
        setMinutes(m.toString());
        setCategoryKey(goal.category_key);
        setColor(goal.color);
    };

    const handleSave = async () => {
        if (!user || !label || !categoryKey) return;

        // Convert time to decimal hours
        const h = parseInt(hours || '0');
        const m = parseInt(minutes || '0');
        const totalHours = h + (m / 60);

        if (totalHours <= 0) return;

        try {
            if (editingId) {
                // Update
                await updateGoal(editingId, {
                    label,
                    target_hours: totalHours,
                    category_key: categoryKey,
                    color
                });
            } else {
                // Create
                await createGoal({
                    user_id: user.id,
                    label,
                    target_hours: totalHours,
                    category_key: categoryKey,
                    color
                });
            }
            await loadGoals();
            resetForm();
            toast.success(editingId ? "Goal updated successfully" : "Goal added successfully");
        } catch (error: any) {
            console.error("Failed to save goal", error);
            toast.error(error.message || "Failed to save goal. Did you create the table?");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this goal?")) return;
        try {
            await deleteGoal(id);
            await loadGoals();
        } catch (error) {
            console.error("Failed to delete goal", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Target className="h-4 w-4" />
                    Set Goal
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Productivity Goals</DialogTitle>
                </DialogHeader>

                {/* Goals List */}
                <div className="space-y-4 my-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {goals.length === 0 && !editingId && (
                        <p className="text-sm text-muted-foreground text-center py-4">No goals set yet. Add one below!</p>
                    )}

                    {goals.map(goal => (
                        <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: goal.color }}
                                />
                                <div>
                                    <div className="font-medium text-sm">{goal.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Target: {Math.floor(goal.target_hours)}h {Math.round((goal.target_hours % 1) * 60)}m ({goal.category_key})
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(goal)}>
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(goal.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add/Edit Form */}
                <div className="space-y-4 border-t pt-4">
                    <div className="font-medium text-sm">
                        {editingId ? 'Edit Goal' : 'Add New Goal'}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Label Name</Label>
                            <Input
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                placeholder="e.g. Sleep Target"
                                className="h-8"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Category Link</Label>
                                <Select value={categoryKey} onValueChange={setCategoryKey}>
                                    <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((opt, i) => (
                                            <SelectItem key={i} value={opt.value} disabled={opt.disabled}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs">Target Time</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Hr"
                                        value={hours}
                                        onChange={e => setHours(e.target.value)}
                                        className="h-8"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Min"
                                        value={minutes}
                                        onChange={e => setMinutes(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">Color</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                            color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        {editingId && (
                            <Button variant="ghost" size="sm" onClick={resetForm}>
                                Cancel
                            </Button>
                        )}
                        <Button size="sm" onClick={handleSave} disabled={!label || !categoryKey}>
                            {editingId ? 'Update Goal' : 'Add Goal'}
                            {editingId ? <Check className="ml-1 h-3 w-3" /> : <Plus className="ml-1 h-3 w-3" />}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GoalSettingsDialog;
