import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateStreakForTask } from '@/lib/streakCalculator';

const DebugPage = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const { user } = useAuth();

    const log = (msg: string) => setLogs(prev => [...prev, msg + '\n']);

    const runRepair = async () => {
        if (!user) return log('❌ Must be logged in');
        log('\n🔧 STARTING REPAIR SEQUENCE (Dec 11 - Dec 16)...');
        log('This enforces the chain: Dec 11 -> 12 -> 13 -> 14 -> 15');

        const datesToCheck = [
            '2025-12-11', '2025-12-12', '2025-12-13',
            '2025-12-14', '2025-12-15', '2025-12-16'
        ];

        for (const date of datesToCheck) {
            log(`\n📅 Processing ${date}...`);

            // 1. Get tasks for this date
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('date', date)
                .eq('user_id', user.id);

            if (!tasks || tasks.length === 0) {
                log('   (No tasks found)');
                continue;
            }

            for (const task of tasks) {
                // Only care if it's a template task or has a name (fallback logic)
                if (!task.template_id && !task.name) continue;

                log(`   Refixing "${task.name}" (${task.progress}%)...`);

                // 2. Client-Side Recalculation (Forces fetch of NOW-CORRECT yesterday)
                try {
                    const streaks = await calculateStreakForTask(
                        user.id,
                        task.template_id,
                        task.date,
                        task.progress,
                        task.name
                    );

                    // 3. Update DB
                    const { error } = await supabase
                        .from('tasks')
                        .update({
                            achiever_strike: streaks.achiever_strike,
                            fighter_strike: streaks.fighter_strike,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', task.id);

                    if (error) log(`   ❌ DB Error: ${error.message}`);
                    else log(`   ✅ Result: ${streaks.achiever_strike} 🔥 / ${streaks.fighter_strike} ⚔️ (Saved)`);

                } catch (err: any) {
                    log(`   ❌ Calc Error: ${err.message}`);
                }
            }
        }
        log('\n✨ REPAIR COMPLETE. Check your main app now!');
    };

    useEffect(() => {
        const runCheck = async () => {
            log(`User: ${user?.id || 'NOT LOGGED IN'}`);

            if (!user) {
                log('⚠️ Please log in to view data. (Use the main app to login then refresh this page)');
                return;
            }

            log('Running Data Check (All tasks for Dec 13-14)...');

            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .in('date', ['2025-12-13', '2025-12-14'])
                .order('date', { ascending: true });

            if (error) {
                log('❌ Error fetching tasks: ' + error.message);
                return;
            }

            log(`Found ${tasks.length} tasks total on Dec 13/14:`);

            tasks.forEach(t => {
                log(JSON.stringify({
                    id: t.id,
                    date: t.date,
                    name: t.name,
                    template_id: t.template_id,
                    progress: t.progress,
                    achiever_strike: t.achiever_strike,
                }, null, 2));
            });
        };


        const testNotification = async () => {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration.active) {
                    const channel = new MessageChannel();
                    channel.port1.onmessage = (event) => {
                        log('🔔 ' + event.data.log);
                    };
                    registration.active.postMessage({ type: 'TEST_NOTIFICATION' }, [channel.port2]);
                }
            }
        };

        const debugCheck = async () => {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration.active) {
                    const channel = new MessageChannel();
                    channel.port1.onmessage = (event) => {
                        log('🔍 ' + (typeof event.data.log === 'string' ? event.data.log : JSON.stringify(event.data.log)));
                    };
                    registration.active.postMessage({ type: 'DEBUG_CHECK' }, [channel.port2]);
                }
            } else {
                log('❌ No Service Worker found.');
            }
        };

        if (user) runCheck();
    }, [user]);

    return (
        <div className="p-8 font-mono text-xs whitespace-pre-wrap bg-gray-100 min-h-screen text-black">
            <div className="mb-4 space-x-4">
                <h1 className="text-lg font-bold mb-2">Background Sync Debug</h1>
                <div className="flex gap-2 flex-wrap mb-4 border-b pb-4">
                    <button
                        // @ts-ignore
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Refresh Logs
                    </button>
                    <button
                        // @ts-ignore
                        onClick={async () => {
                            if ('serviceWorker' in navigator) {
                                const registration = await navigator.serviceWorker.ready;
                                if (registration.active) {
                                    const channel = new MessageChannel();
                                    channel.port1.onmessage = (event) => {
                                        // @ts-ignore
                                        setLogs(prev => [...prev, '🔔 ' + event.data.log + '\n']);
                                    };
                                    registration.active.postMessage({ type: 'TEST_NOTIFICATION' }, [channel.port2]);
                                }
                            }
                        }}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                        🔔 Test Notification
                    </button>
                    <button
                        // @ts-ignore
                        onClick={async () => {
                            if ('serviceWorker' in navigator) {
                                const registration = await navigator.serviceWorker.ready;
                                if (registration.active) {
                                    const channel = new MessageChannel();
                                    channel.port1.onmessage = (event) => {
                                        // @ts-ignore
                                        setLogs(prev => [...prev, '🔍 ' + event.data.log + '\n']);
                                    };
                                    registration.active.postMessage({ type: 'DEBUG_CHECK' }, [channel.port2]);
                                }
                            } else {
                                // @ts-ignore
                                setLogs(prev => [...prev, '❌ No Service Worker found.\n']);
                            }
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                        🔍 Force Background Check
                    </button>
                </div>
                <button
                    onClick={runRepair}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    🛠️ Repair Data Chain (Dec 11-16)
                </button>
            </div>
            {logs}
        </div>
    );
};

export default DebugPage;
