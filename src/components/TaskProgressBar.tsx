import { cn } from '@/lib/utils';

interface TaskProgressBarProps {
    progress: number; // 0-100+
    targetTime: number; // in minutes, for display
    className?: string;
    minCompletionTarget?: number; // From template (default 50 if not provided)
}

const TaskProgressBar = ({
    progress,
    targetTime,
    className,
    minCompletionTarget = 50 // Default to 50% if no template
}: TaskProgressBarProps) => {
    // Determine color based on progress and minimum target
    const getColor = () => {
        if (progress < minCompletionTarget) {
            // Below minimum → Red (Failed)
            return 'bg-danger';
        }
        if (progress >= minCompletionTarget && progress <= 100) {
            // Achiever range (met minimum but not Fighter) → Blue
            return 'bg-primary';
        }
        // Fighter tier (> 100%) → Gold gradient
        return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    };

    const getTextColor = () => {
        if (progress < minCompletionTarget) {
            return 'text-danger';
        }
        if (progress >= minCompletionTarget && progress <= 100) {
            return 'text-primary';
        }
        // Fighter tier
        return 'text-yellow-600 font-bold';
    };

    // Add glow effect for Fighter tier
    const isFighter = progress > 100;
    const barClassName = cn(
        "h-full transition-all duration-300 ease-out",
        getColor(),
        isFighter && "shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse"
    );

    // Cap display at 100% for the bar visual
    const displayProgress = Math.min(progress, 100);

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* Progress Bar */}
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={barClassName}
                    style={{ width: `${displayProgress}%` }}
                />
            </div>

            {/* Percentage Text with Fighter icon */}
            <span className={cn(
                "text-xs font-semibold text-mono w-12 text-right flex items-center justify-end gap-0.5",
                getTextColor()
            )}>
                {isFighter && <span className="text-yellow-500">⚔️</span>}
                {progress}%
            </span>
        </div>
    );
};

export default TaskProgressBar;
