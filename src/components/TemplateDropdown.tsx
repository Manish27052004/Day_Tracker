import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    FileText,
    ChevronDown,
    Plus,
    MoreVertical,
    Repeat,
    Flag,
    Edit,
    Copy,
    Trash2,
    FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db, type RepeatingTask } from '@/lib/db';
import RepeatScheduleDialog from './RepeatScheduleDialog';
import { cn } from '@/lib/utils';

interface TemplateDropdownProps {
    onTemplateSelect?: (template: RepeatingTask | null) => void;
}

const TemplateDropdown = ({ onTemplateSelect }: TemplateDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<RepeatingTask | undefined>();
    const [editingTemplate, setEditingTemplate] = useState<RepeatingTask | undefined>();

    // Fetch all templates (Cross-compatible with Cloud if we migrate)
    const templates = useLiveQuery(
        async () => {
            if (!db.repeatingTasks) return [];
            const allTasks = await db.repeatingTasks.toArray();
            return allTasks.filter(t => t.isActive);
        },
        []
    );

    const defaultTemplate = templates?.find(t => t.isDefault);

    const handleSetDefault = async (template: RepeatingTask) => {
        // Unset all other defaults
        await db.repeatingTasks.toCollection().modify({ isDefault: false });

        // Set this one as default
        if (template.id) {
            await db.repeatingTasks.update(template.id, { isDefault: true });
        }
    };

    const handleEdit = (template: RepeatingTask) => {
        setEditingTemplate(template);
        setRepeatDialogOpen(true);
    };

    const handleDuplicate = async (template: RepeatingTask) => {
        await db.repeatingTasks.add({
            ...template,
            id: undefined,
            name: `${template.name} (Copy)`,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    };

    const handleDelete = async (template: RepeatingTask) => {
        if (template.id) {
            await db.repeatingTasks.delete(template.id);
        }
    };

    const handleNewTemplate = () => {
        setEditingTemplate(undefined);
        setRepeatDialogOpen(true);
    };

    const handleRepeat = (template: RepeatingTask) => {
        setSelectedTemplate(template);
        setRepeatDialogOpen(true);
    };

    const handleTemplateClick = async (template: RepeatingTask | null) => {
        if (onTemplateSelect) {
            await onTemplateSelect(template);
        }
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
                <DropdownMenuContent align="end" className="w-64">
                    {/* New Template Button */}
                    <DropdownMenuItem onClick={handleNewTemplate} className="cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="font-medium">New template</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Empty Template (Basic Task) */}
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
                                <DropdownMenuItem
                                    onClick={() => handleSetDefault({
                                        name: 'Empty',
                                        priority: 'normal',
                                        targetTime: 60,
                                        description: '',
                                        repeatPattern: 'daily',
                                        strikeCount: 0,
                                        isActive: true,
                                        isDefault: true,
                                        createdAt: new Date(),
                                        // Fix: Add missing gamification fields
                                        minCompletionTarget: 60,
                                        achieverStrike: 0,
                                        fighterStrike: 0,
                                    })}
                                >
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
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRepeat(template); }}>
                                                <Repeat className="h-4 w-4 mr-2" />
                                                Repeat
                                            </DropdownMenuItem>
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

            {/* Repeat Schedule Dialog */}
            <RepeatScheduleDialog
                open={repeatDialogOpen}
                onOpenChange={setRepeatDialogOpen}
                task={editingTemplate as any}
            />
        </>
    );
};

export default TemplateDropdown;
