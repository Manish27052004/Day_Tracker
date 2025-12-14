import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { type Task } from '@/lib/db';

interface TaskComboBoxProps {
    tasks: Task[];
    selectedTaskId: number | null;
    customValue: string;
    onTaskSelect: (taskId: number | null, taskName: string) => void;
    placeholder?: string;
}

const TaskComboBox = ({
    tasks,
    selectedTaskId,
    customValue,
    onTaskSelect,
    placeholder = 'Select task...'
}: TaskComboBoxProps) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    const displayValue = selectedTask?.name || customValue || placeholder;

    const handleSelect = (taskId: number, taskName: string) => {
        onTaskSelect(taskId, taskName);
        setOpen(false);
        setSearchValue('');
    };

    const handleCustomEntry = () => {
        if (searchValue.trim()) {
            onTaskSelect(null, searchValue.trim());
            setOpen(false);
            setSearchValue('');
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-8 px-2 font-normal text-sm hover:bg-muted/50"
                >
                    <span className="truncate">{displayValue}</span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Search or type new..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div className="py-2">
                                <p className="text-sm text-muted-foreground mb-2">No task found.</p>
                                {searchValue.trim() && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleCustomEntry}
                                    >
                                        Create "{searchValue.trim()}"
                                    </Button>
                                )}
                            </div>
                        </CommandEmpty>
                        <CommandGroup heading="Planning Tasks">
                            {tasks.map((task) => (
                                <CommandItem
                                    key={task.id}
                                    value={task.name}
                                    onSelect={() => handleSelect(task.id!, task.name)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedTaskId === task.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="truncate font-medium">{task.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Target: {Math.floor(task.targetTime / 60)}h {task.targetTime % 60}m
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default TaskComboBox;
