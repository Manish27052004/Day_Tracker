
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RichEditor } from './RichEditor';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Edit2, Check } from 'lucide-react';

export interface TimelineSession {
    id: number;
    startTime: string;
    endTime: string;
    category?: string;
    customName?: string;
    taskId?: number;
    taskName?: string;
    richContent?: string;
    color?: string; // Hex color
}

export interface TimelineViewProps {
    sessions: TimelineSession[];
    onUpdateSession?: (id: number, content: string) => Promise<void>;
    onAddSession?: (startTime: string) => void;
    classNames?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
    sessions,
    onUpdateSession,
    onAddSession,
    classNames
}) => {
    const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<number | null>(null);

    // Sort sessions by start time
    const sortedSessions = [...sessions].sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
    });

    const handleExpand = (id: number) => {
        if (expandedSessionId === id) {
            setExpandedSessionId(null);
            setEditingSessionId(null);
        } else {
            setExpandedSessionId(id);
        }
    };

    const handleEditToggle = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (editingSessionId === id) {
            setEditingSessionId(null);
        } else {
            setEditingSessionId(id);
            setExpandedSessionId(id); // Ensure expanded
        }
    };

    // Helper to calculate minutes from HH:mm
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper to format minutes to HH:mm
    const toTimeStr = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Generate items including GAPS
    const items: Array<{ type: 'session', data: TimelineSession } | { type: 'gap', startTime: string, duration: number }> = [];
    let lastEndTimeMinutes = 0; // Start of day (00:00)

    sortedSessions.forEach(session => {
        const startMinutes = toMinutes(session.startTime);
        const gap = startMinutes - lastEndTimeMinutes;

        if (gap > 0) {
            items.push({
                type: 'gap',
                startTime: toTimeStr(lastEndTimeMinutes),
                duration: gap
            });
        }

        items.push({ type: 'session', data: session });
        lastEndTimeMinutes = toMinutes(session.endTime);
    });

    // Final gap to end of day (24:00)
    const endOfDayMinutes = 24 * 60;
    if (lastEndTimeMinutes < endOfDayMinutes) {
        items.push({
            type: 'gap',
            startTime: toTimeStr(lastEndTimeMinutes),
            duration: endOfDayMinutes - lastEndTimeMinutes
        });
    }

    return (
        <div className={cn("relative pl-4 space-y-4 pb-20", classNames)}>
            {/* Vertical Line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-border/50" />

            <div className="space-y-2">
                {items.map((item, index) => {
                    if (item.type === 'gap') {
                        // Don't show tiny gaps that are hard to click
                        if (item.duration < 10) return null;

                        return (
                            <div
                                key={`gap-${index}`}
                                className="group flex items-center gap-4 relative pl-[7px] py-4 cursor-pointer hover:bg-muted/10 rounded-lg transition-colors"
                                onClick={() => onAddSession && onAddSession(item.startTime)}
                            >
                                <div className="w-10 flex flex-col items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary group-hover:scale-150 transition-all" />
                                </div>
                                <div className="flex-1 border-t border-dashed border-border/40 group-hover:border-primary/40 relative">
                                    <span className="absolute -top-3 left-4 text-[10px] text-muted-foreground group-hover:text-primary transition-colors bg-background px-1">
                                        + Add at {item.startTime}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    const session = item.data;
                    const isExpanded = expandedSessionId === session.id;
                    const isEditing = editingSessionId === session.id;

                    return (
                        <motion.div
                            key={session.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative z-10"
                        >
                            <div className="flex items-start gap-4">
                                {/* Time Node */}
                                <div className="flex flex-col items-center mt-1 min-w-[50px]">
                                    <span className="text-xs font-mono text-muted-foreground bg-background px-1 z-10">
                                        {session.startTime}
                                    </span>
                                    <div
                                        className={cn(
                                            "w-4 h-4 rounded-full border-2 bg-background z-20 mt-1 transition-colors hover:scale-110 cursor-pointer",
                                            isExpanded ? "scale-110 border-primary bg-primary" : "border-muted-foreground"
                                        )}
                                        style={{ borderColor: session.color, backgroundColor: isExpanded ? session.color : undefined }}
                                        onClick={() => handleExpand(session.id)}
                                    />
                                    {isExpanded && (
                                        <div className="h-full w-0.5 bg-primary/20 absolute top-8 bottom-0" />
                                    )}
                                </div>

                                {/* Content Card */}
                                <div className="flex-1 min-w-0 pb-4">
                                    <Card
                                        className={cn(
                                            "transition-all duration-300 overflow-hidden border-l-4",
                                            isExpanded ? "shadow-md ring-1 ring-primary/10" : "hover:bg-muted/30 cursor-pointer"
                                        )}
                                        style={{ borderLeftColor: session.color || '#3b82f6' }}
                                        onClick={() => !isEditing && handleExpand(session.id)}
                                    >
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-lg leading-tight">
                                                        {session.customName || session.taskName || 'Unnamed Session'}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                        <span className="bg-muted px-2 py-0.5 rounded-full">
                                                            {session.category || 'Uncategorized'}
                                                        </span>
                                                        <span>
                                                            {session.startTime} - {session.endTime}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {/* Actions */}
                                                    {isExpanded && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={(e) => handleEditToggle(e, session.id)}
                                                        >
                                                            {isEditing ? <Check className="w-4 h-4 text-green-500" /> : <Edit2 className="w-4 h-4" />}
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleExpand(session.id); }}>
                                                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Rich Content Area */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-4 border-t border-border/50 pt-4"
                                                    >
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <RichEditor
                                                                initialContent={session.richContent}
                                                                editable={isEditing}
                                                                onChange={(content) => {
                                                                    if (onUpdateSession) {
                                                                        onUpdateSession(session.id, content);
                                                                    }
                                                                }}
                                                                className={isEditing ? "min-h-[200px]" : "pointer-events-none"}
                                                            />
                                                        </div>
                                                        {isEditing && (
                                                            <div className="flex justify-end mt-2">
                                                                <p className="text-xs text-muted-foreground mr-auto self-center">
                                                                    Saving automatically...
                                                                </p>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {sessions.length === 0 && (
                    <div
                        className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl hover:bg-muted/10 cursor-pointer transition-colors"
                        onClick={() => onAddSession && onAddSession("09:00")}
                    >
                        <p>Empty Day</p>
                        <p className="text-sm opacity-70">Click to start planning your day</p>
                    </div>
                )}
            </div>
        </div>
    );
};
