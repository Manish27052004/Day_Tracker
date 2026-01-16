import React, { useState, useEffect, useRef } from 'react';
import { format, isSameDay, addDays, subDays, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Flame, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface MobileHabitViewProps {
    data: {
        items: any[];
        tasks: any[];
    } | undefined;
    range: { from: Date; to: Date };
    onToggle: (taskId: number | undefined, date: string, template: any, isCompleted: boolean) => void;
}

const MobileHabitView: React.FC<MobileHabitViewProps> = ({ data, range, onToggle }) => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Generate days array from range (or just dynamic +/- 3 days from selected if we want)
    // For now, let's stick to the props range but ensure we can see enough context
    // Actually, improved UX: Horizontal strip usually centers Today. 
    // Let's perform a simple "Days in Range" generation.
    const dates = React.useMemo(() => {
        const d = [];
        let curr = new Date(range.from);
        while (curr <= range.to) {
            d.push(new Date(curr));
            curr = addDays(curr, 1);
        }
        return d;
    }, [range]);

    // Auto-scroll to selected date on mount
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            // efficient scrolling logic could go here
            // distinct enough for v1: just let user scroll
        }
    }, [dates]);

    // Filter tasks for selected date
    const todaysTasks = React.useMemo(() => {
        if (!data) return [];
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        return data.items.map(item => {
            const task = data.tasks.find(t => t.name === item.template?.name && t.date === dateStr);
            const isCompleted = task && (task.status === 'on-track' || task.status === 'overachiever');
            // Calculate streak (naive local calculation for UI pop)
            // Real streak should ideally come from backend, but we can simulate or just hide if complex
            return {
                ...item,
                task,
                isCompleted,
                streak: 0 // Placeholder
            };
        });
    }, [data, selectedDate]);

    // Calculate Completion % for the Header Ring
    const completionPercentage = React.useMemo(() => {
        if (todaysTasks.length === 0) return 0;
        const completed = todaysTasks.filter(t => t.isCompleted).length;
        return Math.round((completed / todaysTasks.length) * 100);
    }, [todaysTasks]);

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
            {/* Header: Date Strip */}
            <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-2 shadow-sm">
                <div className="flex items-center justify-between mb-2 px-2">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        {format(selectedDate, 'MMMM d')}
                        {isSameDay(selectedDate, new Date()) && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Today</span>}
                    </h2>
                    <div className="text-xs font-mono text-muted-foreground">
                        {completionPercentage}% Done
                    </div>
                </div>

                <ScrollArea className="w-full whitespace-nowrap pb-2">
                    <div className="flex space-x-2 px-1">
                        {dates.map((date) => {
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());

                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all border-2",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                            : "bg-background border-border hover:bg-muted text-muted-foreground",
                                        isToday && !isSelected && "border-primary/50 text-foreground"
                                    )}
                                >
                                    <span className="text-[10px] uppercase font-bold opacity-70">{format(date, 'EEE')}</span>
                                    <span className={cn("text-xl font-bold", isSelected ? "scale-110" : "")}>{format(date, 'd')}</span>
                                    {/* Dot indicator if day has data? (optional) */}
                                </button>
                            )
                        })}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
            </div>

            {/* Body: Task Cards */}
            <div className="space-y-3 pb-20">
                <AnimatePresence mode="popLayout">
                    {todaysTasks.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div
                                className={cn(
                                    "relative overflow-hidden p-4 rounded-2xl border transition-all duration-300",
                                    item.isCompleted
                                        ? "bg-primary/5 border-primary/20"
                                        : "bg-card border-border/50 shadow-sm"
                                )}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className={cn(
                                            "font-semibold text-base truncate transition-all",
                                            item.isCompleted && "text-muted-foreground line-through opacity-70"
                                        )}>
                                            {item.template?.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* Category Badge (if available) */}
                                            {item.template?.category && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider font-medium">
                                                    {item.template.category}
                                                </span>
                                            )}

                                            {/* Target / Details */}
                                            {item.template?.target_time && (
                                                <span className="text-xs text-muted-foreground">
                                                    {item.template.target_time}m
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => {
                                            // Haptic feedback
                                            if (navigator.vibrate) navigator.vibrate(15);
                                            onToggle(item.task?.id, format(selectedDate, 'yyyy-MM-dd'), item.template, !item.isCompleted);
                                        }}
                                        className={cn(
                                            "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all active:scale-90",
                                            item.isCompleted
                                                ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary))]"
                                                : "bg-transparent border-muted-foreground/30 text-muted-foreground/20 hover:bg-muted/30"
                                        )}
                                    >
                                        <Check className={cn("w-6 h-6", item.isCompleted ? "stroke-[3px]" : "")} />
                                    </button>
                                </div>

                                {/* Background Progress Fill Effect */}
                                {item.isCompleted && (
                                    <motion.div
                                        layoutId={`fill-${item.id}`}
                                        className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none"
                                        initial={{ opacity: 0, x: '-100%' }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5 }}
                                    />
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {todaysTasks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Flame className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No habits tracked for this day.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileHabitView;
