
import { supabase } from './supabase';

/**
 * Recalculates the entire streak history for a given task (by templateId or name).
 * This fixes gaps where past days might have been saved as 0 incorrectly.
 */
export const recalculateStreakChain = async (userId: string, templateId?: string | number | null, taskName?: string) => {
    if (!userId) return;
    if (!templateId && !taskName) return;

    console.log(`♻️ Starting Full Streak Recalculation for: ${taskName || templateId}`);

    // 1. Fetch ALL tasks for this chain, ordered by date OLD -> NEW
    let query = supabase
        .from('tasks')
        .select('id, date, progress, achiever_strike, fighter_strike, name, template_id')
        .eq('user_id', userId)
        .order('date', { ascending: true });

    if (templateId) {
        query = query.eq('template_id', templateId);
    } else if (taskName) {
        query = query.eq('name', taskName);
    }

    const { data: tasks, error } = await query;

    if (error || !tasks || tasks.length === 0) {
        console.error('Failed to fetch task chain:', error);
        return;
    }

    // 2. Fetch Template Settings (if applicable) for min target
    let minPercentage = 60;
    if (templateId) {
        const { data: templateData } = await supabase
            .from('repeating_tasks')
            .select('min_completion_target')
            .eq('id', templateId)
            .single();
        if (templateData?.min_completion_target) {
            minPercentage = templateData.min_completion_target;
        }
    }

    // 3. Iterate and Recalculate
    let currentAchiever = 0;
    let currentFighter = 0;
    let updates = [];

    // We need to handle gaps in dates? 
    // Streak logic usually breaks on missing days.
    // Standard logic: 
    // If (Task Date == Previous Task Date + 1 Day) -> Continue Streak
    // Else -> Reset to 0 (unless we implement "skip days" logic, but simplest is strictly consecutive).

    // Actually, standard logic often implementation is:
    // "If yesterday had a task AND it met criteria, then Today = Yesterday + 1".
    // If yesterday is missing, Streak = 1 (start new).

    let lastDate: Date | null = null;

    for (const task of tasks) {
        // Parse date string (YYYY-MM-DD) as UTC midnight to avoid timezone shifts
        // "2025-12-14" -> Date(2025-12-14T00:00:00.000Z)
        const taskDate = new Date(task.date);
        const progress = task.progress || 0;

        // Check gap
        let isConsecutive = false;
        if (lastDate) {
            // Difference in milliseconds
            const diffTime = taskDate.getTime() - lastDate.getTime();
            // Difference in days (Round is better than Ceil for 24h jumps)
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            // Allow exact 1 day difference
            isConsecutive = diffDays === 1;
        }

        // Logic Change:
        // Even if NOT consecutive, if this is the FIRST item in the loop, we start fresh.
        // If we broke streak, we reset.
        if (lastDate && !isConsecutive) {
            currentAchiever = 0;
            currentFighter = 0;
        }

        // Calculate Bonus for this day
        const bonusAchiever = progress >= minPercentage ? 1 : 0;
        const bonusFighter = progress > 100 ? 1 : 0;

        // Update Streak
        // Standard Rules:
        // If today Met Target -> Streak = Current + 1
        // If today Failed Target -> Streak = 0
        if (bonusAchiever > 0) {
            currentAchiever += bonusAchiever;
        } else {
            currentAchiever = 0;
        }

        if (bonusFighter > 0) {
            currentFighter += bonusFighter;
        } else {
            currentFighter = 0;
        }

        // Push update...
        if (task.achiever_strike !== currentAchiever || task.fighter_strike !== currentFighter) {
            updates.push({
                id: task.id,
                achiever_strike: currentAchiever,
                fighter_strike: currentFighter,
                updated_at: new Date().toISOString()
            });
        }

        lastDate = taskDate;
    }

    console.log(`📝 Correcting ${updates.length} tasks in chain...`);

    // 4. Batch Update
    // Supabase doesn't support massive bulk update easily without rpc or many requests.
    // We'll do parallel requests for now (safe enough for <100 tasks).
    // Or upsert.

    if (updates.length > 0) {
        const { error: updateError } = await supabase
            .from('tasks')
            .upsert(updates);

        if (updateError) console.error('Error saving corrected streaks:', updateError);
        else console.log('✅ Streak Correction Complete!');
    } else {
        console.log('✅ No corrections needed.');
    }
};
