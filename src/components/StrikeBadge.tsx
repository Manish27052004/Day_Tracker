import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

interface StrikeBadgeProps {
    taskName: string;
    className?: string;
}

/**
 * Strike Badge Component
 * Displays Achiever 🔥 and Fighter ⚔️ strike counts for template-based tasks
 */
const StrikeBadge = ({ taskName, className }: StrikeBadgeProps) => {
    // Find the template for this task
    const template = useLiveQuery(
        async () => {
            const tmpl = await db.repeatingTasks
                .filter(t => t.name === taskName && t.isActive === true)
                .first();
            return tmpl;
        },
        [taskName]
    );

    if (!template) {
        // Not a template-based task
        return (
            <div className={cn("flex flex-col items-center justify-center", className)}>
                <span className="text-xs text-muted-foreground">—</span>
            </div>
        );
    }

    const { achieverStrike = 0, fighterStrike = 0 } = template;
    const hasFighter = fighterStrike > 0;

    return (
        <div className={cn("flex flex-col gap-1", className)}>
            {/* Achiever Strike */}
            <div className="flex items-center gap-1.5">
                <span className="text-base">🔥</span>
                <span className="text-sm font-semibold text-orange-600">
                    {achieverStrike}
                </span>
            </div>

            {/* Fighter Strike (only show if > 0) */}
            {hasFighter && (
                <div className={cn(
                    "flex items-center gap-1.5",
                    "animate-pulse" // Pulse animation for Fighter
                )}>
                    <span className="text-base">⚔️</span>
                    <span className="text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
                        {fighterStrike}
                    </span>
                </div>
            )}

            {/* Show "0 days" if no strikes */}
            {achieverStrike === 0 && (
                <span className="text-xs text-muted-foreground">0 days</span>
            )}
        </div>
    );
};

export default StrikeBadge;
