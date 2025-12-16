import { supabase } from './lib/supabase';

async function checkData() {
    console.log('🔍 Checking Data for streaks...');

    // 1. Fetch all 'android' tasks for Dec 13 and 14
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .in('date', ['2025-12-13', '2025-12-14'])
        .eq('name', 'android')
        .order('date', { ascending: true });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.table(tasks.map(t => ({
        id: t.id,
        date: t.date,
        name: t.name,
        template_id: t.template_id,
        progress: t.progress,
        achiever_strike: t.achiever_strike,
        created_at: t.created_at
    })));

    // 2. Check if a template actually exists with that ID
    const dummyId = '00000000-0000-0000-0000-000000000001';
    const { data: template } = await supabase
        .from('repeating_tasks')
        .select('*')
        .eq('id', dummyId);

    console.log('\n🔍 Template Check:', template);
}

checkData();
