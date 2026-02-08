import Dexie, { type EntityTable } from 'dexie';
import { getTodayIST, formatToIST } from '../utils/dateUtils';

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
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'pending' | 'synced' | 'error';
  userId?: string;
  isDeleted?: boolean; // Soft delete flag
  periodTaskId?: number; // Link to a Period Task (Sprint Goal)
}

export interface Session {
  id?: number;
  date: string;
  taskId: number | null;
  customName: string; // custom session name when not linked to task
  category: string | null;
  categoryType: 'work' | 'life' | 'untracked' | null;
  startTime: string; // HH:mm format
  endTime: string;
  description: string;
  richContent?: string; // JSON string for rich text editor content
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
  category?: string;
  description: string;
  richContent?: string; // JSON string for rich text editor content (SOPs, etc)

  // Repeat configuration
  repeatPattern: 'daily' | 'weekly' | 'custom';
  repeatDays?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday (for weekly/custom)
  addAtTime?: string; // HH:mm format - optional time when task should be added

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
  type: 'work' | 'life' | 'untracked';
  color: string;
  order: number;
}

export interface DeletedTask {
  id?: number;
  date: string; // ISO date string YYYY-MM-DD
  taskName: string; // Name of the deleted task
  deletedAt: Date; // When it was deleted
}


export interface Subject {
  id?: number;
  name: string;
  criteria: number; // e.g., 75
  professor?: string;
  color: string;
  // Stats (cached or calculated on fly)
  totalClasses?: number;
  attendedClasses?: number;

  syncStatus: 'pending' | 'synced' | 'error';
  userId?: string;
}

export interface AttendanceRecord {
  id?: number;
  subjectId: number;
  date: string; // ISO Date YYYY-MM-DD
  status: 'present' | 'absent' | 'cancelled';
  syncStatus: 'pending' | 'synced' | 'error';
  userId?: string;
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
  subjects: EntityTable<Subject, 'id'>;
  attendanceRecords: EntityTable<AttendanceRecord, 'id'>;
};

// ... (previous versions)

// Version 15: Rich Content
db.version(15).stores({
  tasks: '++id, date, status, priority, createdAt, syncStatus, userId',
  sessions: '++id, date, taskId, category, categoryType, startTime, syncStatus, userId',
  sleepEntries: '++id, date, syncStatus, userId',
  repeatingTasks: '++id, isActive, createdAt, repeatPattern, isDefault',
  priorities: '++id, name, order',
  categories: '++id, name, type, order',
  deletedTasks: '++id, [date+taskName], deletedAt',
  subjects: '++id, name, status, syncStatus, userId',
  attendanceRecords: '++id, subjectId, date, status, syncStatus, userId'
}).upgrade(async tx => {
  console.log('✨ Rich Content Manager Migration: Updating schema...');
  // No data migration needed, fields will just be undefined initially
});

export { db };

// Helper functions (kept as is)
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
  let diff = (endH * 60 + endM) - (startH * 60 + startM);

  // Handle overnight sessions (crossing midnight)
  if (diff < 0) {
    diff += 24 * 60;
  }
  return diff;
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

      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending',
      userId: 'local',
    });
  }
};
