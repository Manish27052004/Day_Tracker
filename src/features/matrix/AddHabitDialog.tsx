
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTemplates, type TaskTemplate } from "@/services/templateService";
import { addItemsToProfile } from "@/services/profileService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddHabitDialogProps {
    profileId: number | null;
    existingTemplateIds: number[];
    onHabitAdded: () => void;
}

const AddHabitDialog: React.FC<AddHabitDialogProps> = ({ profileId, existingTemplateIds, onHabitAdded }) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && user) {
            loadTemplates();
        }
    }, [open, user]);

    const loadTemplates = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await fetchTemplates(user.id);
            // Filter only active templates? Or show all? Let's show all for now.
            setTemplates(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load templates");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (id: number | undefined) => {
        if (id === undefined) return;
        setSelectedTemplateIds(prev =>
            prev.includes(id)
                ? prev.filter(tid => tid !== id)
                : [...prev, id]
        );
    };

    const handleAdd = async () => {
        if (!profileId || selectedTemplateIds.length === 0) return;

        try {
            await addItemsToProfile(profileId, selectedTemplateIds);
            toast.success(`Added ${selectedTemplateIds.length} habits to profile`);
            setOpen(false);
            setSelectedTemplateIds([]); // Reset selection
            onHabitAdded(); // Callback to refresh parent
        } catch (error) {
            console.error(error);
            toast.error("Failed to add habits");
        }
    };

    if (!profileId) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Add Habit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Habits to Profile</DialogTitle>
                    <DialogDescription>
                        Select existing templates to track in this profile.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Command className="border rounded-md max-h-[300px]">
                        <CommandInput placeholder="Search templates..." />
                        <CommandList>
                            <CommandEmpty>No templates found.</CommandEmpty>
                            <CommandGroup heading="Available Templates">
                                {templates.map((template) => (
                                    <CommandItem
                                        key={template.id}
                                        value={template.name}
                                        onSelect={() => !existingTemplateIds.includes(template.id!) && toggleSelection(template.id)}
                                        disabled={existingTemplateIds.includes(template.id!)}
                                        className={cn(existingTemplateIds.includes(template.id!) && "opacity-50 cursor-not-allowed")}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selectedTemplateIds.includes(template.id!) || existingTemplateIds.includes(template.id!)
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{template.name}</span>
                                        {existingTemplateIds.includes(template.id!) && (
                                            <span className="ml-2 text-xs text-muted-foreground">(Added)</span>
                                        )}
                                        {template.category && (
                                            <span className="ml-auto text-xs text-muted-foreground">{template.category}</span>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={selectedTemplateIds.length === 0}>
                        Add {selectedTemplateIds.length > 0 ? `(${selectedTemplateIds.length})` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddHabitDialog;
