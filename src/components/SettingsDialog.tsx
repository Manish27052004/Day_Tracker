import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Priority, type Category } from '@/lib/db';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: 'priorities' | 'categories';
}

const COLORS = [
    { label: 'Red', value: 'bg-danger/10 text-danger border-danger/20' },
    { label: 'Green', value: 'bg-success/10 text-success border-success/20' },
    { label: 'Blue', value: 'bg-info/10 text-info border-info/20' },
    { label: 'Yellow', value: 'bg-warning/10 text-warning border-warning/20' },
    { label: 'Purple', value: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    { label: 'Grey', value: 'bg-muted text-muted-foreground border-border' },
];

export const SettingsDialog = ({ open, onOpenChange, defaultTab = 'priorities' }: SettingsDialogProps) => {
    const priorities = useLiveQuery(() => db.priorities.orderBy('order').toArray());
    const categories = useLiveQuery(() => db.categories.orderBy('order').toArray());

    const [newPriorityName, setNewPriorityName] = useState('');
    const [newPriorityColor, setNewPriorityColor] = useState(COLORS[0].value);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<Category['type']>('work');
    const [newCategoryColor, setNewCategoryColor] = useState(COLORS[0].value);

    // Edit State
    const [editingPriorityId, setEditingPriorityId] = useState<number | null>(null);
    const [editPriorityName, setEditPriorityName] = useState('');
    const [editPriorityColor, setEditPriorityColor] = useState('');

    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [editCategoryColor, setEditCategoryColor] = useState('');

    const handleAddPriority = async () => {
        if (!newPriorityName.trim()) return;
        const count = await db.priorities.count();
        await db.priorities.add({
            name: newPriorityName,
            color: newPriorityColor,
            order: count + 1,
        });
        setNewPriorityName('');
    };

    const startEditPriority = (p: Priority) => {
        if (!p.id) return;
        setEditingPriorityId(p.id);
        setEditPriorityName(p.name);
        setEditPriorityColor(p.color);
    };

    const cancelEditPriority = () => {
        setEditingPriorityId(null);
        setEditPriorityName('');
        setEditPriorityColor('');
    };

    const handleUpdatePriority = async () => {
        if (!editingPriorityId || !editPriorityName.trim()) return;
        const oldPriority = priorities?.find(p => p.id === editingPriorityId);
        if (!oldPriority) return;

        await db.transaction('rw', db.priorities, db.tasks, db.repeatingTasks, async () => {
            await db.priorities.update(editingPriorityId, {
                name: editPriorityName,
                color: editPriorityColor
            });

            // Cascade update if name changed
            if (oldPriority.name !== editPriorityName) {
                await db.tasks.where('priority').equals(oldPriority.name).modify({ priority: editPriorityName });
                await db.repeatingTasks.where('priority').equals(oldPriority.name).modify({ priority: editPriorityName });
            }
        });

        setEditingPriorityId(null);
    };

    const handleDeletePriority = async (id: number) => {
        await db.priorities.delete(id);
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const count = await db.categories.count();
        await db.categories.add({
            name: newCategoryName,
            type: newCategoryType,
            color: newCategoryColor,
            order: count + 1,
        });
        setNewCategoryName('');
    };

    const startEditCategory = (c: Category) => {
        if (!c.id) return;
        setEditingCategoryId(c.id);
        setEditCategoryName(c.name);
        setEditCategoryColor(c.color);
    };

    const cancelEditCategory = () => {
        setEditingCategoryId(null);
        setEditCategoryName('');
        setEditCategoryColor('');
    };

    const handleUpdateCategory = async () => {
        if (!editingCategoryId || !editCategoryName.trim()) return;
        const oldCategory = categories?.find(c => c.id === editingCategoryId);
        if (!oldCategory) return;

        await db.transaction('rw', db.categories, db.sessions, async () => {
            await db.categories.update(editingCategoryId, {
                name: editCategoryName,
                color: editCategoryColor
            });

            // Cascade update if name changed
            if (oldCategory.name !== editCategoryName) {
                await db.sessions.where('category').equals(oldCategory.name).modify({ category: editCategoryName });
            }
        });

        setEditingCategoryId(null);
    };

    const handleDeleteCategory = async (id: number) => {
        await db.categories.delete(id);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Manage your planning priorities and execution categories.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="priorities">Planning Priorities</TabsTrigger>
                        <TabsTrigger value="categories">Execution Categories</TabsTrigger>
                    </TabsList>

                    {/* PRIORITIES TAB */}
                    <TabsContent value="priorities" className="space-y-4 py-4">
                        <div className="flex gap-2 items-end border-b pb-4">
                            <div className="flex-1 space-y-2">
                                <Label>New Priority Name</Label>
                                <Input
                                    placeholder="e.g. Urgent"
                                    value={newPriorityName}
                                    onChange={(e) => setNewPriorityName(e.target.value)}
                                />
                            </div>
                            <div className="w-[140px] space-y-2">
                                <Label>Color</Label>
                                <Select value={newPriorityColor} onValueChange={setNewPriorityColor}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLORS.map((c) => (
                                            <SelectItem key={c.label} value={c.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-3 h-3 rounded-full", c.value.split(' ')[0])} />
                                                    {c.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleAddPriority}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Existing Priorities</Label>
                            <div className="space-y-2">
                                {priorities?.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                        {editingPriorityId === p.id ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    value={editPriorityName}
                                                    onChange={(e) => setEditPriorityName(e.target.value)}
                                                    className="h-8"
                                                />
                                                <Select value={editPriorityColor} onValueChange={setEditPriorityColor}>
                                                    <SelectTrigger className="w-[140px] h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {COLORS.map((c) => (
                                                            <SelectItem key={c.label} value={c.value}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn("w-3 h-3 rounded-full", c.value.split(' ')[0])} />
                                                                    {c.label}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button size="icon" variant="ghost" onClick={handleUpdatePriority} className="h-8 w-8 text-success hover:text-success/80">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={cancelEditPriority} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", p.color)}>
                                                        {p.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => startEditPriority(p)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeletePriority(p.id!)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    {/* CATEGORIES TAB */}
                    <TabsContent value="categories" className="space-y-4 py-4">
                        <div className="flex gap-2 items-end border-b pb-4">
                            <div className="flex-1 space-y-2">
                                <Label>New Category Name</Label>
                                <Input
                                    placeholder="e.g. Deep Work"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                />
                            </div>
                            <div className="w-[120px] space-y-2">
                                <Label>Type</Label>
                                <Select value={newCategoryType} onValueChange={(v: Category['type']) => setNewCategoryType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="work">Work</SelectItem>
                                        <SelectItem value="life">Life</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-[140px] space-y-2">
                                <Label>Color</Label>
                                <Select value={newCategoryColor} onValueChange={setNewCategoryColor}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLORS.map((c) => (
                                            <SelectItem key={c.label} value={c.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-3 h-3 rounded-full", c.value.split(' ')[0])} />
                                                    {c.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleAddCategory}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Existing Categories</Label>
                            <div className="grid gap-4">
                                {['work', 'life'].map((type) => (
                                    <div key={type}>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">{type}</h4>
                                        <div className="space-y-2">
                                            {categories?.filter(c => c.type === type).map((c) => (
                                                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                                    {editingCategoryId === c.id ? (
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <Input
                                                                value={editCategoryName}
                                                                onChange={(e) => setEditCategoryName(e.target.value)}
                                                                className="h-8"
                                                            />
                                                            <Select value={editCategoryColor} onValueChange={setEditCategoryColor}>
                                                                <SelectTrigger className="w-[140px] h-8">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {COLORS.map((color) => (
                                                                        <SelectItem key={color.label} value={color.value}>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={cn("w-3 h-3 rounded-full", color.value.split(' ')[0])} />
                                                                                {color.label}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button size="icon" variant="ghost" onClick={handleUpdateCategory} className="h-8 w-8 text-success hover:text-success/80">
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" onClick={cancelEditCategory} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-3">
                                                                <span className={cn("text-sm font-medium", c.color.split(' ')[1])}>
                                                                    {c.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Button variant="ghost" size="icon" onClick={() => startEditCategory(c)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(c.id!)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
