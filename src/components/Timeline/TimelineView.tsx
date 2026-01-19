
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RichEditor } from './RichEditor';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Edit2, Check, Moon, AlertCircle, Info } from 'lucide-react';
import { TimelineSlice } from '@/utils/chartLogic';
import { differenceInMinutes } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface TimelineViewProps {
    slices: TimelineSlice[];
    onUpdateSession?: (id: number, content: string) => Promise<void>;
    classNames?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
    slices,
    onUpdateSession,
    classNames
}) => {
    const [expandedSliceIndex, setExpandedSliceIndex] = useState<number | null>(null);
    const [editingSliceIndex, setEditingSliceIndex] = useState<number | null>(null);

    // Timeline Configuration
    const TOTAL_MINUTES = 24 * 60; // 1440 minutes
    const START_HOUR = 0; // 00:00

    // Helper: Convert Date to minutes from start of day (00:00)
    const getMinutesFromStart = (date: Date) => {
        return date.getHours() * 60 + date.getMinutes();
    };

    // Helper: Calculate position and width as percentage
    const getPositionStyle = (start: Date, end: Date) => {
        const startMins = getMinutesFromStart(start);
        const endMins = getMinutesFromStart(end);

        // Handle wrapping (if end < start, it means next day, but for this view we clip or assume linear for now)
        // Since slicing logic handles wrapping by creating separate segments (00:00), simple diff works
        let duration = endMins - startMins;
        if (duration < 0) duration += TOTAL_MINUTES; // fallback

        const left = (startMins / TOTAL_MINUTES) * 100;
        const width = (duration / TOTAL_MINUTES) * 100;

        return { left: `${left}%`, width: `${width}%` };
    };

    // Generate Hourly Markers (0, 1, 2 ... 23)
    const hours = Array.from({ length: 25 }, (_, i) => i);

    const handleExpand = (index: number) => {
        if (expandedSliceIndex === index) {
            setExpandedSliceIndex(null);
            setEditingSliceIndex(null);
        } else {
            setExpandedSliceIndex(index);
        }
    };

    const handleEditToggle = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (editingSliceIndex === index) {
            setEditingSliceIndex(null);
        } else {
            setEditingSliceIndex(index);
            setExpandedSliceIndex(index);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div className={cn("space-y-6 select-none", classNames)}>

            {/* Main Horizontal Timeline Container */}
            <div className="relative h-32 w-full bg-muted/20 rounded-xl border border-border/50 overflow-hidden shadow-inner">

                {/* 1. Grid Lines & Hour Labels */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {hours.map((hour) => (
                        <div key={hour} className="flex-1 border-r border-border/10 relative h-full">
                            <span className="absolute bottom-1 left-1 text-[10px] text-muted-foreground/50 font-mono">
                                {hour}:00
                            </span>
                        </div>
                    ))}
                </div>

                {/* 2. Timeline Bars */}
                <div className="absolute top-2 bottom-6 left-0 right-0">
                    <TooltipProvider>
                        {slices.map((slice, index) => {
                            const isSelected = expandedSliceIndex === index;
                            const style = getPositionStyle(slice.start, slice.end);
                            const isUntracked = slice.type === 'untracked';
                            const isSleep = slice.type === 'sleep';

                            return (
                                <Tooltip key={`${index}-bar`}>
                                    <TooltipTrigger asChild>
                                        <motion.div
                                            className={cn(
                                                "absolute h-full rounded-md border text-xs font-medium flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:bg-opacity-90 hover:z-20 hover:shadow-md",
                                                isSelected ? "z-30 ring-2 ring-primary ring-offset-2" : "z-10",
                                                isUntracked ? "bg-muted/10 border-dashed border-muted text-muted-foreground hover:bg-muted/20" : "text-white shadow-sm border-white/10"
                                            )}
                                            style={{
                                                left: style.left,
                                                width: style.width,
                                                backgroundColor: isUntracked ? undefined : slice.fill,
                                                opacity: isSleep ? 0.7 : 1
                                            }}
                                            onClick={() => !isUntracked && handleExpand(index)}
                                            initial={{ opacity: 0, scaleX: 0 }}
                                            animate={{ opacity: isSleep ? 0.7 : 1, scaleX: 1 }}
                                            transition={{ delay: index * 0.02, duration: 0.3 }}
                                        >
                                            {/* Label inside bar if wide enough */}
                                            <div className="truncate px-1 text-center w-full">
                                                {parseFloat(style.width) > 4 && (
                                                    <span>{slice.name}</span>
                                                )}
                                            </div>
                                        </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="text-center">
                                            <p className="font-bold">{slice.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatTime(slice.start)} - {formatTime(slice.end)}
                                            </p>
                                            <p className="text-xs italic">{slice.category}</p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </div>
            </div>

            {/* 3. Detail / Description Panel (Shows when clicked) */}
            <AnimatePresence mode="wait">
                {expandedSliceIndex !== null && (
                    <motion.div
                        key="details-panel"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-card border border-border rounded-xl p-6 shadow-sm"
                    >
                        {(() => {
                            const slice = slices[expandedSliceIndex];
                            const isEditing = editingSliceIndex === expandedSliceIndex;
                            const isSession = slice.type === 'session';

                            return (
                                <div className="space-y-4">
                                    {/* Detailed Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full shadow-sm"
                                                style={{ backgroundColor: slice.fill }}
                                            />
                                            <div>
                                                <h3 className="text-xl font-bold">{slice.name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <span className="font-mono bg-muted px-1.5 rounded">{formatTime(slice.start)} - {formatTime(slice.end)}</span>
                                                    <span>•</span>
                                                    <span>{slice.category}</span>
                                                    {slice.type === 'sleep' && <span>• 😴 Sleep</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {isSession && slice.originalLog?.taskId && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant={isEditing ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={(e) => handleEditToggle(e, expandedSliceIndex)}
                                                    className="gap-2"
                                                >
                                                    {isEditing ? (
                                                        <>
                                                            <Check className="w-3 h-3" /> Done
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Edit2 className="w-3 h-3" /> Edit Notes
                                                        </>
                                                    )}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setExpandedSliceIndex(null)}>
                                                    <Minimize2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                        {!isSession && (
                                            <Button variant="ghost" size="icon" onClick={() => setExpandedSliceIndex(null)}>
                                                <Minimize2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Description / Rich Content */}
                                    {isSession && (
                                        <div className="mt-4 pt-4 border-t border-border/50">
                                            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
                                                <Info className="w-3 h-3" /> Description & Notes
                                            </h4>

                                            {/* Editable Rich Content */}
                                            <div className={cn("rounded-md", isEditing ? "ring-1 ring-primary/20" : "")}>
                                                <RichEditor
                                                    initialContent={slice.originalLog?.richContent}
                                                    editable={isEditing}
                                                    onChange={(content) => {
                                                        if (onUpdateSession && slice.originalLog?.originalSessionId) {
                                                            onUpdateSession(slice.originalLog.originalSessionId, content);
                                                        }
                                                    }}
                                                    className={isEditing ? "min-h-[150px] p-2" : "py-2 pointer-events-none"}
                                                />
                                            </div>

                                            {isEditing && (
                                                <p className="text-xs text-muted-foreground mt-2 text-right">
                                                    Changes saved automatically
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend / Instructions when nothing selected */}
            {expandedSliceIndex === null && (
                <div className="text-center text-sm text-muted-foreground py-4 opacity-50">
                    Click on a timeline block to view details and edit notes.
                </div>
            )}
        </div>
    );
};

