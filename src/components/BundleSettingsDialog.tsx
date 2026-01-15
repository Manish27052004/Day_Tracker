import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
    fetchTemplates,
    createBundle,
    deleteBundle,
    fetchBundles,
    TaskTemplate,
    TaskBundle
} from '@/services/templateService';
import { Plus, Trash2, Layers, Check, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface BundleSettingsDialogProps {
    onBundlesUpdated: () => void;
}

import { AVAILABLE_COLORS } from '@/lib/colors';

const BundleSettingsDialog = ({ onBundlesUpdated }: BundleSettingsDialogProps) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [bundles, setBundles] = useState<any[]>([]);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);

    // Form State
    const [name, setName] = useState('');
    const [color, setColor] = useState(AVAILABLE_COLORS[6].value); // Default Indigo
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);

    useEffect(() => {
        if (open && user) {
            loadData();
        }
    }, [open, user]);

    const loadData = async () => {
        if (!user) return;
        try {
            const [b, t] = await Promise.all([
                fetchBundles(user.id),
                fetchTemplates(user.id)
            ]);
            setBundles(b || []);
            setTemplates(t || []);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };

    const handleCreate = async () => {
        if (!user || !name) return;
        if (selectedTemplateIds.length === 0) {
            toast.error("Please select at least one template");
            return;
        }

        try {
            await createBundle(user.id, name, color, selectedTemplateIds);
            toast.success("Bundle created successfully");
            setName('');
            setSelectedTemplateIds([]);
            await loadData();
            onBundlesUpdated();
        } catch (error: any) {
            console.error("Failed to create bundle", error);
            toast.error(error.message || "Failed to create bundle");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this bundle?")) return;
        try {
            await deleteBundle(id);
            toast.success("Bundle deleted");
            await loadData();
            onBundlesUpdated();
        } catch (error: any) {
            toast.error("Failed to delete bundle");
        }
    };

    const toggleTemplate = (id: number) => {
        setSelectedTemplateIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(tid => tid !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const isMobile = useIsMobile();

    const renderHeader = () => (
        <div className="flex flex-row items-center justify-between">
            {isMobile ? (
                <DrawerTitle>Template Bundles</DrawerTitle>
            ) : (
                <DialogTitle>Template Bundles</DialogTitle>
            )}
        </div>
    );

    const renderContent = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pb-6">
            {/* LEFT: Existing Bundles */}
            <div className={cn("space-y-4", !isMobile && "border-r pr-4")}>
                <h4 className="text-sm font-medium text-muted-foreground">Your Bundles</h4>
                <div className="space-y-2 max-h-[250px] md:max-h-[300px] overflow-y-auto no-scrollbar">
                    {bundles.length === 0 && <p className="text-xs text-muted-foreground italic">No bundles yet.</p>}
                    {bundles.map(bundle => (
                        <div key={bundle.id} className="p-3 rounded-md border bg-muted/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bundle.color }} />
                                <div>
                                    <div className="font-medium text-sm">{bundle.name}</div>
                                    <div className="text-xs text-muted-foreground">{bundle.items?.length || 0} templates</div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(bundle.id)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Create New */}
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Create New Bundle</h4>

                <div>
                    <Label className="text-xs">Bundle Name</Label>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Morning Routine"
                        className="h-8 mt-1"
                    />
                </div>

                <div>
                    <Label className="text-xs">Color</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {AVAILABLE_COLORS.map(c => (
                            <button
                                key={c.name}
                                type="button"
                                onClick={() => setColor(c.value)}
                                className={cn(
                                    "w-5 h-5 rounded-full transition-transform",
                                    color === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                                )}
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <Label className="text-xs">Select Templates (In Order)</Label>
                    <div className="mt-1 border rounded-md max-h-[150px] overflow-y-auto no-scrollbar p-2 space-y-1">
                        {templates.map(t => (
                            <div
                                key={t.id}
                                className={cn(
                                    "flex items-center gap-2 p-1.5 rounded text-sm cursor-pointer hover:bg-muted",
                                    selectedTemplateIds.includes(t.id!) ? "bg-primary/10" : ""
                                )}
                                onClick={() => toggleTemplate(t.id!)}
                            >
                                <div className={cn(
                                    "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                                    selectedTemplateIds.includes(t.id!) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                                )}>
                                    {selectedTemplateIds.includes(t.id!) && <Check className="h-3 w-3" />}
                                </div>
                                <span className="truncate flex-1">{t.name}</span>
                                {selectedTemplateIds.includes(t.id!) && (
                                    <Badge variant="secondary" className="text-[10px] h-5">
                                        #{selectedTemplateIds.indexOf(t.id!) + 1}
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Click to select. Order is preserved.</p>
                </div>

                <Button size="sm" className="w-full" onClick={handleCreate} disabled={!name || selectedTemplateIds.length === 0}>
                    <Plus className="h-3 w-3 mr-2" />
                    Create Bundle
                </Button>
            </div>
        </div>
    );

    const triggerButton = (
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-normal">
            <Layers className="h-3 w-3 mr-2" />
            Manage Bundles...
        </Button>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    {triggerButton}
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader className="text-left">
                        {renderHeader()}
                    </DrawerHeader>
                    <div className="px-4 overflow-y-auto">
                        {renderContent()}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card border-border">
                <DialogHeader>
                    {renderHeader()}
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};

export default BundleSettingsDialog;
