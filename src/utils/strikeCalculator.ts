import { db, type RepeatingTask } from '@/lib/db';

/**
 * Strike Calculation Utility
 * Handles Achiever and Fighter strike counting for template-based tasks
 */

interface StrikeUpdate {
    achieverStrike: number;
    fighterStrike: number;
    lastCompletedDate: string;
}

/**
 * Check if two dates are consecutive (nextDate = prevDate + 1 day)
 */
function isNextDay(prevDateStr: string | undefined, currentDateStr: string): boolean {
    if (!prevDateStr) return false;

    const prevDate = new Date(prevDateStr);
    const currentDate = new Date(currentDateStr);

    // Add 1 day to previous date
    const nextDay = new Date(prevDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Compare dates (ignoring time)
    return (
        nextDay.getFullYear() === currentDate.getFullYear() &&
        nextDay.getMonth() === currentDate.getMonth() &&
        nextDay.getDate() === currentDate.getDate()
    );
}

/**
 * Calculate and update template strikes based on task completion
 * 
 * Rules:
 * - Achiever Strike: Progress >= minCompletionTarget (consecutive days)
 * - Fighter Strike: Progress > 100% (consecutive days)
 * - Both reset to 0 if progress < minCompletionTarget
 * 
 * @param template - The repeating task template
 * @param todayDateStr - ISO date string (YYYY-MM-DD)
 * @param taskProgress - Task completion percentage (0-∞)
 * @returns Updated strike counts and last completed date
 */
export async function updateTemplateStrikes(
    template: RepeatingTask,
    todayDateStr: string,
    taskProgress: number
): Promise<StrikeUpdate> {
    const { minCompletionTarget = 50, achieverStrike = 0, fighterStrike = 0, lastCompletedDate } = template;

    // CRITICAL FIX: Don't recalculate if we've already processed today
    // Strikes should only be updated once per day, not on every progress change
    if (lastCompletedDate === todayDateStr) {
        // Already processed today - just update the existing record, don't recalculate
        // We'll keep the current strike values
        return {
            achieverStrike,
            fighterStrike,
            lastCompletedDate: todayDateStr,
        };
    }

    // Check if this is a consecutive day (different from today)
    const isConsecutive = isNextDay(lastCompletedDate, todayDateStr);

    // Evaluate performance
    const meetsMinimum = taskProgress >= minCompletionTarget;
    const isFighter = taskProgress > 100;

    // Case 1: Failed minimum → Reset both strikes to 0
    if (!meetsMinimum) {
        return {
            achieverStrike: 0,
            fighterStrike: 0,
            lastCompletedDate: todayDateStr,
        };
    }

    // Case 2: Non-consecutive day → Reset and start fresh
    if (!isConsecutive) {
        return {
            achieverStrike: 1,
            fighterStrike: isFighter ? 1 : 0,
            lastCompletedDate: todayDateStr,
        };
    }

    // Case 3: Consecutive day + meets minimum
    // Achiever always increments if minimum is met
    const newAchieverStrike = achieverStrike + 1;

    // Fighter only increments if exceeds 100%
    // If not Fighter today (< 100%), reset Fighter strike to 0
    const newFighterStrike = isFighter ? fighterStrike + 1 : 0;

    return {
        achieverStrike: newAchieverStrike,
        fighterStrike: newFighterStrike,
        lastCompletedDate: todayDateStr,
    };
}

/**
 * Apply strike updates to a template in the database
 */
export async function saveTemplateStrikes(
    templateId: number,
    strikeUpdate: StrikeUpdate
): Promise<void> {
    await db.repeatingTasks.update(templateId, {
        achieverStrike: strikeUpdate.achieverStrike,
        fighterStrike: strikeUpdate.fighterStrike,
        lastCompletedDate: strikeUpdate.lastCompletedDate,
        updatedAt: new Date(),
    });
}

/**
 * Find the template that generated a specific task and update its strikes
 * This should be called whenever a task's progress changes
 */
export async function updateStrikesForTask(
    taskName: string,
    taskDate: string,
    taskProgress: number
): Promise<void> {
    // CRITICAL: Don't update strikes if progress is 0%
    // This happens when:
    // 1. Task is first added (no sessions yet)
    // 2. Navigating to a date before sessions are loaded
    // We should only update strikes when there's ACTUAL progress from sessions
    if (taskProgress === 0) {
        return; // Keep existing template strikes unchanged
    }

    // Find the template that matches this task name
    const template = await db.repeatingTasks
        .filter(t => t.name === taskName && t.isActive === true)
        .first();

    if (!template || !template.id) {
        // Not a template-based task
        return;
    }

    // Calculate new strikes
    const strikeUpdate = await updateTemplateStrikes(template, taskDate, taskProgress);

    // Save to database
    await saveTemplateStrikes(template.id, strikeUpdate);
}
