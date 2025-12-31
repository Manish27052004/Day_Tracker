
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Settings, Check, X, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProfiles, createProfile, deleteProfile, type Profile } from "@/services/profileService";
import { toast } from "sonner";

interface ProfileSelectorProps {
    selectedProfileId: number | null;
    onSelect: (id: number | null) => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ selectedProfileId, onSelect }) => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false); // Popover state
    const [dialogOpen, setDialogOpen] = useState(false); // Dialog state
    const [newProfileName, setNewProfileName] = useState("");

    const loadProfiles = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await fetchProfiles(user.id);
            setProfiles(data);

            // Auto-select first profile if none selected and profiles exist
            if (!selectedProfileId && data.length > 0) {
                onSelect(data[0].id);
            }
        } catch (error) {
            console.error("Failed to load profiles", error);
            toast.error("Failed to load profiles");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProfiles();
    }, [user]);

    const handleCreateProfile = async () => {
        if (!newProfileName.trim() || !user) return;
        try {
            const newProfile = await createProfile({
                user_id: user.id,
                name: newProfileName,
                is_default: profiles.length === 0 // First one is default
            });
            setProfiles([...profiles, newProfile]);
            onSelect(newProfile.id);
            setDialogOpen(false);
            setNewProfileName("");
            toast.success("Profile created");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create profile");
        }
    };

    const handleDeleteProfile = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this profile?")) return;

        try {
            await deleteProfile(id);
            setProfiles(profiles.filter(p => p.id !== id));
            if (selectedProfileId === id) {
                onSelect(null);
            }
            toast.success("Profile deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete profile");
        }
    };

    const selectedProfile = profiles.find(p => p.id === selectedProfileId);

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[200px] justify-between"
                    >
                        {selectedProfile ? selectedProfile.name : "Select Profile..."}
                        <Settings className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search profiles..." />
                        <CommandList>
                            <CommandEmpty>No profile found.</CommandEmpty>
                            <CommandGroup heading="Profiles">
                                {profiles.map((profile) => (
                                    <CommandItem
                                        key={profile.id}
                                        value={profile.name}
                                        onSelect={() => {
                                            onSelect(profile.id);
                                            setOpen(false);
                                        }}
                                        className="flex items-center justify-between group"
                                    >
                                        <div className="flex items-center">
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedProfileId === profile.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {profile.name}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => handleDeleteProfile(e, profile.id)}
                                        >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup>
                                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                    <DialogTrigger asChild>
                                        <CommandItem onSelect={() => setDialogOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create Profile
                                        </CommandItem>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create New Profile</DialogTitle>
                                            <DialogDescription>
                                                Profiles allow you to group specific tasks together (e.g., "Morning Routine", "Deep Work").
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="name" className="text-right">
                                                    Name
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={newProfileName}
                                                    onChange={(e) => setNewProfileName(e.target.value)}
                                                    className="col-span-3"
                                                    placeholder="e.g. Work Mode"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={handleCreateProfile}>Create</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default ProfileSelector;
