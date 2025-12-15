import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getDateString } from '@/lib/db';
import { cn } from '@/lib/utils';

interface StrikeBadgeProps {
    taskName: string;
    taskId?: string;
    currentDate?: Date;
    currentProgress?: number; // Real-time progress %
    targetTime?: number;
    templateId?: string; // 🔥 KEY: Check this to show/hide icons
    className?: string;
}

/**
 * Strike Badge Component (Cloud-Only)
 * 
 * KEY LOGIC:
 * - If NO templateId → Show "—"
 * - If YES templateId → ALWAYS show 🔥 and ⚔️ (even if 0)
 */
const StrikeBadge = ({
    taskName,
    taskId,
    currentDate = new Date(),
    currentProgress = 0,
    targetTime = 60,
    templateId, // 🔥 NEW: Passed from PlanningTable
    className
}: StrikeBadgeProps) => {
    const { user } = useAuth();
    const [historicalAchiever, setHistoricalAchiever] = useState(0);
    const [historicalFighter, setHistoricalFighter] = useState(0);
    const [minCompletionTarget, setMinCompletionTarget] = useState(60);
    const [hasTemplate, setHasTemplate] = useState(false);

    useEffect(() => {
        const fetchStreaks = async () => {
            if (!user || !taskId) {
                console.log('🔍 StrikeBadge: Missing user or taskId', { user: !!user, taskId });
                return;
            }

            // Fetch historical streak data
            const { data: task, error } = await supabase
                .from('tasks')
                .select('achiever_strike, fighter_strike, template_id')
                .eq('id', taskId)
                .eq('user_id', user.id)
                .single();

            console.log('🔍 StrikeBadge: Fetched task', {
                taskId,
                task,
                passedTemplateId: templateId,
                dbTemplateId: task?.template_id
            });

            if (error || !task) {
                console.log('🔍 StrikeBadge: No task found', error);
                return;
            }

            // Store historical values
            const historicalAchieverCount = task.achiever_strike || 0;
            const historicalFighterCount = task.fighter_strike || 0;

            setHistoricalAchiever(historicalAchieverCount);
            setHistoricalFighter(historicalFighterCount);

            // Check if template exists (by templateId OR by name lookup)
            const hasTemplateId = !!(templateId || task.template_id);

            if (!hasTemplateId) {
                // Try name lookup as fallback
                const { data: template } = await supabase
                    .from('repeating_tasks')
                    .select('id, min_completion_target')
                    .eq('name', taskName)
                    .eq('is_active', true)
                    .single();

                if (template) {
                    setHasTemplate(true);
                    setMinCompletionTarget(template.min_completion_target || 60);
                    console.log('✅ StrikeBadge: Found template by name', { minTarget: template.min_completion_target });
                } else {
                    setHasTemplate(false);
                    console.log('❌ StrikeBadge: Not a template task');
                }
            } else {
                // Has template ID - fetch min target
                setHasTemplate(true);

                const { data: template } = await supabase
                    .from('repeating_tasks')
                    .select('min_completion_target')
                    .eq('id', templateId || task.template_id)
                    .single();

                setMinCompletionTarget(template?.min_completion_target || 60);
                console.log('✅ StrikeBadge: Template task detected', {
                    templateId: templateId || task.template_id,
                    minTarget: template?.min_completion_target
                });
            }
        };

        fetchStreaks();
    }, [taskId, taskName, templateId, user]);

    // 🔥 Calculate TODAY's achievement in real-time
    const todayAchiever = currentProgress >= minCompletionTarget ? 1 : 0;
    const todayFighter = currentProgress > 100 ? 1 : 0;

    // Total = Historical + Today
    const totalAchiever = historicalAchiever + todayAchiever;
    const totalFighter = historicalFighter + todayFighter;

    console.log('🔥 StrikeBadge: Render decision', {
        hasTemplate,
        templateId,
        currentProgress,
        minCompletionTarget,
        todayAchiever,
        todayFighter,
        historicalAchiever,
        historicalFighter,
        totalAchiever,
        totalFighter
    });

    // 🔥 KEY FIX: Show "—" ONLY if NOT a template task
    if (!hasTemplate) {
        console.log('❌ StrikeBadge: Showing dash (not a template)');
        return (
            <div className={cn("flex flex-col items-center justify-center", className)}>
                <span className="text-xs text-muted-foreground">—</span>
            </div>
        );
    }

    // 🔥 KEY FIX: If it IS a template, ALWAYS show icons (even if counts are 0)
    console.log('✅ StrikeBadge: Showing icons (template task)');

    return (
        <div className={cn("flex flex-col gap-1", className)}>
            {/* Achiever Strike - ALWAYS show for template tasks */}
            <div className="flex items-center gap-1.5">
                <span className="text-base">🔥</span>
                <span className={cn(
                    "text-sm font-semibold",
                    todayAchiever === 1 ? "text-orange-600" : "text-orange-400"
                )}>
                    {totalAchiever}
                </span>
            </div>

            {/* Fighter Strike - ALWAYS show for template tasks */}
            <div className={cn(
                "flex items-center gap-1.5",
                todayFighter === 1 && "animate-pulse" // Pulse if fighting TODAY
            )}>
                <span className="text-base">⚔️</span>
                <span className={cn(
                    "text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent",
                    todayFighter === 1 && "animate-pulse"
                )}>
                    {totalFighter}
                </span>
            </div>
        </div>
    );
};

export default StrikeBadge;
