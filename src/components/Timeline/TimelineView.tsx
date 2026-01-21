import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RichEditor } from './RichEditor';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Edit2, Check, Info, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { TimelineSlice } from '@/utils/chartLogic';
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

    // Zoom State: 1 = 100% width, 2 = 200%, etc.
    const [zoomLevel, setZoomLevel] = useState(1);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Timeline Configuration
    const TOTAL_MINUTES = 24 * 60; // 1440 minutes
    const MIN_WIDTH_PX = 1000; // Base width at 1x zoom

    // Grouping Logic: Group Slices by "Name" (which corresponds to ViewMode logic)
    const groupedSlices = useMemo(() => {
        const groups: Record<string, TimelineSlice[]> = {};

        slices.forEach(slice => {
            const key = slice.name;
            if (!groups[key]) groups[key] = [];
            groups[key].push(slice);
        });

        // Sort keys alphabetically, but put Sleep/Untracked at end
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (a === 'Sleep') return 1;
            if (b === 'Sleep') return -1;
            if (a === 'Untracked') return 1;
            if (b === 'Untracked') return -1;
            return a.localeCompare(b);
        });

        return sortedKeys.map(key => ({
            name: key,
            slices: groups[key]
        }));
    }, [slices]);


    // Helper: Convert Date to minutes from start of day (00:00)
    const getMinutesFromStart = (date: Date) => {
        return date.getHours() * 60 + date.getMinutes();
    };

    // Helper: Calculate position and width as percentage
    const getPositionStyle = (start: Date, end: Date) => {
        const startMins = getMinutesFromStart(start);
        const endMins = getMinutesFromStart(end);

        let duration = endMins - startMins;
        if (duration < 0) duration += TOTAL_MINUTES; // fallback for wrapping

        const left = (startMins / TOTAL_MINUTES) * 100;
        const width = (duration / TOTAL_MINUTES) * 100;

        return { left: `${left}%`, width: `${width}%` };
    };

    // Generate Hourly Markers (0, 1, 2 ... 23)
    const hours = Array.from({ length: 25 }, (_, i) => i);

    const handleExpand = (slice: TimelineSlice, globalIndex: number) => {
        if (expandedSliceIndex === globalIndex) {
            setExpandedSliceIndex(null);
            setEditingSliceIndex(null);
        } else {
            setExpandedSliceIndex(globalIndex);
        }
    };

    const handleEditToggle = (e: React.MouseEvent, globalIndex: number) => {
        e.stopPropagation();
        if (editingSliceIndex === globalIndex) {
            setEditingSliceIndex(null);
        } else {
            setEditingSliceIndex(globalIndex);
            setExpandedSliceIndex(globalIndex);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
    const handleResetZoom = () => setZoomLevel(1);

    return (
        <div className={cn("flex flex-col h-[600px] select-none bg-background/50 rounded-xl border border-border overflow-hidden", classNames)}>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-border/50 bg-card/30">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 1} title="Zoom Out" className="h-8 w-8 p-0">
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-mono w-10 text-center text-muted-foreground">{Math.round(zoomLevel * 100)}%</span>
                    <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 4} title="Zoom In" className="h-8 w-8 p-0">
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleResetZoom} disabled={zoomLevel === 1} title="Reset Zoom" className="h-8 w-8 p-0">
                        <RotateCcw className="w-3 h-3" />
                    </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                    Shift+Scroll to pan horizontally
                </div>
            </div>

            {/* RESTART LAYOUT: CSS Grid for 2D Scrolling */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="min-w-full inline-block">
                    <div className="flex">
                        {/* Column 1: Sidebar (Sticky Left) */}
                        <div className="sticky left-0 z-30 w-[180px] shrink-0 bg-background border-r border-border/50 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                            {/* Corner */}
                            <div className="h-9 border-b border-border/50 bg-muted/30 flex items-center px-4">
                                <span className="text-xs font-bold text-muted-foreground">GROUP</span>
                            </div>
                            {/* Row Labels */}
                            <div className="flex flex-col pb-4">
                                {groupedSlices.map((group) => (
                                    <div key={group.name} className="h-12 flex items-center px-4 border-b border-border/10 last:border-0 truncate">
                                        <span className="text-xs font-medium truncate" title={group.name}>{group.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Timeline Track (Scrolls Horizontally) */}
                        <div className="flex-1 overflow-x-hidden" style={{ width: `${zoomLevel * 100}%`, minWidth: MIN_WIDTH_PX }}>
                            {/* Sticky Header (Time Axis) */}
                            <div className="sticky top-0 z-20 h-9 bg-muted/30 border-b border-border/50 flex relative">
                                {hours.map((hour) => (
                                    <div key={hour} className="flex-1 border-r border-border/10 relative h-full">
                                        <span className="absolute top-2 left-1 text-[10px] text-muted-foreground font-mono">
                                            {hour}:00
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Timeline Rows */}
                            <div className="flex flex-col pb-4 relative">
                                {/* Grid Lines Background */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {hours.map((hour) => (
                                        <div key={hour} className="flex-1 border-r border-border/5 relative h-full" />
                                    ))}
                                </div>

                                {groupedSlices.map((group) => (
                                    <div key={group.name} className="h-12 border-b border-border/10 last:border-0 relative w-full">

                                        <TooltipProvider>
                                            {group.slices.map((slice, i) => {
                                                const globalIndex = slices.findIndex(s => s === slice);

                                                const isSelected = expandedSliceIndex === globalIndex;
                                                const style = getPositionStyle(slice.start, slice.end);
                                                const isUntracked = slice.type === 'untracked';
                                                const isSleep = slice.type === 'sleep';

                                                return (
                                                    <Tooltip key={i}>
                                                        <TooltipTrigger asChild>
                                                            <motion.div
                                                                className={cn(
                                                                    "absolute top-2 bottom-2 rounded-sm border text-[10px] font-medium flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:bg-opacity-90 hover:z-20 hover:shadow-md",
                                                                    isSelected ? "z-30 ring-1 ring-primary ring-offset-1" : "z-10",
                                                                    isUntracked ? "bg-muted/5 border-dashed border-border/20 text-muted-foreground/30 hover:bg-muted/10 opacity-50" : "text-white shadow-sm border-white/5"
                                                                )}
                                                                style={{
                                                                    left: style.left,
                                                                    width: style.width,
                                                                    minWidth: '2px',
                                                                    backgroundColor: isUntracked ? undefined : slice.fill,
                                                                    opacity: isSleep ? 0.3 : 1
                                                                }}
                                                                onClick={() => !isUntracked && handleExpand(slice, globalIndex)}
                                                                initial={{ opacity: 0, scaleX: 0 }}
                                                                animate={{ opacity: isSleep ? 0.3 : 1, scaleX: 1 }}
                                                                transition={{ delay: i * 0.01, duration: 0.3 }}
                                                            >
                                                                <div className="truncate px-1 text-center w-full">
                                                                    {zoomLevel > 1.5 && parseFloat(style.width) * zoomLevel > 30 && (
                                                                        <span>{slice.name}</span>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-[#191919] border-border text-white">
                                                            <div className="text-center">
                                                                <p className="font-bold">{slice.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatTime(slice.start)} - {formatTime(slice.end)}
                                                                </p>
                                                                <p className="text-xs italic text-muted-foreground/70">{slice.category}</p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                );
                                            })}
                                        </TooltipProvider>

                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail / Description Bottom Panel (Same as before) */}
            <AnimatePresence mode="wait">
                {expandedSliceIndex !== null && slices[expandedSliceIndex] && (
                    <motion.div
                        key="details-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-card border-t border-border p-4 shadow-xl z-40 shrink-0"
                    >
                        {(() => {
                            const slice = slices[expandedSliceIndex];
                            const isEditing = editingSliceIndex === expandedSliceIndex;
                            const isSession = slice.type === 'session';

                            return (
                                <div className="space-y-4 max-w-4xl mx-auto">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full shadow-sm"
                                                style={{ backgroundColor: slice.fill }}
                                            />
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    {slice.name}
                                                    {slice.type === 'sleep' && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Sleep</span>}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    <span className="font-mono bg-muted/50 px-1.5 rounded">{formatTime(slice.start)} - {formatTime(slice.end)}</span>
                                                    <span>•</span>
                                                    <span>{slice.category}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isSession && slice.originalLog?.taskId && (
                                                <Button
                                                    variant={isEditing ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={(e) => handleEditToggle(e, expandedSliceIndex)}
                                                    className="gap-2 h-8"
                                                >
                                                    {isEditing ? <Check className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                                                    {isEditing ? "Done" : "Edit Notes"}
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => setExpandedSliceIndex(null)} className="h-8 w-8 p-0">
                                                <Minimize2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Description / Rich Content */}
                                    {isSession && (
                                        <div className={cn("transition-all", isEditing ? "mt-2" : "mt-0")}>
                                            <div className={cn("rounded-md bg-muted/10", isEditing ? "ring-1 ring-primary/20 bg-background" : "")}>
                                                <RichEditor
                                                    initialContent={slice.originalLog?.richContent}
                                                    editable={isEditing}
                                                    onChange={(content) => {
                                                        if (onUpdateSession && slice.originalLog?.originalSessionId) {
                                                            onUpdateSession(slice.originalLog.originalSessionId, content);
                                                        }
                                                    }}
                                                    className={isEditing ? "min-h-[100px] p-3 text-sm" : "py-2 text-sm text-foreground/80 pointer-events-none"}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
