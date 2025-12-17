import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Task, Session, SleepEntry } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useLiveQuery } from 'dexie-react-hooks';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

// Helper: Convert Task from Dexie (camelCase) to Supabase (snake_case)
const taskToSupabase = (task: Task, userId: string) => ({
    user_id: userId,
    date: task.date,
    name: task.name,
    status: task.status,
    priority: task.priority,
    target_time: task.targetTime,
    description: task.description || '',
    completed_description: task.completedDescription || '',
    progress: task.progress || 0,
    is_repeating: task.isRepeating || false,
    created_at: task.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: task.updatedAt?.toISOString() || new Date().toISOString()
});

// Helper: Convert Session from Dexie (camelCase) to Supabase (snake_case)
const sessionToSupabase = (session: Session, userId: string) => ({
    user_id: userId,
    date: session.date,
    task_id: null, // Will handle task linking later
    custom_name: session.customName || '',
    category: session.category,
    category_type: session.categoryType,
    start_time: session.startTime,
    end_time: session.endTime,
    description: session.description || '',
    created_at: session.createdAt?.toISOString() || new Date().toISOString()
});

// Helper: Convert Sleep Entry from Dexie (camelCase) to Supabase (snake_case)
const sleepToSupabase = (entry: SleepEntry, userId: string) => ({
    user_id: userId,
    date: entry.date,
    wake_up_time: entry.wakeUpTime || null,
    bed_time: entry.bedTime || null,
    created_at: new Date().toISOString()
});

export const useSync = () => {
    const { user } = useAuth();
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setSyncStatus('idle');
            processSyncQueue();
        };
        const handleOffline = () => {
            setIsOnline(false);
            setSyncStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Process waiting queue when coming back online
    const processSyncQueue = useCallback(async () => {
        if (!user || !navigator.onLine) return;

        try {
            setSyncStatus('syncing');

            // 1. Sync Tasks
            const pendingTasks = await db.tasks.where('syncStatus').equals('pending').toArray();
            for (const task of pendingTasks) {
                // Convert to Supabase format
                const supabaseTask = taskToSupabase(task, user.id);

                // Upsert to Supabase
                const { error } = await supabase.from('tasks').upsert(supabaseTask);

                if (!error) {
                    await db.tasks.update(task.id!, { syncStatus: 'synced' });
                } else {
                    console.error('Task sync error:', error);
                }
            }

            // 2. Sync Sessions
            const pendingSessions = await db.sessions.where('syncStatus').equals('pending').toArray();
            for (const session of pendingSessions) {
                const supabaseSession = sessionToSupabase(session, user.id);
                const { error } = await supabase.from('sessions').upsert(supabaseSession);

                if (!error) {
                    await db.sessions.update(session.id!, { syncStatus: 'synced' });
                } else {
                    console.error('Session sync error:', error);
                }
            }

            // 3. Sync Sleep Entries
            const pendingSleep = await db.sleepEntries.where('syncStatus').equals('pending').toArray();
            for (const entry of pendingSleep) {
                const supabaseSleep = sleepToSupabase(entry, user.id);
                const { error } = await supabase.from('sleep_entries').upsert(supabaseSleep, {
                    onConflict: 'user_id,date'
                });

                if (!error) {
                    await db.sleepEntries.update(entry.id!, { syncStatus: 'synced' });
                } else {
                    console.error('Sleep sync error:', error);
                }
            }

            setSyncStatus('idle');
        } catch (error) {
            console.error('Queue sync failed:', error);
            setSyncStatus('error');
        }
    }, [user]);

    // Initial sync on mount/auth change
    useEffect(() => {
        if (user && isOnline) {
            processSyncQueue();
        }
    }, [user, isOnline, processSyncQueue]);

    /**
     * Optimistic Save: Saves to local DB first, then tries to push to cloud
     */
    const saveTaskWithSync = async (task: Omit<Task, 'id' | 'syncStatus' | 'userId' | 'createdAt' | 'updatedAt' | 'strikeCount'>) => {
        // 1. Save locally
        const newTask: Task = {
            ...task,
            createdAt: new Date(),
            updatedAt: new Date(),
            syncStatus: 'pending',
            userId: user ? user.id : 'local'
        };

        const id = await db.tasks.add(newTask);

        // 2. Try background sync
        if (user && navigator.onLine) {
            // Don't await this, let it happen in background
            (async () => {
                try {
                    const supabaseTask = taskToSupabase(newTask, user.id);
                    const { error } = await supabase.from('tasks').insert(supabaseTask);

                    if (!error) {
                        await db.tasks.update(id, { syncStatus: 'synced' });
                    } else {
                        console.error('Background sync error:', error);
                    }
                } catch (e) {
                    console.error('Background sync failed:', e);
                }
            })();
        }

        return id;
    };

    /**
     * Fetch data for a specific date from cloud (and merge to local)
     */
    const fetchDateData = useCallback(async (dateString: string) => {
        if (!user || !navigator.onLine) return;

        try {
            setSyncStatus('syncing');

            // Fetch Tasks
            const { data: cloudTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('date', dateString)
                .eq('user_id', user.id);

            if (cloudTasks) {
                // Merge strategy: If not in local, add it.
                const localTasks = await db.tasks.where('date').equals(dateString).toArray();

                for (const cTask of cloudTasks) {
                    // Simple dedup by name for now since IDs don't match
                    const exists = localTasks.find(l => l.name === cTask.name);
                    if (!exists) {
                        await db.tasks.add({
                            name: cTask.name,
                            date: cTask.date,
                            status: cTask.status,
                            priority: cTask.priority,
                            targetTime: cTask.target_time,
                            description: cTask.description || '',
                            completedDescription: cTask.completed_description || '',
                            progress: cTask.progress || 0,
                            isRepeating: cTask.is_repeating || false,
                            createdAt: new Date(cTask.created_at),
                            updatedAt: new Date(cTask.updated_at),
                            syncStatus: 'synced',
                            userId: user.id
                        } as any); // Cast because of some field mismatches maybe
                    }
                }
            }

            // Fetch Sessions
            const { data: cloudSessions } = await supabase
                .from('sessions')
                .select('*')
                .eq('date', dateString)
                .eq('user_id', user.id);

            if (cloudSessions) {
                const localSessions = await db.sessions.where('date').equals(dateString).toArray();
                for (const cSession of cloudSessions) {
                    // Dedup by start time and category
                    const exists = localSessions.find(
                        l => l.startTime === cSession.start_time && l.category === cSession.category
                    );
                    if (!exists) {
                        await db.sessions.add({
                            date: cSession.date,
                            taskId: null, // Hard to link without UUIDs
                            customName: cSession.custom_name || '',
                            category: cSession.category,
                            categoryType: cSession.category_type as any,
                            startTime: cSession.start_time,
                            endTime: cSession.end_time,
                            description: cSession.description || '',
                            createdAt: new Date(cSession.created_at),
                            syncStatus: 'synced',
                            userId: user.id
                        });
                    }
                }
            }

            // Fetch Sleep Entries
            const { data: cloudSleep } = await supabase
                .from('sleep_entries')
                .select('*')
                .eq('date', dateString)
                .eq('user_id', user.id)
                .single(); // Should be only one per day

            if (cloudSleep) {
                const localSleep = await db.sleepEntries.where('date').equals(dateString).first();
                if (!localSleep) {
                    await db.sleepEntries.add({
                        date: cloudSleep.date,
                        wakeUpTime: cloudSleep.wake_up_time || '',
                        bedTime: cloudSleep.bed_time || '',
                        syncStatus: 'synced',
                        userId: user.id
                    });
                } else if (localSleep.syncStatus === 'synced') {
                    // If local is synced, trust cloud (overwrite logic if conflict, but here just ensure consistency)
                    // If local is pending, keep local changes
                    if (localSleep.wakeUpTime !== cloudSleep.wake_up_time || localSleep.bedTime !== cloudSleep.bed_time) {
                        await db.sleepEntries.update(localSleep.id!, {
                            wakeUpTime: cloudSleep.wake_up_time || '',
                            bedTime: cloudSleep.bed_time || '',
                            syncStatus: 'synced'
                        });
                    }
                }
            }

            setSyncStatus('idle');
        } catch (error) {
            console.error('Fetch failed:', error);
            setSyncStatus('error');
        }
    }, [user]);

    return {
        syncStatus,
        isOnline,
        saveTaskWithSync,
        fetchDateData,
        processSyncQueue
    };
};
