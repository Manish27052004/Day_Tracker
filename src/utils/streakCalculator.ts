import { supabase } from '@/lib/supabase';
import { calculateDuration } from '@/lib/db';

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(currentDate: string): string {
    const date = new Date(currentDate + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
}

/**
 * Calculate progress percentage from sessions
 */
function calculateProgressPercent(sessions: any[], targetMinutes: number): number {
    if (targetMinutes === 0) return 0;

    const totalMinutes = sessions.reduce((sum, session) => {
        return sum + calculateDuration(session.start_time, session.end_time);
    }, 0);

    return Math.round((totalMinutes / targetMinutes) * 100);
}

interface StreakResult {
    achieverStreak: number;
    fighterStreak: number;
}

/**
 * Fetch yesterday's streak by template_id or name
 * 
 * @param taskName - Name of the task
 * @param currentDate - Current date in YYYY-MM-DD format
 * @param userId - User ID
 * @param minCompletionTarget - Minimum % for achiever
 * @param templateId - Optional template ID for better matching
 */
export async function fetchYesterdayStreak(
    taskName: string,
    currentDate: string,
    userId: string,
    minCompletionTarget: number = 60,
    templateId?: string | null
): Promise<StreakResult> {
    try {
        const yesterday = getYesterdayDate(currentDate);

        console.log('🔍 fetchYesterdayStreak:', { taskName, templateId, currentDate, yesterday });

        // Build query based on template_id
        let query = supabase
            .from('tasks')
            .select('id, target_time, achiever_strike, fighter_strike')
            .eq('date', yesterday)
            .eq('user_id', userId);

        // 🔥 KEY: Use template_id if available
        if (templateId) {
            query = query.eq('template_id', templateId);
        } else {
            query = query.eq('name', taskName).is('template_id', null);
        }

        const { data: yesterdayTask, error } = await query.maybeSingle();

        if (error) {
            console.error('❌ Error fetching yesterday task:', error);
            return { achieverStreak: 0, fighterStreak: 0 };
        }

        if (!yesterdayTask) {
            console.log('⏸️ No yesterday task found');
            return { achieverStreak: 0, fighterStreak: 0 };
        }

        console.log('✅ Found yesterday task:', yesterdayTask);

        // Fetch yesterday's sessions
        const { data: yesterdaySessions, error: sessionsError } = await supabase
            .from('sessions')
            .select('start_time, end_time')
            .eq('task_id', yesterdayTask.id)
            .eq('user_id', userId);

        if (sessionsError || !yesterdaySessions) {
            console.log('⏸️ No sessions for yesterday');
            return { achieverStreak: 0, fighterStreak: 0 };
        }

        // Calculate yesterday's progress
        const yesterdayProgress = calculateProgressPercent(
            yesterdaySessions,
            yesterdayTask.target_time
        );

        console.log('📊 Yesterday progress:', {
            sessions: yesterdaySessions.length,
            progress: yesterdayProgress,
            passedAchiever: yesterdayProgress >= minCompletionTarget,
            passedFighter: yesterdayProgress > 100
        });

        // Calculate base streaks
        let baseAchiever = 0;
        let baseFighter = 0;

        if (yesterdayProgress >= minCompletionTarget) {
            baseAchiever = (yesterdayTask.achiever_strike || 0) + 1;
        }

        if (yesterdayProgress > 100) {
            baseFighter = (yesterdayTask.fighter_strike || 0) + 1;
        }

        console.log('✅ Calculated base:', { baseAchiever, baseFighter });

        return {
            achieverStreak: baseAchiever,
            fighterStreak: baseFighter
        };

    } catch (error) {
        console.error('❌ Error in fetchYesterdayStreak:', error);
        return { achieverStreak: 0, fighterStreak: 0 };
    }
}
