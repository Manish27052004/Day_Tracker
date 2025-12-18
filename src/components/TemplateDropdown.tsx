import { useState, useEffect } from 'react';
import {
    FileText,
    ChevronDown,
    Plus,
    MoreVertical,
    Flag,
    Edit,
    Copy,
    Trash2,
    FileIcon,
    Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import {
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    fetchBundles,
    type TaskTemplate,
    type TaskBundle
} from '@/services/templateService';
import RepeatScheduleDialog from './RepeatScheduleDialog';
import BundleSettingsDialog from './BundleSettingsDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TemplateDropdownProps {
    onTemplateSelect?: (template: any) => void;
}

const TemplateDropdown = ({ onTemplateSelect }: TemplateDropdownProps) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);

    // Data State
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [bundles, setBundles] = useState<TaskBundle[]>([]);

    const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | undefined>();
    const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | undefined>();

    // Fetch Data
    useEffect(() => {
        if (open && user) {
            loadData();
        }
    }, [open, user]);

    const loadData = async () => {
        if (!user) return;
        try {
            const [t, b] = await Promise.all([
                fetchTemplates(user.id),
                fetchBundles(user.id)
            ]);
            setTemplates(t || []);
            setBundles(b || []);
        } catch (error) {
            console.error("Failed to load templates", error);
        }
    };

    const defaultTemplate = templates?.find(t => t.isDefault);

    const handleSetDefault = async (template: TaskTemplate) => {
        if (!template.id) return;
        try {
            // Unset all locally to update UI faster? Or just reload
            await Promise.all(templates.map(t => {
                if (t.isDefault) return updateTemplate(t.id!, { isDefault: false });
                return Promise.resolve();
            }));

            await updateTemplate(template.id, { isDefault: true });
            toast.success("Default template updated");
            loadData();
        } catch (e) {
            toast.error("Failed to set default");
        }
    };

    const handleEdit = (template: TaskTemplate) => {
        setEditingTemplate(template);
        setRepeatDialogOpen(true);
    };

    const handleDuplicate = async (template: TaskTemplate) => {
        if (!user) return;
        try {
            await createTemplate({
                ...template,
                user_id: user.id,
                name: `${template.name} (Copy)`,
                isDefault: false,
                isActive: true
            });
            toast.success("Template duplicated");
            loadData();
        } catch (e) {
            toast.error("Failed to duplicate");
        }
    };

    const handleDelete = async (template: TaskTemplate) => {
        if (!template.id) return;
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            await deleteTemplate(template.id);
            toast.success("Template deleted");
            loadData();
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const handleNewTemplate = () => {
        setEditingTemplate(undefined);
        setRepeatDialogOpen(true);
    };

    const handleRepeat = (template: TaskTemplate) => {
        setSelectedTemplate(template);
        setRepeatDialogOpen(true);
    };

    const handleTemplateClick = async (template: any | null) => {
        if (onTemplateSelect) {
            await onTemplateSelect(template);
        }
        setOpen(false);
    };

    const handleBundleClick = async (bundle: any) => {
        if (!onTemplateSelect || !bundle.items) return;

        // Items are ordered by DB query in service
        const sortedItems = bundle.items.sort((a: any, b: any) => a.order_index - b.order_index);

        for (const item of sortedItems) {
            if (item.template) {
                await onTemplateSelect(item.template);
            }
        }
        toast.success(`Bundle "${bundle.name}" added`);
        setOpen(false);
    };

    return (
        <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Templates
                        <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {/* New Template / Manage Bundles */}
                    <DropdownMenuItem onClick={handleNewTemplate} className="cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="font-medium">New template</span>
                    </DropdownMenuItem>

                    <BundleSettingsDialog onBundlesUpdated={loadData} />

                    <DropdownMenuSeparator />

                    {/* BUNDLES SECTION */}
                    {bundles.length > 0 && (
                        <>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Bundles</div>
                            {bundles.map(bundle => (
                                <DropdownMenuItem
                                    key={bundle.id}
                                    onClick={() => handleBundleClick(bundle)}
                                    className="cursor-pointer flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bundle.color }} />
                                        <span>{bundle.name}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground group-hover:block hidden">
                                        {bundle.items?.length || 0} tasks
                                    </span>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                        </>
                    )}

                    {/* Empty Template */}
                    <div className="px-2 py-1.5 flex items-center justify-between hover:bg-muted rounded-sm cursor-pointer group" onClick={() => handleTemplateClick(null)}>
                        <div className="flex items-center gap-2 flex-1">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Empty</span>
                            {!defaultTemplate && (
                                <Flag className="h-3 w-3 text-primary" fill="currentColor" />
                            )}
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => toast.info("Can't set default on empty yet")}>
                                    <Flag className="h-4 w-4 mr-2" />
                                    Set as default
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Template List */}
                    {templates && templates.length > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Templates</div>
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className="px-2 py-1.5 flex items-center justify-between hover:bg-muted rounded-sm cursor-pointer group"
                                    onClick={() => handleTemplateClick(template)}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {template.icon && <span>{template.icon}</span>}
                                        <span className="text-sm truncate">{template.name}</span>
                                        {template.isDefault && (
                                            <Flag className="h-3 w-3 text-primary flex-shrink-0" fill="currentColor" />
                                        )}
                                    </div>

                                    {/* Three-dot menu */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetDefault(template); }}>
                                                <Flag className="h-4 w-4 mr-2" />
                                                Set as default
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(template); }}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }}>
                                                <Copy className="h-4 w-4 mr-2" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={(e) => { e.stopPropagation(); handleDelete(template); }}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Repeat Schedule Dialog - Adapted for Cloud Templates if needed */}
            {/* Note: RepeatScheduleDialog likely needs updates to support cloud templates too, or we just pass the object and it works if interface matches */}
            <RepeatScheduleDialog
                open={repeatDialogOpen}
                onOpenChange={setRepeatDialogOpen}
                task={editingTemplate as any}
                onSave={loadData} // Pass a callback to reload data after save
            />
        </>
    );
};

export default TemplateDropdown;
