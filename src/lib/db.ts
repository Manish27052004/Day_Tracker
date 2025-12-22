import Dexie, { type EntityTable } from 'dexie';
import { getTodayIST, formatToIST } from '@/utils/dateUtils';

// Types for our database entities
export interface Task {
  id?: number;
  date: string; // ISO date string YYYY-MM-DD
  name: string;
  status: 'lagging' | 'on-track' | 'overachiever';
  priority: string | null;
  targetTime: number; // in minutes
  description: string;
  completedDescription: string;
  progress: number; // 0-100+
  isRepeating: boolean; // for daily repeating tasks
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'pending' | 'synced' | 'error';
  userId?: string;
  isDeleted?: boolean; // Soft delete flag
}

export interface Session {
  id?: number;
  date: string;
  taskId: number | null;
  customName: string; // custom session name when not linked to task
  category: string | null;
  categoryType: 'work' | 'life' | null;
  startTime: string; // HH:mm format
  endTime: string;
  description: string;
  createdAt: Date;
  syncStatus: 'pending' | 'synced' | 'error';
  userId?: string;
  isDeleted?: boolean; // Soft delete flag
}

export interface SleepEntry {
  id?: number;
  date: string;
  wakeUpTime: string;
  bedTime: string;
  syncStatus: 'pending' | 'synced' | 'error';
  userId?: string;
}

export interface RepeatingTask {
  id?: number;
  name: string;
  priority: string;
  targetTime: number;
  description: string;

  // Repeat configuration
  repeatPattern: 'daily' | 'weekly' | 'custom';
  repeatDays?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday (for weekly/custom)
  addAtTime?: string; // HH:mm format - optional time when task should be added

  category?: string;
  categoryType?: 'work' | 'life';
  color?: string;

  // Template metadata
  isDefault: boolean; // Flag for default template
  icon?: string; // Optional icon for template

  // Status
  strikeCount: number; // Legacy, kept for backward compatibility
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;

  // Strike System (Gamification)
  minCompletionTarget: number; // Minimum % to count as achieved (default 50)
  achieverStrike: number; // Consecutive days meeting minimum
  fighterStrike: number; // Consecutive days exceeding 100%
  lastCompletedDate?: string; // ISO date of last completion (YYYY-MM-DD)
}

export interface Priority {
  id?: number;
  name: string;
  color: string; // e.g. text-danger, bg-success/10
  order: number;
}

export interface Category {
  id?: number;
  name: string;
  type: 'work' | 'life';
  color: string;
  order: number;
}

export interface DeletedTask {
  id?: number;
  date: string; // ISO date string YYYY-MM-DD
  taskName: string; // Name of the deleted task
  deletedAt: Date; // When it was deleted
}

// Create Dexie database
const db = new Dexie('DailyTrackerDB') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  sleepEntries: EntityTable<SleepEntry, 'id'>;
  repeatingTasks: EntityTable<RepeatingTask, 'id'>;
  priorities: EntityTable<Priority, 'id'>;
  categories: EntityTable<Category, 'id'>;
  deletedTasks: EntityTable<DeletedTask, 'id'>;
};

// Define schema - Version 5 adds priorities and categories

// Define schema - Version 5 adds priorities and categories
db.version(5).stores({
  tasks: '++id, date, status, priority, isRepeating, createdAt',
  sessions: '++id, date, taskId, category, categoryType, startTime',
  sleepEntries: '++id, date',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order'
}).upgrade(async tx => {
  // Version 5 Seeding - (Left for historical correctness, but v6 covers it more robustly)
  // We can rely on v6 upgrade to fix things even if v5 ran partially.
});

// Version 6: Fix seeding, migrate to rich colors, AND normalize legacy data
db.version(6).stores({
  tasks: '++id, date, status, priority, isRepeating, createdAt',
  sessions: '++id, date, taskId, category, categoryType, startTime',
  sleepEntries: '++id, date',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order'
}).upgrade(async tx => {
  const COLORS = {
    red: 'bg-danger/10 text-danger border-danger/20',
    green: 'bg-success/10 text-success border-success/20',
    blue: 'bg-info/10 text-info border-info/20',
    yellow: 'bg-warning/10 text-warning border-warning/20',
    grey: 'bg-muted text-muted-foreground border-border'
  };

  // 1. Restore/Migrate Priorities
  const existingPriorities = await tx.table('priorities').toArray();
  const defaultPriorities = [
    { name: 'Urgent & Important', color: COLORS.red, order: 1 },
    { name: 'Urgent & Not Important', color: COLORS.yellow, order: 2 },
    { name: 'Not Urgent & Important', color: COLORS.blue, order: 3 },
    { name: 'Not Urgent & Not Important', color: COLORS.grey, order: 4 }
  ];

  if (existingPriorities.length === 0) {
    await tx.table('priorities').bulkAdd(defaultPriorities);
  } else {
    // Update legacy colors if present
    for (const p of existingPriorities) {
      let newColor = null;
      if (p.color === 'priority-urgent-important') newColor = COLORS.red;
      else if (p.color === 'priority-urgent-not-important') newColor = COLORS.yellow;
      else if (p.color === 'priority-not-urgent-important') newColor = COLORS.blue;
      else if (p.color === 'priority-not-urgent-not-important') newColor = COLORS.grey;

      if (newColor) {
        await tx.table('priorities').update(p.id, { color: newColor });
      }
    }
  }

  // 2. Restore/Migrate Categories
  const existingCategories = await tx.table('categories').toArray();
  const defaultCategories = [
    // Work
    { name: 'Deep Focus', type: 'work', color: COLORS.green, order: 1 },
    { name: 'Focus', type: 'work', color: COLORS.blue, order: 2 },
    { name: 'Distracted', type: 'work', color: COLORS.yellow, order: 3 },
    // Life
    { name: 'Sleep', type: 'life', color: COLORS.blue, order: 4 },
    { name: 'Routine', type: 'life', color: COLORS.grey, order: 5 },
    { name: 'Habits', type: 'life', color: COLORS.green, order: 6 },
    { name: 'Wasted Time', type: 'life', color: COLORS.red, order: 7 }
  ];

  for (const def of defaultCategories) {
    const match = existingCategories.find(c => c.name === def.name && c.type === def.type);
    if (!match) {
      // Missing, add it
      await tx.table('categories').add(def);
    } else {
      // Exists, check if legacy color
      let newColor = null;
      if (match.color === 'text-success') newColor = COLORS.green;
      else if (match.color === 'text-info') newColor = COLORS.blue;
      else if (match.color === 'text-warning') newColor = COLORS.yellow;
      else if (match.color === 'text-muted-foreground') newColor = COLORS.grey;
      else if (match.color === 'text-danger') newColor = COLORS.red;

      if (newColor) {
        await tx.table('categories').update(match.id, { color: newColor });
      }
    }
  }

  // 3. Normalize Legacy Data (Tasks & Sessions)
  const priorityMap: Record<string, string> = {
    'urgent-important': 'Urgent & Important',
    'urgent-not-important': 'Urgent & Not Important',
    'not-urgent-important': 'Not Urgent & Important',
    'not-urgent-not-important': 'Not Urgent & Not Important'
  };

  const categoryMap: Record<string, string> = {
    'deep-focus': 'Deep Focus',
    'focus': 'Focus',
    'distracted': 'Distracted',
    'sleep': 'Sleep',
    'routine': 'Routine',
    'habits': 'Habits',
    'wasted-time': 'Wasted Time'
  };

  // Update Tasks
  await tx.table('tasks').toCollection().modify(task => {
    if (priorityMap[task.priority]) {
      task.priority = priorityMap[task.priority];
    }
  });

  // Update RepeatingTasks
  await tx.table('repeatingTasks').toCollection().modify(task => {
    if (priorityMap[task.priority]) {
      task.priority = priorityMap[task.priority];
    }
  });

  // Update Sessions
  await tx.table('sessions').toCollection().modify(session => {
    if (categoryMap[session.category]) {
      session.category = categoryMap[session.category];
    }
  });
});

// Version 7: Force Restore Priorities (Merge Strategy like Categories)
db.version(7).stores({
  tasks: '++id, date, status, priority, isRepeating, createdAt',
  sessions: '++id, date, taskId, category, categoryType, startTime',
  sleepEntries: '++id, date',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order'
}).upgrade(async tx => {
  const COLORS = {
    red: 'bg-danger/10 text-danger border-danger/20',
    green: 'bg-success/10 text-success border-success/20',
    blue: 'bg-info/10 text-info border-info/20',
    yellow: 'bg-warning/10 text-warning border-warning/20',
    grey: 'bg-muted text-muted-foreground border-border'
  };

  const defaultPriorities = [
    { name: 'Urgent & Important', color: COLORS.red, order: 1 },
    { name: 'Urgent & Not Important', color: COLORS.yellow, order: 2 },
    { name: 'Not Urgent & Important', color: COLORS.blue, order: 3 },
    { name: 'Not Urgent & Not Important', color: COLORS.grey, order: 4 }
  ];

  const existingPriorities = await tx.table('priorities').toArray();

  for (const def of defaultPriorities) {
    const match = existingPriorities.find(p => p.name === def.name);
    if (!match) {
      await tx.table('priorities').add(def);
    } else {
      // Ensure color is updated to rich format if it matches legacy
      let newColor = null;
      if (match.color === 'priority-urgent-important') newColor = COLORS.red;
      else if (match.color === 'priority-urgent-not-important') newColor = COLORS.yellow;
      else if (match.color === 'priority-not-urgent-important') newColor = COLORS.blue;
      else if (match.color === 'priority-not-urgent-not-important') newColor = COLORS.grey;

      if (newColor) {
        await tx.table('priorities').update(match.id, { color: newColor });
      }
    }
  }
});

// Version 8: Update Default Priorities Colors to match user preference (Red, Purple, Green, Grey)
db.version(8).stores({
  tasks: '++id, date, status, priority, isRepeating, createdAt',
  sessions: '++id, date, taskId, category, categoryType, startTime',
  sleepEntries: '++id, date',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order'
}).upgrade(async tx => {
  const COLORS = {
    red: 'bg-danger/10 text-danger border-danger/20',
    green: 'bg-success/10 text-success border-success/20',
    blue: 'bg-info/10 text-info border-info/20',
    yellow: 'bg-warning/10 text-warning border-warning/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20', // Added Purple
    grey: 'bg-muted text-muted-foreground border-border'
  };

  const defaultPriorities = [
    { name: 'Urgent & Important', color: COLORS.red, order: 1 },
    { name: 'Urgent & Not Important', color: COLORS.purple, order: 2 }, // Changed to Purple
    { name: 'Not Urgent & Important', color: COLORS.green, order: 3 }, // Changed to Green
    { name: 'Not Urgent & Not Important', color: COLORS.grey, order: 4 }
  ];

  const existingPriorities = await tx.table('priorities').toArray();

  for (const def of defaultPriorities) {
    const match = existingPriorities.find(p => p.name === def.name);
    if (!match) {
      await tx.table('priorities').add(def);
    } else {
      // Force update color to match the "Correct" default if it was set to one of the "Review" colors I guessed previously
      // This ensures if v6/v7 ran and set them to Yellow/Blue, we fix them to Purple/Green
      await tx.table('priorities').update(match.id, { color: def.color });
    }
  }
});

// Version 9: IST Timezone Fix (Clean Start)
db.version(9).stores({
  tasks: '++id, date, status, priority, isRepeating, createdAt',
  sessions: '++id, date, taskId, category, categoryType, startTime',
  sleepEntries: '++id, date',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order'
}).upgrade(async tx => {
  // IST Timezone Fix: Clear all date-dependent data for clean start
  // This ensures all future dates will be in proper IST format

  console.log('🕐 IST Timezone Migration: Clearing date-dependent data...');

  await tx.table('tasks').clear();
  await tx.table('sessions').clear();
  await tx.table('sleepEntries').clear();

  // Keep priorities, categories, and templates (not date-dependent)
  console.log('✅ IST Timezone Migration Complete. All data will now use Asia/Kolkata timezone.');
});

// Version 10: Sync Support
db.version(10).stores({
  tasks: '++id, date, status, priority, isRepeating, createdAt, syncStatus, userId',
  sessions: '++id, date, taskId, category, categoryType, startTime, syncStatus, userId',
  sleepEntries: '++id, date, syncStatus, userId',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order'
}).upgrade(async tx => {
  // Initialize sync fields for existing records
  await tx.table('tasks').toCollection().modify({ syncStatus: 'pending', userId: 'local' });
  await tx.table('sessions').toCollection().modify({ syncStatus: 'pending', userId: 'local' });
  await tx.table('sleepEntries').toCollection().modify({ syncStatus: 'pending', userId: 'local' });
});

// Version 11: Strike System (Gamification)
db.version(11).stores({
  tasks: '++id, date, status, priority, isRepeating, createdAt, syncStatus, userId',
  sessions: '++id, date, taskId, category, categoryType, startTime, syncStatus, userId',
  sleepEntries: '++id, date, syncStatus, userId',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order'
}).upgrade(async tx => {
  console.log('🎯 Strike System Migration: Adding gamification fields...');

  // Initialize strike fields for all existing templates
  await tx.table('repeatingTasks').toCollection().modify(template => {
    template.minCompletionTarget = template.minCompletionTarget ?? 50; // Default 50%
    template.achieverStrike = template.achieverStrike ?? 0;
    template.fighterStrike = template.fighterStrike ?? 0;
    template.lastCompletedDate = template.lastCompletedDate ?? undefined;
  });

  console.log('✅ Strike System Migration Complete!');
});

// Version 13: Force Restore & Fix
// Re-running migration to ensure deletedTasks exists and defaults are restored
db.version(13).stores({
  tasks: '++id, date, status, priority, isRepeating, createdAt, syncStatus, userId',
  sessions: '++id, date, taskId, category, categoryType, startTime, syncStatus, userId',
  sleepEntries: '++id, date, syncStatus, userId',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order',
  deletedTasks: '++id, [date+taskName], deletedAt'
}).upgrade(async tx => {
  console.log('🔄 Version 13 Migration: Ensuring integrity...');

  const COLORS = {
    red: 'bg-danger/10 text-danger border-danger/20',
    green: 'bg-success/10 text-success border-success/20',
    blue: 'bg-info/10 text-info border-info/20',
    yellow: 'bg-warning/10 text-warning border-warning/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    grey: 'bg-muted text-muted-foreground border-border'
  };

  const defaultPriorities = [
    { name: 'Urgent & Important', color: COLORS.red, order: 1 },
    { name: 'Urgent & Not Important', color: COLORS.purple, order: 2 },
    { name: 'Not Urgent & Important', color: COLORS.green, order: 3 },
    { name: 'Not Urgent & Not Important', color: COLORS.grey, order: 4 }
  ];

  const defaultCategories = [
    // Work
    { name: 'Deep Focus', type: 'work', color: COLORS.green, order: 1 },
    { name: 'Focus', type: 'work', color: COLORS.blue, order: 2 },
    { name: 'Distracted', type: 'work', color: COLORS.yellow, order: 3 },
    // Life
    { name: 'Sleep', type: 'life', color: COLORS.blue, order: 4 },
    { name: 'Routine', type: 'life', color: COLORS.grey, order: 5 },
    { name: 'Habits', type: 'life', color: COLORS.green, order: 6 },
    { name: 'Wasted Time', type: 'life', color: COLORS.red, order: 7 }
  ];

  // Restore priorities
  const priorityTable = tx.table('priorities');
  const existingPriorities = await priorityTable.toArray();
  for (const def of defaultPriorities) {
    if (!existingPriorities.some(p => p.name === def.name)) {
      await priorityTable.add(def);
    }
  }

  // Restore categories
  const categoryTable = tx.table('categories');
  const existingCategories = await categoryTable.toArray();
  for (const def of defaultCategories) {
    if (!existingCategories.some(c => c.name === def.name && c.type === def.type)) {
      await categoryTable.add(def);
    }
  }

  console.log('✅ Version 13 Migration Complete!');
});

export { db };

// Helper functions
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const parseDuration = (str: string): number => {
  const hoursMatch = str.match(/(\d+)h/);
  const minsMatch = str.match(/(\d+)m/);
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
  return hours * 60 + mins;
};

export const calculateDuration = (startTime: string, endTime: string): number => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
};

/**
 * Get date string in IST timezone (YYYY-MM-DD)
 * @deprecated Use formatToIST from dateUtils instead
 * Keeping this for backward compatibility but delegates to IST function
 */
export const getDateString = (date: Date): string => {
  return formatToIST(date);
};

// Calculate task progress from linked sessions
export const calculateTaskProgress = async (taskId: number, date: string): Promise<number> => {
  // Get all sessions linked to this task for this date
  const sessions = await db.sessions
    .where({ date, taskId })
    .toArray();

  // Calculate total duration from all linked sessions
  const totalMinutes = sessions.reduce((sum, session) => {
    if (!session.startTime || !session.endTime) return sum;
    return sum + calculateDuration(session.startTime, session.endTime);
  }, 0);

  // Get task target time
  const task = await db.tasks.get(taskId);
  if (!task || task.targetTime === 0) return 0;

  // Calculate percentage
  return Math.round((totalMinutes / task.targetTime) * 100);
};

// Generate tasks from active templates for a specific date
export const generateTasksFromTemplates = async (targetDate: string): Promise<void> => {
  const dayOfWeek = new Date(targetDate).getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Get active templates
  const templates = await db.repeatingTasks
    .filter(t => t.isActive === true)
    .toArray();

  for (const template of templates) {
    // Check if should generate for this day
    let shouldGenerate = false;

    if (template.repeatPattern === 'daily') {
      shouldGenerate = true;
    } else if (template.repeatPattern === 'weekly' || template.repeatPattern === 'custom') {
      shouldGenerate = template.repeatDays?.includes(dayOfWeek) || false;
    }

    if (!shouldGenerate) continue;

    // Check if already exists (by name)
    // This finds active AND soft-deleted tasks (since we don't filter !isDeleted here)
    // So if a task was soft-deleted, it counts as "existing" and we WON'T recreate it.
    const existing = await db.tasks
      .where({ date: targetDate, name: template.name })
      .first();

    if (existing) continue; // Already generated

    // Generate task from template
    await db.tasks.add({
      date: targetDate,
      name: template.name,
      status: 'lagging',
      priority: template.priority,
      targetTime: template.targetTime,
      description: template.description,
      completedDescription: '',
      progress: 0,
      isRepeating: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending',
      userId: 'local',
    });
  }
};
