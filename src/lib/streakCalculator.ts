import { supabase } from './supabase';
import { format, subDays, parseISO } from 'date-fns';

interface StreakResult {
    achiever_strike: number;
    fighter_strike: number;
}

/**
 * SIMPLE AND EXPLICIT streak calculator
 * Logs EVERYTHING so we can debug
 */
export async function calculateStreakForTask(
    userId: string,
    templateId: string | null,
    currentDate: string,
    currentProgress: number
): Promise<StreakResult> {

    console.log('='.repeat(60));
    console.log('🚀 STREAK CALCULATOR START');
    console.log(`   userId: ${userId}`);
    console.log(`   templateId: ${templateId}`);
    console.log(`   currentDate: ${currentDate}`);
    console.log(`   currentProgress: ${currentProgress}%`);

    // If no template, no streak
    if (!templateId) {
        console.log('❌ NO TEMPLATE ID - returning 0/0');
        return { achiever_strike: 0, fighter_strike: 0 };
    }

    try {
        // 1. Fetch template's min_completion_target
        console.log('\n📌 Step 1: Fetching template settings...');
        const { data: templateData, error: templateError } = await supabase
            .from('repeating_tasks')
            .select('min_completion_target')
            .eq('id', templateId)
            .single();

        if (templateError) {
            console.error('❌ Template fetch error:', templateError);
            console.log('   Using default min_target = 60%');
        }

        const minTarget = templateData?.min_completion_target ?? 60;
        console.log(`   ✅ Min target: ${minTarget}%`);

        // 2. Calculate yesterday's date
        console.log('\n📅 Step 2: Calculating yesterday...');
        const yesterday = subDays(parseISO(currentDate), 1);
        const yesterdayDate = format(yesterday, 'yyyy-MM-dd');
        console.log(`   Current: ${currentDate}`);
        console.log(`   Yesterday: ${yesterdayDate}`);

        // 3. Fetch yesterday's task
        console.log('\n🔍 Step 3: Fetching yesterday\'s task...');
        console.log(`   Query: user_id=${userId}, template_id=${templateId}, date=${yesterdayDate}`);

        const { data: yesterdayTask, error: fetchError } = await supabase
            .from('tasks')
            .select('achiever_strike, fighter_strike, progress, date, template_id')
            .eq('user_id', userId)
            .eq('template_id', templateId)
            .eq('date', yesterdayDate)
            .maybeSingle();

        if (fetchError) {
            console.error('❌ Fetch error:', fetchError);
            console.log('   Starting fresh: 1/0 or 0/0');
            return calculateFreshStreak(currentProgress, minTarget);
        }

        if (!yesterdayTask) {
            console.log('   ℹ️ No yesterday task found');
            console.log('   Starting fresh streak');
            return calculateFreshStreak(currentProgress, minTarget);
        }

        console.log('   ✅ Yesterday task found!');
        console.log(`   Raw data:`, yesterdayTask);

        // 4. VALIDATE yesterday based on yesterday's progress
        console.log('\n🔬 Step 4: Validating yesterday\'s strikes...');

        let baseAchiever = yesterdayTask.achiever_strike || 0;
        let baseFighter = yesterdayTask.fighter_strike || 0;
        const yesterdayProgress = yesterdayTask.progress || 0;

        console.log(`   Yesterday's raw strikes: achiever=${baseAchiever}, fighter=${baseFighter}`);
        console.log(`   Yesterday's progress: ${yesterdayProgress}%`);

        // Validate Achiever
        if (yesterdayProgress < minTarget) {
            console.log(`   ⚠️ Yesterday FAILED achiever (${yesterdayProgress}% < ${minTarget}%)`);
            console.log(`   Resetting achiever base: ${baseAchiever} → 0`);
            baseAchiever = 0;
        } else {
            console.log(`   ✅ Yesterday ACHIEVED (${yesterdayProgress}% >= ${minTarget}%)`);
            console.log(`   Keeping achiever base: ${baseAchiever}`);
        }

        // Validate Fighter
        if (yesterdayProgress <= 100) {
            console.log(`   ⚠️ Yesterday NOT fighter (${yesterdayProgress}% <= 100%)`);
            console.log(`   Resetting fighter base: ${baseFighter} → 0`);
            baseFighter = 0;
        } else {
            console.log(`   ✅ Yesterday WAS fighter (${yesterdayProgress}% > 100%)`);
            console.log(`   Keeping fighter base: ${baseFighter}`);
        }

        // 5. Calculate today's increment
        console.log('\n➕ Step 5: Calculating today\'s increment...');
        console.log(`   Validated base: achiever=${baseAchiever}, fighter=${baseFighter}`);
        console.log(`   Today's progress: ${currentProgress}%`);

        let finalAchiever = baseAchiever;
        let finalFighter = baseFighter;

        if (currentProgress >= minTarget) {
            finalAchiever = baseAchiever + 1;
            console.log(`   ✅ Today ACHIEVES (${currentProgress}% >= ${minTarget}%)`);
            console.log(`   Achiever: ${baseAchiever} + 1 = ${finalAchiever}`);
        } else {
            console.log(`   ❌ Today FAILS (${currentProgress}% < ${minTarget}%)`);
            console.log(`   Achiever: keeps base = ${finalAchiever}`);
        }

        if (currentProgress > 100) {
            finalFighter = baseFighter + 1;
            console.log(`   ✅ Today is FIGHTER (${currentProgress}% > 100%)`);
            console.log(`   Fighter: ${baseFighter} + 1 = ${finalFighter}`);
        } else {
            console.log(`   ❌ Today NOT fighter (${currentProgress}% <= 100%)`);
            console.log(`   Fighter: keeps base = ${finalFighter}`);
        }

        console.log('\n🎯 FINAL RESULT:');
        console.log(`   achiever_strike = ${finalAchiever}`);
        console.log(`   fighter_strike = ${finalFighter}`);
        console.log('='.repeat(60));

        return {
            achiever_strike: finalAchiever,
            fighter_strike: finalFighter
        };

    } catch (error) {
        console.error('💥 UNEXPECTED ERROR:', error);
        console.log('Falling back to fresh streak');
        return calculateFreshStreak(currentProgress, 60);
    }
}

function calculateFreshStreak(
    currentProgress: number,
    minTarget: number
): StreakResult {
    console.log('\n🆕 Calculating FRESH streak (no yesterday)');
    const achiever = currentProgress >= minTarget ? 1 : 0;
    const fighter = currentProgress > 100 ? 1 : 0;
    console.log(`   Result: achiever=${achiever}, fighter=${fighter}`);
    return {
        achiever_strike: achiever,
        fighter_strike: fighter
    };
}
