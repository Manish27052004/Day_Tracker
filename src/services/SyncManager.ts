import { db, Task, Session, SleepEntry } from '@/lib/db';
import { supabase } from '@/lib/supabase';

/**
 * SyncManager - Offline-First Synchronization Service
 * 
 * Implements a robust sync system using binary flags (synced: 0/1):
 * - synced: 0 = offline/pending upload
 * - synced: 1 = successfully uploaded to Supabase
 * 
 * Features:
 * - Push: Upload unsynced local data to Supabase
 * - Pull: Fetch missing data from Supabase
 * - Prune: Clean up items deleted remotely (safely)
 * - Non-blocking: Runs asynchronously without freezing UI
 */

export interface SyncResult {
    success: boolean;
    pushed: number;
    pulled: number;
    pruned: number;
    errors: string[];
}

/**
 * Helper: Check if an item is synced (binary flag interface)
 * Maps existing syncStatus to 0/1
 */
export function getSyncStatus(item: Task | Session | SleepEntry): 0 | 1 {
    return item.syncStatus === 'synced' ? 1 : 0;
}

/**
 * Helper: Mark item as synced or unsynced
 * Updates the underlying syncStatus field
 */
export function setSynced(synced: 0 | 1): 'pending' | 'synced' {
    return synced === 1 ? 'synced' : 'pending';
}

/**
 * Main Sync Function
 * 
 * Synchronizes local Dexie database with Supabase cloud storage
 * Implements push, pull, and prune strategies
 * 
 * @returns SyncResult with statistics and any errors
 */
export async function syncData(): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        pushed: 0,
        pulled: 0,
        pruned: 0,
        errors: []
    };

    try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            result.errors.push('Not authenticated. Please sign in to sync.');
            return result;
        }

        // Check if online
        if (!navigator.onLine) {
            result.errors.push('Offline. Sync will resume when connection is restored.');
            return result;
        }

        console.log('🔄 Starting sync...');

        // === PHASE 1: PUSH (Upload unsynced data) ===
        await pushTasks(user.id, result);
        await pushSessions(user.id, result);
        await pushSleepEntries(user.id, result);

        // === PHASE 2: PULL (Fetch missing data) ===
        await pullTasks(user.id, result);
        await pullSessions(user.id, result);
        await pullSleepEntries(user.id, result);

        // === PHASE 3: PRUNE (Clean deleted remote data) ===
        await pruneTasks(user.id, result);
        await pruneSessions(user.id, result);
        await pruneSleepEntries(user.id, result);

        result.success = result.errors.length === 0;

        console.log('✅ Sync complete!', result);

        return result;

    } catch (error: any) {
        result.errors.push(`Sync failed: ${error.message}`);
        console.error('❌ Sync error:', error);
        return result;
    }
}

/**
 * PUSH: Upload unsynced tasks (synced === 0)
 */
async function pushTasks(userId: string, result: SyncResult): Promise<void> {
    try {
        // Find all tasks with synced === 0 (pending upload)
        const unsyncedTasks = await db.tasks
            .where('syncStatus')
            .equals('pending')
            .toArray();

        for (const task of unsyncedTasks) {
            try {
                const supabaseTask = {
                    user_id: userId,
                    date: task.date,
                    name: task.name,
                    status: task.status,
                    priority: task.priority,
                    target_time: task.targetTime,
                    description: task.description || '',
                    completed_description: task.completedDescription || null,
                    progress: task.progress || 0,
                    is_deleted: task.isDeleted || false,
                    created_at: task.createdAt?.toISOString() || new Date().toISOString(),
                    updated_at: task.updatedAt?.toISOString() || new Date().toISOString(),
                    period_task_id: task.periodTaskId || null
                };

                const { error } = await supabase
                    .from('tasks')
                    .upsert(supabaseTask, {
                        onConflict: 'user_id,date,name'
                    });

                if (error) {
                    result.errors.push(`Task "${task.name}": ${error.message}`);
                } else {
                    // Mark as synced (synced = 1)
                    await db.tasks.update(task.id!, {
                        syncStatus: 'synced',
                        userId: userId
                    });
                    result.pushed++;
                }
            } catch (err: any) {
                result.errors.push(`Task "${task.name}": ${err.message}`);
            }
        }
    } catch (error: any) {
        result.errors.push(`Push tasks failed: ${error.message}`);
    }
}

/**
 * PUSH: Upload unsynced sessions (synced === 0)
 */
async function pushSessions(userId: string, result: SyncResult): Promise<void> {
    try {
        const unsyncedSessions = await db.sessions
            .where('syncStatus')
            .equals('pending')
            .toArray();

        for (const session of unsyncedSessions) {
            try {
                const supabaseSession = {
                    user_id: userId,
                    date: session.date,
                    task_id: null,
                    custom_name: session.customName || '',
                    category: session.category,
                    category_type: session.categoryType,
                    start_time: session.startTime,
                    end_time: session.endTime,
                    description: session.description || '',
                    is_deleted: session.isDeleted || false,
                    created_at: session.createdAt?.toISOString() || new Date().toISOString()
                };

                const { error } = await supabase
                    .from('sessions')
                    .upsert(supabaseSession, {
                        onConflict: 'user_id,date,start_time,end_time'
                    });

                if (error) {
                    result.errors.push(`Session at ${session.startTime}: ${error.message}`);
                } else {
                    await db.sessions.update(session.id!, {
                        syncStatus: 'synced',
                        userId: userId
                    });
                    result.pushed++;
                }
            } catch (err: any) {
                result.errors.push(`Session at ${session.startTime}: ${err.message}`);
            }
        }
    } catch (error: any) {
        result.errors.push(`Push sessions failed: ${error.message}`);
    }
}

/**
 * PUSH: Upload unsynced sleep entries (synced === 0)
 */
async function pushSleepEntries(userId: string, result: SyncResult): Promise<void> {
    try {
        const unsyncedEntries = await db.sleepEntries
            .where('syncStatus')
            .equals('pending')
            .toArray();

        for (const entry of unsyncedEntries) {
            try {
                const supabaseSleep = {
                    user_id: userId,
                    date: entry.date,
                    wake_up_time: entry.wakeUpTime || null,
                    bed_time: entry.bedTime || null,
                    created_at: new Date().toISOString()
                };

                const { error } = await supabase
                    .from('sleep_entries')
                    .upsert(supabaseSleep, {
                        onConflict: 'user_id,date'
                    });

                if (error) {
                    result.errors.push(`Sleep entry ${entry.date}: ${error.message}`);
                } else {
                    await db.sleepEntries.update(entry.id!, {
                        syncStatus: 'synced',
                        userId: userId
                    });
                    result.pushed++;
                }
            } catch (err: any) {
                result.errors.push(`Sleep entry ${entry.date}: ${err.message}`);
            }
        }
    } catch (error: any) {
        result.errors.push(`Push sleep entries failed: ${error.message}`);
    }
}

/**
 * PULL: Fetch tasks missing locally from Supabase
 */
async function pullTasks(userId: string, result: SyncResult): Promise<void> {
    try {
        const { data: remoteTasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            result.errors.push(`Pull tasks failed: ${error.message}`);
            return;
        }

        if (!remoteTasks) return;

        const localTasks = await db.tasks.toArray();

        for (const remoteTask of remoteTasks) {
            // Check if exists locally by matching date+name (since IDs differ)
            const exists = localTasks.find(
                l => l.date === remoteTask.date && l.name === remoteTask.name
            );

            if (!exists) {
                // Add missing task to local database
                await db.tasks.add({
                    date: remoteTask.date,
                    name: remoteTask.name,
                    status: remoteTask.status,
                    priority: remoteTask.priority,
                    targetTime: remoteTask.target_time,
                    description: remoteTask.description || '',
                    completedDescription: remoteTask.completed_description || '',
                    progress: remoteTask.progress || 0,
                    isDeleted: remoteTask.is_deleted || false,
                    createdAt: new Date(remoteTask.created_at),
                    updatedAt: new Date(remoteTask.updated_at),
                    syncStatus: 'synced', // Mark as synced (synced = 1)
                    userId: userId,
                    periodTaskId: remoteTask.period_task_id // Map from snake_case
                });
                result.pulled++;
            }
        }
    } catch (error: any) {
        result.errors.push(`Pull tasks failed: ${error.message}`);
    }
}

/**
 * PULL: Fetch sessions missing locally from Supabase
 */
async function pullSessions(userId: string, result: SyncResult): Promise<void> {
    try {
        const { data: remoteSessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            result.errors.push(`Pull sessions failed: ${error.message}`);
            return;
        }

        if (!remoteSessions) return;

        const localSessions = await db.sessions.toArray();

        for (const remoteSession of remoteSessions) {
            const exists = localSessions.find(
                l => l.date === remoteSession.date &&
                    l.startTime === remoteSession.start_time &&
                    l.endTime === remoteSession.end_time
            );

            if (!exists) {
                await db.sessions.add({
                    date: remoteSession.date,
                    taskId: null,
                    customName: remoteSession.custom_name || '',
                    category: remoteSession.category,
                    categoryType: remoteSession.category_type,
                    startTime: remoteSession.start_time,
                    endTime: remoteSession.end_time,
                    description: remoteSession.description || '',
                    isDeleted: remoteSession.is_deleted || false,
                    createdAt: new Date(remoteSession.created_at),
                    syncStatus: 'synced',
                    userId: userId
                });
                result.pulled++;
            }
        }
    } catch (error: any) {
        result.errors.push(`Pull sessions failed: ${error.message}`);
    }
}

/**
 * PULL: Fetch sleep entries missing locally from Supabase
 */
async function pullSleepEntries(userId: string, result: SyncResult): Promise<void> {
    try {
        const { data: remoteEntries, error } = await supabase
            .from('sleep_entries')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            result.errors.push(`Pull sleep entries failed: ${error.message}`);
            return;
        }

        if (!remoteEntries) return;

        const localEntries = await db.sleepEntries.toArray();

        for (const remoteEntry of remoteEntries) {
            const exists = localEntries.find(l => l.date === remoteEntry.date);

            if (!exists) {
                await db.sleepEntries.add({
                    date: remoteEntry.date,
                    wakeUpTime: remoteEntry.wake_up_time || '',
                    bedTime: remoteEntry.bed_time || '',
                    syncStatus: 'synced',
                    userId: userId
                });
                result.pulled++;
            }
        }
    } catch (error: any) {
        result.errors.push(`Pull sleep entries failed: ${error.message}`);
    }
}

/**
 * PRUNE: Remove tasks that were deleted remotely
 * 
 * SAFETY: Only deletes items with synced === 1 (already uploaded)
 * Never touches synced === 0 items (pending upload)
 */
async function pruneTasks(userId: string, result: SyncResult): Promise<void> {
    try {
        const { data: remoteTasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            result.errors.push(`Prune tasks failed: ${error.message}`);
            return;
        }

        const localTasks = await db.tasks.toArray();

        for (const localTask of localTasks) {
            // SAFETY: Only prune synced items (synced === 1)
            if (localTask.syncStatus === 'synced') {
                const existsRemotely = remoteTasks?.find(
                    r => r.date === localTask.date && r.name === localTask.name
                );

                if (!existsRemotely) {
                    // Item was deleted remotely, safe to delete locally
                    await db.tasks.delete(localTask.id!);
                    result.pruned++;
                }
            }
            // SAFETY: Skip items with synced === 0 (pending upload)
        }
    } catch (error: any) {
        result.errors.push(`Prune tasks failed: ${error.message}`);
    }
}

/**
 * PRUNE: Remove sessions that were deleted remotely
 */
async function pruneSessions(userId: string, result: SyncResult): Promise<void> {
    try {
        const { data: remoteSessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            result.errors.push(`Prune sessions failed: ${error.message}`);
            return;
        }

        const localSessions = await db.sessions.toArray();

        for (const localSession of localSessions) {
            if (localSession.syncStatus === 'synced') {
                const existsRemotely = remoteSessions?.find(
                    r => r.date === localSession.date &&
                        r.start_time === localSession.startTime &&
                        r.end_time === localSession.endTime
                );

                if (!existsRemotely) {
                    await db.sessions.delete(localSession.id!);
                    result.pruned++;
                }
            }
        }
    } catch (error: any) {
        result.errors.push(`Prune sessions failed: ${error.message}`);
    }
}

/**
 * PRUNE: Remove sleep entries that were deleted remotely
 */
async function pruneSleepEntries(userId: string, result: SyncResult): Promise<void> {
    try {
        const { data: remoteEntries, error } = await supabase
            .from('sleep_entries')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            result.errors.push(`Prune sleep entries failed: ${error.message}`);
            return;
        }

        const localEntries = await db.sleepEntries.toArray();

        for (const localEntry of localEntries) {
            if (localEntry.syncStatus === 'synced') {
                const existsRemotely = remoteEntries?.find(r => r.date === localEntry.date);

                if (!existsRemotely) {
                    await db.sleepEntries.delete(localEntry.id!);
                    result.pruned++;
                }
            }
        }
    } catch (error: any) {
        result.errors.push(`Prune sleep entries failed: ${error.message}`);
    }
}
