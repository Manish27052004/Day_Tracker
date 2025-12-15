import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

/**
 * Migration Utility: Sync Existing Local Dexie Data to Supabase
 * 
 * This utility migrates all existing local data from Dexie to Supabase.
 * Run this once when you first set up cloud sync.
 * 
 * Usage: Import and call migrateLocalDataToSupabase() from your app
 */

interface MigrationResult {
    success: boolean;
    tasksSynced: number;
    sessionsSynced: number;
    sleepEntriesSynced: number;
    errors: string[];
}

/**
 * Migrates all local Dexie data to Supabase
 * Requires user to be authenticated
 */
export async function migrateLocalDataToSupabase(): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: false,
        tasksSynced: 0,
        sessionsSynced: 0,
        sleepEntriesSynced: 0,
        errors: []
    };

    try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            result.errors.push('Not authenticated. Please sign in with Google first.');
            return result;
        }

        console.log('🔄 Starting migration for user:', user.email);

        // 1. Migrate Tasks
        console.log('📋 Migrating tasks...');
        const allTasks = await db.tasks.toArray();

        for (const task of allTasks) {
            try {
                // Skip if already synced or deleted
                if (task.syncStatus === 'synced' || task.isDeleted) {
                    continue;
                }

                const supabaseTask = {
                    user_id: user.id,
                    date: task.date,
                    name: task.name,
                    status: task.status,
                    priority: task.priority,
                    target_time: task.targetTime,
                    description: task.description || '',
                    completed_description: task.completedDescription || null,
                    progress: task.progress || 0,
                    is_repeating: task.isRepeating || false,
                    is_deleted: task.isDeleted || false,
                    created_at: task.createdAt || new Date().toISOString(),
                    updated_at: task.updatedAt || task.createdAt || new Date().toISOString()
                };

                const { error } = await supabase
                    .from('tasks')
                    .upsert(supabaseTask, {
                        onConflict: 'user_id,date,name' // Prevent duplicates
                    });

                if (error) {
                    result.errors.push(`Task "${task.name}": ${error.message}`);
                } else {
                    // Mark as synced in local DB
                    await db.tasks.update(task.id!, {
                        syncStatus: 'synced',
                        userId: user.id
                    });
                    result.tasksSynced++;
                }
            } catch (err: any) {
                result.errors.push(`Task "${task.name}": ${err.message}`);
            }
        }

        // 2. Migrate Sessions
        console.log('⏱️  Migrating sessions...');
        const allSessions = await db.sessions.toArray();

        for (const session of allSessions) {
            try {
                // Skip if already synced or deleted
                if (session.syncStatus === 'synced' || session.isDeleted) {
                    continue;
                }

                const supabaseSession = {
                    user_id: user.id,
                    date: session.date,
                    task_id: null, // Can't reliably link without UUIDs
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
                        onConflict: 'user_id,date,start_time,end_time' // Prevent duplicates
                    });

                if (error) {
                    result.errors.push(`Session at ${session.startTime}: ${error.message}`);
                } else {
                    await db.sessions.update(session.id!, {
                        syncStatus: 'synced',
                        userId: user.id
                    });
                    result.sessionsSynced++;
                }
            } catch (err: any) {
                result.errors.push(`Session at ${session.startTime}: ${err.message}`);
            }
        }

        // 3. Migrate Sleep Entries
        console.log('😴 Migrating sleep entries...');
        const allSleepEntries = await db.sleepEntries.toArray();

        for (const entry of allSleepEntries) {
            try {
                if (entry.syncStatus === 'synced') {
                    continue;
                }

                const supabaseSleep = {
                    user_id: user.id,
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
                        userId: user.id
                    });
                    result.sleepEntriesSynced++;
                }
            } catch (err: any) {
                result.errors.push(`Sleep entry ${entry.date}: ${err.message}`);
            }
        }

        result.success = true;
        console.log('✅ Migration complete!', result);

        return result;

    } catch (error: any) {
        result.errors.push(`Migration failed: ${error.message}`);
        console.error('❌ Migration error:', error);
        return result;
    }
}

/**
 * Helper function to display migration results to user
 */
export function formatMigrationResult(result: MigrationResult): string {
    if (!result.success) {
        return `❌ Migration failed:\n${result.errors.join('\n')}`;
    }

    let message = '✅ Migration successful!\n\n';
    message += `📋 Tasks synced: ${result.tasksSynced}\n`;
    message += `⏱️  Sessions synced: ${result.sessionsSynced}\n`;
    message += `😴 Sleep entries synced: ${result.sleepEntriesSynced}\n`;

    if (result.errors.length > 0) {
        message += `\n⚠️  ${result.errors.length} errors occurred:\n`;
        message += result.errors.slice(0, 5).join('\n');
        if (result.errors.length > 5) {
            message += `\n...and ${result.errors.length - 5} more`;
        }
    }

    return message;
}
