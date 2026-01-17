import { useState, useEffect } from 'react';
import { db, type Priority, type Category } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";
import { ModeToggle } from "@/components/mode-toggle";
import { StorageSettings } from "@/components/settings/StorageSettings";

export interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: 'priorities' | 'categories' | 'types' | 'storage';
}

export interface CategoryType {
    id: number;
    name: string;
    order: number;
    color?: string; // Optional property for now
    is_active?: boolean;
}

import { AVAILABLE_COLORS } from '@/lib/colors';

export const SettingsDialog = ({ open, onOpenChange, defaultTab = 'priorities' }: SettingsDialogProps) => {
    const { user } = useAuth();

    // Cloud State
    const [priorities, setPriorities] = useState<Priority[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);
    const [loading, setLoading] = useState(false);

    // New Item States
    const [newPriorityName, setNewPriorityName] = useState('');
    const [newPriorityColor, setNewPriorityColor] = useState(AVAILABLE_COLORS[0].value);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<string>('');
    const [newCategoryColor, setNewCategoryColor] = useState(AVAILABLE_COLORS[0].value);

    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeColor, setNewTypeColor] = useState(AVAILABLE_COLORS[0].value);

    // Edit State
    const [editingPriorityId, setEditingPriorityId] = useState<number | null>(null);
    const [editPriorityName, setEditPriorityName] = useState('');
    const [editPriorityColor, setEditPriorityColor] = useState('');

    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [editCategoryType, setEditCategoryType] = useState('');
    const [editCategoryColor, setEditCategoryColor] = useState('');

    const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
    const [editTypeName, setEditTypeName] = useState('');
    const [editTypeColor, setEditTypeColor] = useState('');

    // Fetch Helper
    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Fetch Priorities
            const { data: pData } = await supabase
                .from('priorities')
                .select('*')
                .eq('user_id', user.id)
                .order('order', { ascending: true });

            if (pData) {
                setPriorities(pData);
                // Sync to local DB for offline access/analytics
                await db.priorities.clear();
                await db.priorities.bulkPut(pData);
            }

            // 2. Fetch Category Types (Main Categories)
            const { data: ctData } = await supabase
                .from('category_types')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true) // Filter active
                .order('name', { ascending: true });
            if (ctData) {
                setCategoryTypes(ctData);
                if (!newCategoryType && ctData.length > 0) {
                    setNewCategoryType(ctData[0].name);
                }
            }

            // 3. Fetch Execution Categories
            const { data: cData } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true) // Filter active
                .order('order', { ascending: true });

            if (cData) {
                setCategories(cData as Category[]);
                // Sync to local DB for offline access/analytics
                await db.categories.clear();
                await db.categories.bulkPut(cData as Category[]);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial Fetch
    useEffect(() => {
        if (open) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user]);


    // === TYPE MANAGEMENT (Categories Tab) ===
    const handleAddType = async () => {
        if (!newTypeName.trim() || !user) return;
        const { error } = await supabase.from('category_types').insert({
            user_id: user.id,
            name: newTypeName.trim(),
            order: categoryTypes.length + 1,
            color: newTypeColor // ADDED COLOR
        });
        if (error) alert(error.message);
        else {
            setNewTypeName('');
            fetchData();
        }
    };

    const handleUpdateType = async () => {
        if (!editingTypeId || !user) return;
        const { error } = await supabase
            .from('category_types')
            .update({ name: editTypeName, color: editTypeColor }) // ADDED COLOR
            .eq('id', editingTypeId)
            .eq('user_id', user.id);

        if (error) alert(error.message);
        else {
            // Update associated categories if name changed
            const oldType = categoryTypes.find(t => t.id === editingTypeId);
            if (oldType && oldType.name !== editTypeName) {
                await supabase
                    .from('categories')
                    .update({ type: editTypeName })
                    .eq('type', oldType.name)
                    .eq('user_id', user.id);
            }

            setEditingTypeId(null);
            fetchData();
        }
    };

    const handleDeleteType = async (id: number) => {
        if (!user) return;
        if (!confirm('Archive this main category? It will be hidden from planning but historical data remains.')) return;

        // SOFT DELETE: Set is_active = false
        const { error } = await supabase
            .from('category_types')
            .update({ is_active: false })
            .eq('id', id)
            .eq('user_id', user.id);
        if (error) alert(error.message);
        else fetchData();
    };


    // === PRIORITIES LOGIC ===
    const handleAddPriority = async () => {
        if (!newPriorityName.trim() || !user) return;
        const { error } = await supabase.from('priorities').insert({
            user_id: user.id,
            name: newPriorityName,
            color: newPriorityColor,
            order: priorities.length + 1,
        });
        if (error) alert(`Error: ${error.message}`);
        else {
            setNewPriorityName('');
            fetchData();
        }
    };

    const handleUpdatePriority = async () => {
        if (!editingPriorityId || !user) return;
        const oldPriority = priorities.find(p => p.id === editingPriorityId);

        const { error } = await supabase.from('priorities')
            .update({ name: editPriorityName, color: editPriorityColor })
            .eq('id', editingPriorityId)
            .eq('user_id', user.id);

        if (error) {
            alert(`Error: ${error.message}`);
            return;
        }

        // Cascade rename
        if (oldPriority && oldPriority.name !== editPriorityName) {
            await supabase.from('tasks')
                .update({ priority: editPriorityName })
                .eq('priority', oldPriority.name)
                .eq('user_id', user.id);
        }

        setEditingPriorityId(null);
        fetchData();
    };

    const handleDeletePriority = async (id: number) => {
        if (!user) return;
        const { error } = await supabase.from('priorities').delete().eq('id', id).eq('user_id', user.id);
        if (!error) fetchData();
    };


    // === EXECUTION CATEGORIES LOGIC ===
    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !user) return;
        if (!newCategoryType) {
            alert("Please select a valid Type (Main Category). If none exist, create one in the Categories tab.");
            return;
        }

        const { error } = await supabase.from('categories').insert({
            user_id: user.id,
            name: newCategoryName,
            type: newCategoryType,
            color: newCategoryColor,
            order: categories.length + 1,
        });

        if (error) alert(`Error: ${error.message}`);
        else {
            setNewCategoryName('');
            fetchData();
        }
    };

    const handleUpdateCategory = async () => {
        if (!editingCategoryId || !user) return;
        const oldCategory = categories.find(c => c.id === editingCategoryId);

        const { error } = await supabase.from('categories')
            .update({
                name: editCategoryName,
                type: editCategoryType,
                color: editCategoryColor
            })
            .eq('id', editingCategoryId)
            .eq('user_id', user.id);

        if (error) {
            alert(`Error: ${error.message}`);
            return;
        }

        // Cascade updates to sessions if Name or Type changed
        if (oldCategory && (oldCategory.name !== editCategoryName || oldCategory.type !== editCategoryType)) {
            // Update all past sessions that used this category
            await supabase.from('sessions')
                .update({
                    category: editCategoryName,
                    category_type: editCategoryType // Update the type as well
                })
                .eq('category', oldCategory.name)
                .eq('user_id', user.id);

            // Also update any Templates if they store category info (though they just reference name usually)
            await supabase.from('task_templates')
                .update({ category: editCategoryName })
                .eq('category', oldCategory.name)
                .eq('user_id', user.id);
        }

        setEditingCategoryId(null);
        fetchData();
    };

    const handleDeleteCategory = async (id: number) => {
        if (!user) return;
        // SOFT DELETE: Set is_active = false
        const { error } = await supabase
            .from('categories')
            .update({ is_active: false })
            .eq('id', id)
            .eq('user_id', user.id);
        if (!error) fetchData();
    };


    // === RENDER LOGIC ===
    const isMobile = useIsMobile();

    const renderHeader = () => (
        <div className="flex flex-row items-center justify-between pr-4 sm:pr-8 mb-4">
            <div>
                {isMobile ? (
                    <DrawerTitle>Settings</DrawerTitle>
                ) : (
                    <DialogTitle>Settings</DialogTitle>
                )}
                <div className="text-sm text-muted-foreground">
                    {isMobile ? (
                        <DrawerDescription>Manage priorities and categories.</DrawerDescription>
                    ) : (
                        <DialogDescription>Manage your planning priorities and execution categories.</DialogDescription>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-1">Theme</span>
                <ModeToggle />
            </div>
        </div>
    );

    const renderContent = () => (
        <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="priorities">Priorities</TabsTrigger>
                <TabsTrigger value="categories">Groups</TabsTrigger>
                <TabsTrigger value="execution">Activities</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
            </TabsList>

            {/* 4. STORAGE TAB */}
            <TabsContent value="storage" className="space-y-4 py-1">
                <StorageSettings />
            </TabsContent>

            {/* 1. PLANNING PRIORITIES TAB */}
            <TabsContent value="priorities" className="space-y-4 py-1">
                <div className="flex gap-2 items-end border-b pb-4">
                    <div className="flex-1 space-y-2">
                        <Label>New Priority Name</Label>
                        <Input placeholder="e.g. Urgent" value={newPriorityName} onChange={(e) => setNewPriorityName(e.target.value)} />
                    </div>
                    <div className="w-[100px] sm:w-[140px] space-y-2">
                        <Label>Color</Label>
                        <Select value={newPriorityColor} onValueChange={setNewPriorityColor}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {AVAILABLE_COLORS.map((c) => (
                                    <SelectItem key={c.name} value={c.value}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                                            <span className="hidden sm:inline">{c.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleAddPriority} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2">
                    <Label>Existing Priorities</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {priorities?.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                {editingPriorityId === p.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input value={editPriorityName} onChange={(e) => setEditPriorityName(e.target.value)} className="h-8 min-w-0" />
                                        <Select value={editPriorityColor} onValueChange={setEditPriorityColor}>
                                            <SelectTrigger className="w-[60px] h-8 px-2"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {AVAILABLE_COLORS.map((c) => (<SelectItem key={c.name} value={c.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} /></div></SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                        <Button size="icon" variant="ghost" onClick={handleUpdatePriority} className="h-8 w-8 text-success hover:text-success/80 shrink-0"><Check className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setEditingPriorityId(null)} className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"><X className="h-4 w-4" /></Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", !p.color.startsWith('#') && p.color)}
                                                style={p.color.startsWith('#') ? {
                                                    backgroundColor: `${p.color}20`,
                                                    color: p.color,
                                                    borderColor: `${p.color}40`
                                                } : undefined}
                                            >
                                                {p.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingPriorityId(p.id!); setEditPriorityName(p.name); setEditPriorityColor(p.color); }}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeletePriority(p.id!)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </TabsContent>

            {/* 2. CATEGORIES (TYPES) TAB */}
            <TabsContent value="categories" className="space-y-4 py-1">
                <div className="flex flex-col space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">Define your main groups (e.g., Work, Life).</p>
                </div>
                <div className="flex gap-2 items-end border-b pb-4">
                    <div className="flex-1 space-y-2">
                        <Label>New Group Name</Label>
                        <Input placeholder="e.g. Hobby" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
                    </div>
                    <div className="w-[100px] sm:w-[140px] space-y-2">
                        <Label>Color</Label>
                        <Select value={newTypeColor} onValueChange={setNewTypeColor}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {AVAILABLE_COLORS.map((c) => (
                                    <SelectItem key={c.name} value={c.value}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                                            <span className="hidden sm:inline">{c.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleAddType} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2">
                    <Label>Existing Groups</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {categoryTypes.map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                {editingTypeId === t.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input value={editTypeName} onChange={(e) => setEditTypeName(e.target.value)} className="h-8 min-w-0" />
                                        <Select value={editTypeColor} onValueChange={setEditTypeColor}>
                                            <SelectTrigger className="w-[60px] h-8 px-2"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {AVAILABLE_COLORS.map((c) => (<SelectItem key={c.name} value={c.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} /></div></SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                        <Button size="icon" variant="ghost" onClick={handleUpdateType} className="h-8 w-8 text-success hover:text-success/80 shrink-0"><Check className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setEditingTypeId(null)} className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"><X className="h-4 w-4" /></Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", !t.color?.startsWith('#') && t.color)}
                                                style={t.color?.startsWith('#') ? {
                                                    backgroundColor: `${t.color}20`,
                                                    color: t.color,
                                                    borderColor: `${t.color}40`
                                                } : undefined}
                                            >
                                                {t.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingTypeId(t.id); setEditTypeName(t.name); setEditTypeColor(t.color || AVAILABLE_COLORS[5].value); }}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteType(t.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </TabsContent>

            {/* 3. EXECUTION CATEGORIES TAB */}
            <TabsContent value="execution" className="space-y-4 py-1">
                <div className="flex flex-col space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">Add specific activities.</p>
                </div>
                <div className="grid grid-cols-[1fr_1fr] sm:grid-cols-[1fr_130px_130px_auto] gap-2 items-end border-b pb-4">
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                        <Label>Name</Label>
                        <Input placeholder="Deep Work" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Group</Label>
                        <Select value={newCategoryType} onValueChange={setNewCategoryType}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                                {categoryTypes.map(t => (
                                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <Select value={newCategoryColor} onValueChange={setNewCategoryColor}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {AVAILABLE_COLORS.map((c) => (<SelectItem key={c.name} value={c.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />{c.name}</div></SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleAddCategory} size="icon" className="shrink-0 mb-0.5 ml-auto sm:ml-0"><Plus className="h-4 w-4" /></Button>
                </div>

                <div className="space-y-2">
                    <Label>Existing Activities</Label>
                    <div className="grid gap-4 max-h-[300px] overflow-y-auto pr-1">
                        {categoryTypes.map((type) => (
                            <div key={type.id}>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize sticky top-0 bg-background/95 backdrop-blur z-10 py-1">{type.name}</h4>
                                <div className="space-y-2">
                                    {categories?.filter(c => c.type === type.name).map((c) => (
                                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                            {editingCategoryId === c.id ? (
                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                                                    <Input value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} className="h-8 flex-1" />

                                                    <div className="flex gap-2">
                                                        <Select value={editCategoryType} onValueChange={setEditCategoryType}>
                                                            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {categoryTypes.map(t => (
                                                                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        <Select value={editCategoryColor} onValueChange={setEditCategoryColor}>
                                                            <SelectTrigger className="w-[60px] h-8 px-2"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {AVAILABLE_COLORS.map((c) => (<SelectItem key={c.name} value={c.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} /></div></SelectItem>))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button size="icon" variant="ghost" onClick={handleUpdateCategory} className="h-8 w-8 text-success hover:text-success/80 shrink-0"><Check className="h-4 w-4" /></Button>
                                                        <Button size="icon" variant="ghost" onClick={() => setEditingCategoryId(null)} className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"><X className="h-4 w-4" /></Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={cn("text-sm font-medium", !c.color.startsWith('#') && c.color.split(' ')[1])}
                                                            style={c.color.startsWith('#') ? { color: c.color } : undefined}
                                                        >
                                                            {c.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            setEditingCategoryId(c.id!);
                                                            setEditCategoryName(c.name);
                                                            setEditCategoryType(c.type); // Set initial type
                                                            setEditCategoryColor(c.color);
                                                        }}><Pencil className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(c.id!)}><Trash2 className="h-4 w-4" /></Button>
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
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader>
                        {renderHeader()}
                    </DrawerHeader>
                    <div className="px-4 pb-8 overflow-y-auto">
                        {renderContent()}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 flex flex-col bg-card border-border">
                <div className="px-6 pt-6 pb-2">
                    {renderHeader()}
                </div>

                <div className="overflow-y-auto px-6 py-4 flex-1 custom-scrollbar">
                    {renderContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
};
