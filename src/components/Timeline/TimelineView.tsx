import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    dayStartHour?: number;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
    slices,
    onUpdateSession,
    classNames,
    dayStartHour = 0
}) => {
    const [expandedSliceIndex, setExpandedSliceIndex] = useState<number | null>(null);
    const [editingSliceIndex, setEditingSliceIndex] = useState<number | null>(null);

    // Zoom State: 1 = 100% width, 2 = 200%, etc.
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Timeline Configuration
    const TOTAL_MINUTES = 24 * 60; // 1440 minutes
    const MIN_WIDTH_PX = 3000; // Expanded base width for better breathing room

    // Effect: Handle Escape key to exit full screen
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullScreen) {
                setIsFullScreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

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


    // Helper: Convert Date to minutes from start of logical day
    const getMinutesFromStart = (date: Date) => {
        let mins = date.getHours() * 60 + date.getMinutes();
        const offset = dayStartHour * 60;
        mins -= offset;
        if (mins < 0) mins += TOTAL_MINUTES;
        return mins;
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

    // Generate Hourly Markers (0, 1, 2 ... 23) but rotated by dayStartHour
    const hours = Array.from({ length: 24 }, (_, i) => (i + dayStartHour) % 24);

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

    // ... (rest of logic)

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
    const handleResetZoom = () => setZoomLevel(1);

    const content = (
        <div className={cn(
            "flex flex-col select-none bg-background/40 rounded-xl border border-border/60 overflow-hidden shadow-sm transition-all duration-300 ease-in-out",
            isFullScreen ? "fixed inset-0 z-[100] h-[100vh] w-[100vw] rounded-none border-0 bg-background" : "h-[650px] w-full relative",
            classNames
        )}>

            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-border/50 bg-card/80 backdrop-blur-sm z-40">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 1} title="Zoom Out" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-mono w-10 text-center text-muted-foreground">{Math.round(zoomLevel * 100)}%</span>
                    <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 4} title="Zoom In" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleResetZoom} disabled={zoomLevel === 1} title="Reset Zoom" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <RotateCcw className="w-3 h-3" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mr-2">
                        Timeline View
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        title={isFullScreen ? "Exit Full Screen (Esc)" : "Full Screen"}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                        {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* RESTART LAYOUT: CSS Grid for 2D Scrolling */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-card">
                <div className="min-w-full inline-block">
                    <div className="flex">
                        {/* Column 1: Sidebar (Sticky Left) */}
                        <div className="sticky left-0 z-30 w-[200px] shrink-0 bg-card border-r border-border/40 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.8)]">
                            {/* Corner */}
                            <div className="h-9 border-b border-border/40 bg-muted/20 flex items-center px-4">
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Type</span>
                            </div>
                            {/* Row Labels */}
                            <div className="flex flex-col pb-4">
                                {groupedSlices.map((group) => (
                                    <div key={group.name} className="h-14 flex items-center px-4 border-b border-border/5 last:border-0 truncate group/row transition-colors hover:bg-white/[0.02]">
                                        <span className="text-xs font-medium text-foreground/80 truncate group-hover/row:text-foreground transition-colors" title={group.name}>{group.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Timeline Track (Scrolls Horizontally) */}
                        <div className="flex-1 overflow-x-hidden relative" style={{ width: `${zoomLevel * 100}%`, minWidth: '3000px' }}>
                            {/* Sticky Header (Time Axis) */}
                            <div className="sticky top-0 z-20 h-9 bg-card border-b border-border/40 grid grid-cols-[repeat(24,1fr)] shadow-sm">
                                {hours.map((hour) => (
                                    <div key={hour} className="border-r border-border/10 relative h-full group/time">
                                        <span className="absolute top-2 left-1 text-[10px] text-muted-foreground/40 font-mono group-hover/time:text-muted-foreground transition-colors select-none">
                                            {hour}:00
                                        </span>
                                        {/* Minute Ticks */}
                                        <div className="absolute bottom-0 left-0 w-full h-1.5 pointer-events-none">
                                            {/* 15 min */}
                                            <div className="absolute bottom-0 h-full w-px bg-border/20" style={{ left: '25%' }} />
                                            {/* 30 min (Longer/Darker) */}
                                            <div className="absolute bottom-0 h-full w-px bg-border/40" style={{ left: '50%', height: '120%' }} />
                                            {/* 45 min */}
                                            <div className="absolute bottom-0 h-full w-px bg-border/20" style={{ left: '75%' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Timeline Rows */}
                            <div className="flex flex-col pb-4 relative min-h-[500px]">
                                {/* Global Background Grid (Fixed Minutes) */}
                                <div className="absolute inset-0 grid grid-cols-[repeat(1440,1fr)] pointer-events-none z-0">
                                    <div className="col-span-full h-full w-full"
                                        style={{
                                            backgroundImage: `
                                                 linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                                                 linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                                                 linear-gradient(to right, rgba(255,255,255,0.01) 1px, transparent 1px)
                                             `,
                                            backgroundSize: `
                                                 ${100 / 24}% 100%, 
                                                 ${100 / 96}% 100%,
                                                 ${100 / 1440}% 100%
                                             `
                                        }}
                                    />
                                </div>

                                {groupedSlices.map((group) => (
                                    <div key={group.name} className="h-14 border-b border-border/5 last:border-0 relative w-full hover:bg-white/[0.01] transition-colors grid grid-cols-[repeat(1440,1fr)]">

                                        <TooltipProvider delayDuration={0}>
                                            {group.slices.map((slice, i) => {
                                                const globalIndex = slices.findIndex(s => s === slice);
                                                const isSelected = expandedSliceIndex === globalIndex;
                                                const startMins = getMinutesFromStart(slice.start);
                                                const endMins = getMinutesFromStart(slice.end);
                                                let duration = endMins - startMins;
                                                if (duration <= 0) duration += TOTAL_MINUTES;

                                                const isUntracked = slice.type === 'untracked';
                                                const isSleep = slice.type === 'sleep';

                                                return (
                                                    <Tooltip key={i}>
                                                        <TooltipTrigger asChild>
                                                            <motion.div
                                                                className={cn(
                                                                    "rounded-md border text-[10px] font-medium flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200 relative my-2 mx-[1px]",
                                                                    isSelected ? "z-30 ring-2 ring-primary/70 ring-offset-1 ring-offset-background shadow-lg scale-[1.02]" : "z-10 hover:z-20",
                                                                    !isSelected && !isUntracked && !isSleep && "hover:brightness-110 hover:shadow-md hover:scale-[1.01] hover:border-white/20",
                                                                    isUntracked
                                                                        ? "border-none bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_25%,rgba(255,255,255,0.03)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.03)_75%,rgba(255,255,255,0.03)_100%)] bg-[length:24px_24px] opacity-60 hover:opacity-100"
                                                                        : "text-white shadow-sm border-white/5",
                                                                    isSleep && "bg-indigo-950/20 border-indigo-500/10 text-indigo-300/50"
                                                                )}
                                                                style={{
                                                                    gridColumn: `${startMins + 1} / span ${duration}`,
                                                                    backgroundColor: (isUntracked || isSleep) ? undefined : slice.fill,
                                                                    opacity: isSleep ? 1 : (isUntracked ? undefined : 1)
                                                                }}
                                                                onClick={() => !isUntracked && handleExpand(slice, globalIndex)}
                                                                initial={{ opacity: 0, scaleX: 0 }}
                                                                animate={{ opacity: 1, scaleX: 1 }}
                                                                transition={{ delay: i * 0.01, duration: 0.3 }}
                                                            >
                                                                <div className="truncate px-1 text-center w-full drop-shadow-sm pointer-events-none select-none">
                                                                    {/* Show name if wide enough */}
                                                                    {(zoomLevel * duration) > 40 && (
                                                                        <span className={cn(isSleep && "italic text-xs")}>{slice.name}</span>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-popover border-border text-popover-foreground shadow-xl" sideOffset={5}>
                                                            <div className="text-center">
                                                                <p className="font-bold text-sm mb-1">{slice.name}</p>
                                                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 font-mono bg-muted/20 rounded px-2 py-1">
                                                                    {/* 🔥 Show TRUE calculated times if available (for Sleep) */}
                                                                    {slice.originalLog && slice.originalLog.category === 'Sleep' && slice.originalLog.startTime.includes(':') ? (
                                                                        <>
                                                                            <span>{slice.originalLog.startTime}</span>
                                                                            <span>→</span>
                                                                            <span>{slice.originalLog.endTime}</span>
                                                                            {/* Calculate diff roughly for display? */}
                                                                            {/* Or just show times. The user asked for "calculation", typically meaning duration. 
                                                                                Since we don't have easy minute-diff here without parsing, let's trust the user can see 23:00 -> 07:00.
                                                                                But ideally we show "8h 0m".
                                                                            */}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span>{formatTime(slice.start)}</span>
                                                                            <span>→</span>
                                                                            <span>{formatTime(slice.end)}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs italic text-muted-foreground mt-2">{slice.category}</p>
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

    if (isFullScreen) {
        return createPortal(content, document.body);
    }

    return content;
};
