
import { supabase } from './supabase';
import { getDateString } from './db'; // Assuming this exists, or we recreate it

export interface StreakResult {
    achiever: number;
    fighter: number;
}

/**
 * Pure function to calculate new streak based on history and current progress.
 */
export const calculateStreaks = (
    pastTask: { achiever_strike: number; fighter_strike: number; progress: number } | null,
    currentProgress: number,
    minCompletionTarget: number
): StreakResult => {
    // Defaults
    let baseAchiever = 0;
    let baseFighter = 0;

    // 1. Determine Base (History)
    if (pastTask) {
        // Check if the PAST task maintained the streak
        // (This logic assumes pastTask stored its own success correctly)
        const pastMetAchiever = pastTask.progress >= minCompletionTarget;
        // We trust the stored strike count, but only carry it over if the chain was valid
        // For simpler logic: We trust `pastTask.achiever_strike` IS the valid chain at that point.
        // If past task barely missed it, its strike should have been 0.

        // However, if we want to be robust:
        if (pastMetAchiever) {
            baseAchiever = pastTask.achiever_strike;
        }

        if (pastTask.progress > 100) {
            baseFighter = pastTask.fighter_strike;
        }
    }

    // 2. Add Current Day's Contribution
    const bonusAchiever = currentProgress >= minCompletionTarget ? 1 : 0;
    const bonusFighter = currentProgress > 100 ? 1 : 0;

    // 3. Final Sum
    // If today fails, streak resets to 0. It doesn't stay at "Yesterday's Streak".
    const finalAchiever = bonusAchiever > 0 ? baseAchiever + bonusAchiever : 0;
    const finalFighter = bonusFighter > 0 ? baseFighter + bonusFighter : 0;

    return {
        achiever: finalAchiever,
        fighter: finalFighter
    };
};

/**
 * Fetch the task from the immediate previous day.
 * Supports fallback to Name if TemplateID is missing.
 */
export const fetchPreviousTask = async (
    userId: string,
    todayDateString: string,
    templateId?: string | number | null,
    taskName?: string
) => {
    if (!todayDateString) return null;

    // 1. Calculate Yesterday
    const today = new Date(todayDateString);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = getDateString(yesterday);

    let data = null;

    // 2. Try Fetching by Template ID first (most accurate)
    if (templateId) {
        const { data: templateData, error } = await supabase
            .from('tasks')
            .select('achiever_strike, fighter_strike, progress, date')
            .eq('user_id', userId)
            .eq('date', yesterdayString)
            .eq('template_id', templateId)
            .limit(1)
            .maybeSingle();

        if (!error && templateData) {
            data = templateData;
        }
    }

    // 3. Fallback: If no template match (or no templateId), try Name match
    if (!data && taskName) {
        const { data: nameData, error } = await supabase
            .from('tasks')
            .select('achiever_strike, fighter_strike, progress, date')
            .eq('user_id', userId)
            .eq('date', yesterdayString)
            .eq('name', taskName)
            .limit(1)
            .maybeSingle();

        if (!error && nameData) {
            data = nameData;
            // Verify it's not a false positive (different template)? 
            // For now, assume same name = same habit context
        }
    }

    return data;
};

/**
 * Fetch min_completion_target for a template.
 */
export const fetchTemplateTarget = async (templateId: string | number) => {
    const { data } = await supabase
        .from('repeating_tasks')
        .select('min_completion_target')
        .eq('id', templateId)
        .maybeSingle(); // Use maybeSingle to avoid 406 error if ID not found
    return data?.min_completion_target || 60; // Default 60%
};
