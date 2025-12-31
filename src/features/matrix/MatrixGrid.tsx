
import React from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { Check, X } from "lucide-react";
import { ProfileItem } from "@/services/profileService";

interface MatrixGridProps {
    profileId: number | null;
    range: { from: Date; to: Date };
    data: {
        items: ProfileItem[];
        tasks: any[];
    } | undefined;
    onToggle: (taskId: number | undefined, date: string, template: any, isCompleted: boolean) => void;
}

const MatrixGrid: React.FC<MatrixGridProps> = ({ profileId, range, data, onToggle }) => {
    if (!profileId) {
        return (
            <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg m-4">
                <p className="text-muted-foreground">Select a profile to view the matrix</p>
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center">Loading...</div>;

    const days = eachDayOfInterval({ start: range.from, end: range.to });

    return (
        <div className="relative border rounded-md">
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="flex w-max space-x-0">

                    {/* Sticky Column: Task Names */}
                    <div className="sticky left-0 z-20 bg-background border-r shadow-sm">
                        <div className="h-10 border-b bg-muted/50 flex items-center px-4 font-semibold text-xs text-muted-foreground">
                            Task / Habit
                        </div>
                        {data.items.map((item) => (
                            <div key={item.id} className="h-12 border-b flex items-center px-4 min-w-[200px] max-w-[200px] overflow-hidden text-sm font-medium">
                                <span className="truncate" title={item.template?.name}>
                                    {item.template?.name || "Unknown"}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Date Columns */}
                    {days.map((day) => (
                        <div key={day.toString()} className="flex flex-col min-w-[50px] border-r border-border/50 bg-card/50">
                            {/* Header */}
                            <div className={cn(
                                "h-10 border-b flex flex-col items-center justify-center px-2 text-xs",
                                isSameDay(day, new Date()) ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"
                            )}>
                                <span>{format(day, "EEE")}</span>
                                <span className="text-[10px] opacity-70">{format(day, "d")}</span>
                            </div>

                            {/* Cells */}
                            {data.items.map((item) => {
                                const template = item.template;
                                const dateStr = format(day, "yyyy-MM-dd");
                                const task = data.tasks.find(t => t.name === template?.name && t.date === dateStr);

                                const isCompleted = task && (task.status === 'on-track' || task.status === 'overachiever');
                                const statusColor = isCompleted ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'hover:bg-muted/50';

                                return (
                                    <div
                                        key={`${item.id}-${day}`}
                                        className={cn(
                                            "h-12 border-b flex items-center justify-center cursor-pointer transition-colors",
                                            statusColor
                                        )}
                                        onClick={() => onToggle(task?.id, dateStr, template, !isCompleted)}
                                    >
                                        {isCompleted && <Check className="w-4 h-4" />}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
};

export default MatrixGrid;
