import { supabase } from './supabase';
import { format, subDays, parseISO, isBefore } from 'date-fns';

interface StreakResult {
    achiever_strike: number;
    fighter_strike: number;
}

/**
 * ROBUST HISTORY-BASED STREAK CALCULATOR
 * Fetches last 50 days of history to calculate streaks from raw progress data.
 * This solves the "Gap Problem" (e.g. 13 -> 15) by not relying on potentially stale
 * stored streak values of previous days.
 */
export async function calculateStreakForTask(
    userId: string,
    templateId: string | null,
    currentDate: string,
    currentProgress: number,
    taskName: string | null
): Promise<StreakResult> {

    console.log('='.repeat(60));
    console.log('🚀 ROBUST HISTORY CALCULATOR v3 (Strict Dates)');
    console.log(`   userId: ${userId}`);
    console.log(`   templateId: ${templateId}`);
    console.log(`   currentDate: ${currentDate}`);

    if (!templateId && !taskName) {
        return { achiever_strike: 0, fighter_strike: 0 };
    }

    try {
        // 1. Fetch Template Settings (Min Target)
        let minTarget = 60;
        if (templateId) {
            const { data } = await supabase
                .from('repeating_tasks')
                .select('min_completion_target')
                .eq('id', templateId)
                .maybeSingle(); // <--- SAFE: Returns null if not found (instead of 406 Error)
            if (data && data.min_completion_target !== null) {
                minTarget = data.min_completion_target;
            }
        }
        console.log(`   🎯 Target: ${minTarget}% | Fighter: >100%`);

        // 2. Fetch History Batch (Last 50 Records)
        // We look for anything strictly BEFORE today.
        console.log('   📚 Fetching history batch...');

        let query = supabase
            .from('tasks')
            .select('date, progress, status')
            .eq('user_id', userId)
            .lt('date', currentDate)
            .order('date', { ascending: false }) // Newest (yesterday) first
            .limit(365); // Cap at 1 year history for performance (still very fast)

        if (templateId) {
            query = query.eq('template_id', templateId);
        } else if (taskName) {
            query = query.eq('name', taskName);
        }

        const { data: history, error } = await query;

        if (error) {
            console.error('   ❌ History fetch error:', error);
            return calculateFreshStreak(currentProgress, minTarget);
        }

        console.log(`   📜 Found ${history?.length || 0} past records.`);

        // 3. Walk backwards strictly
        let achieverBase = 0;
        let fighterBase = 0;

        let achieverAlive = true;
        let fighterAlive = true;

        // STRICT DATE SETUP
        // Use parseISO to ensure we parse the input string 'YYYY-MM-DD' correctly without timezone shifts
        const currentParsed = parseISO(currentDate);
        // Calculate Yesterday strictly
        const yesterdayObj = subDays(currentParsed, 1);
        const yesterdayStr = format(yesterdayObj, 'yyyy-MM-dd');

        console.log(`   🕵️ LOOKING FOR YESTERDAY: ${yesterdayStr}`);

        let expectedDateObj = yesterdayObj;
        const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

        if (history && history.length > 0) {
            let visitedDays = 0;

            for (const task of history) {
                const expectedDateStr = fmt(expectedDateObj);
                const taskDate = task.date; // Should be YYYY-MM-DD from DB
                const progress = task.progress || 0;

                // Stop if both chains are dead
                if (!achieverAlive && !fighterAlive) break;

                // CHECK DATE CONTINUITY
                // We compare the Task Date vs The Expected Date
                const isMatch = taskDate === expectedDateStr;

                if (visitedDays === 0) {
                    // First iteration: This MUST be yesterday for the streak to continue immediately
                    console.log(`   🔎 Checking Most Recent History: Is '${taskDate}' == Yesterday '${yesterdayStr}'? ${isMatch ? 'YES' : 'NO'}`);
                }

                if (!isMatch) {
                    console.log(`   💔 Gap encountered: Expected ${expectedDateStr}, found ${taskDate}`);
                    // A gap means the streak breaks
                    achieverAlive = false;
                    fighterAlive = false;
                    break;
                }

                // CHECK ACHIEVER
                if (achieverAlive) {
                    if (progress >= minTarget) {
                        achieverBase++;
                    } else {
                        achieverAlive = false; // Progress too low
                    }
                }

                // CHECK FIGHTER
                if (fighterAlive) {
                    if (progress > 100) {
                        fighterBase++;
                    } else {
                        fighterAlive = false;
                    }
                }

                // Decrement expected date for next loop
                expectedDateObj = subDays(expectedDateObj, 1);
                visitedDays++;
            }
        } else {
            console.log('   ⚠️ No history found at all.');
        }

        console.log(`   🏗️ Calculated Base Streaks: Achiever=${achieverBase}, Fighter=${fighterBase}`);

        // 4. Add Today's contribution
        let finalAchiever = achieverBase;
        let finalFighter = fighterBase;

        if (currentProgress >= minTarget) {
            finalAchiever += 1;
        }

        if (currentProgress > 100) {
            finalFighter += 1;
        }

        console.log(`   🎯 Final Result: ${finalAchiever} / ${finalFighter}`);
        console.log('='.repeat(60));

        return {
            achiever_strike: finalAchiever,
            fighter_strike: finalFighter
        };

    } catch (error) {
        console.error('💥 UNEXPECTED ERROR:', error);
        return calculateFreshStreak(currentProgress, 60);
    }
}

function calculateFreshStreak(p: number, t: number) {
    return { achiever_strike: p >= t ? 1 : 0, fighter_strike: p > 100 ? 1 : 0 };
}
