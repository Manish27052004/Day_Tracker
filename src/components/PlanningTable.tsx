import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// DISABLED for Cloud-Only mode
// import { useLiveQuery } from 'dexie-react-hooks';
// import { db, type Task, getDateString, calculateTaskProgress } from '@/lib/db';
import { type Task, type Priority, getDateString } from '@/lib/db';
import { calculateDuration } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
// import { useSync } from '@/hooks/useSync';
// import { updateStrikesForTask } from '@/utils/strikeCalculator';
import ProgressRing from './ProgressRing';
import PriorityTag from './PriorityTag';
import DurationPicker from './DurationPicker';
import TaskProgressBar from './TaskProgressBar';
import StrikeBadge from './StrikeBadge';
import RepeatScheduleDialog from './RepeatScheduleDialog';
import TemplateDropdown from './TemplateDropdown';
import { SettingsDialog } from './SettingsDialog';
import { DebouncedInput } from './DebouncedInput';
import { DebouncedTextarea } from './DebouncedTextarea';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface PlanningTableProps {
  selectedDate: Date;
}

const PlanningTable = ({ selectedDate }: PlanningTableProps) => {
  const dateString = getDateString(selectedDate);
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});
  const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | undefined>();
  const isMobile = useIsMobile();

  // === CLOUD-ONLY MODE ===
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  /* 🔥 FIXED: Use NULL to distinguish "Loading" vs "No Sessions" */
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tasks from Supabase only
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setTasks([]);
        setSessions(null); // Clear sessions
        setLoading(false);
        return;
      }

      setLoading(true);
      setSessions(null); // 🔥 CRITICAL: Lock updates until new sessions arrive
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('date', dateString)
        .eq('user_id', user.id);
      // .is('is_deleted', false); // REMOVED - column doesn't exist yet

      if (!error && data) {
        // Convert from Supabase snake_case to camelCase
        const tasksConverted = data.map(t => ({
          id: t.id,
          date: t.date,
          name: t.name,
          status: t.status,
          priority: t.priority,
          targetTime: t.target_time,
          description: t.description || '',
          completedDescription: t.completed_description || '',
          progress: t.progress || 0,

          // 🔥 Streak fields
          templateId: t.template_id,
          achieverStrike: t.achiever_strike || 0,
          fighterStrike: t.fighter_strike || 0
        }));

        setTasks(tasksConverted);
      } else {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      }
      setLoading(false);
    };

    fetchTasks();
    fetchSessions(); // 🔥 NEW: Fetch sessions immediately
  }, [dateString, user]);

  // 🔥 NEW: Fetch sessions for progress calculation
  const fetchSessions = async () => {
    if (!user) {
      setSessions([]);
      return;
    }

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('date', dateString)
      .eq('user_id', user.id);

    if (error) {
      console.error("🚨 CRITICAL: Failed to fetch sessions. Aborting update to prevent data loss.", error);
      // Do not setSessions([]). Leave it as null to block the progress calculator!
      return;
    }

    if (data) {
      console.log(`   📦 Loaded ${data.length} sessions for ${dateString}`);
      setSessions(data);
    } else {
      setSessions([]);
    }
  };

  // 🔥 Calculate progress from sessions AND save to database
  useEffect(() => {
    // 🛑 STOP: If sessions is NULL, it means we are still loading. Do NOT calculate.
    // If sessions is [], it means loaded but empty (valid 0%).
    if (!tasks.length || sessions === null || !user) return;

    const updateProgressInDatabase = async () => {
      const progressMap: Record<string, number> = {};

      for (const task of tasks) {
        // Find all sessions for this task
        const taskSessions = sessions.filter((s: any) => s.task_id === task.id);

        // Calculate total minutes spent
        const totalMinutes = taskSessions.reduce((sum: number, session: any) => {
          const duration = calculateDuration(session.start_time, session.end_time);
          return sum + duration;
        }, 0);

        // Calculate percentage
        const progressPercent = task.targetTime > 0
          ? Math.round((totalMinutes / task.targetTime) * 100)
          : 0;

        progressMap[task.id] = progressPercent;

        // 🔥 CLIENT-SIDE STREAK CALCULATION
        const { calculateStreakForTask } = await import('@/lib/streakCalculator');

        const streaks = await calculateStreakForTask(
          user.id,
          task.templateId,
          task.date,
          progressPercent,
          task.name
        );

        // Check if we need to update in DB
        // 1. Progress changed locally vs DB
        const progressChanged = progressPercent !== task.progress;
        // 2. Streak changed (Staleness Check) - e.g., yesterday was updated
        const streakChanged =
          streaks.achiever_strike !== task.achieverStrike ||
          streaks.fighter_strike !== task.fighterStrike;

        // 🚨 SAFETY GUARD: If progress is dropping from >0 to 0 AUTOMATICALLY, it's likely a bug.
        const isDangerousDrop = task.progress > 0 && progressPercent === 0;

        if (isDangerousDrop) {
          console.warn(`🛑 PREVENTED AUTO-RESET: Task '${task.name}' 100% -> 0%. Keeping ${task.progress}%.`);
          continue;
        }

        if (progressChanged || streakChanged) {
          // console.log(`♻️ Syncing task ${task.id}...`);

          // 2. Optimistic UI update
          setTasks((prevTasks) =>
            prevTasks.map((t) =>
              t.id === task.id
                ? {
                  ...t,
                  progress: progressPercent,
                  achieverStrike: streaks.achiever_strike,
                  fighterStrike: streaks.fighter_strike
                }
                : t
            )
          );

          // 3. Save to database with calculated values
          const { error: updateError } = await supabase
            .from('tasks')
            .update({
              progress: progressPercent,
              achiever_strike: streaks.achiever_strike,
              fighter_strike: streaks.fighter_strike,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)
            .eq('user_id', user.id);

          if (updateError) {
            console.error('❌ Database UPDATE FAILED:', updateError);
            // Revert optimistic update on error
            setTasks((prevTasks) =>
              prevTasks.map((t) =>
                t.id === task.id
                  ? {
                    ...t,
                    progress: task.progress,
                    achieverStrike: task.achieverStrike,
                    fighterStrike: task.fighterStrike
                  }
                  : t
              )
            );
          } else {
            // success silently
          }
        }
      }

      setTaskProgress(progressMap);
    };

    updateProgressInDatabase();
  }, [tasks, sessions, user]);

  // Fetch priorities from Supabase (Dynamic)
  useEffect(() => {
    const fetchPriorities = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('priorities')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true });

      if (data) setPriorities(data);
    };
    fetchPriorities();

    // Subscribe to changes? For now, just fetch on mount.
    // Ideally we subscribe to realtime, but simplest is fetch on mount + refresh on settings close.
    // Dialog handles refresh locally for itself, but not for this component unless we lift state.
    // For now, user might need to refresh page if they change settings, OR we can listen to onOpenChange of settings.
    // We can add a simple "refetch" prop or just refetch when settings closes.
  }, [user, settingsOpen]); // Refetch when settings dialog closes

  // Streak calculation is now handled by PostgreSQL trigger
  // See: migrations/001_create_streak_trigger.sql

  // === CLOUD-ONLY FUNCTIONS ===

  const addTask = async () => {
    if (!user) {
      alert('Please sign in to add tasks');
      return;
    }

    const newTask = {
      // DON'T include 'id' - let Supabase auto-generate it
      user_id: user.id,
      date: dateString,
      name: '',
      status: 'lagging',
      priority: null,
      target_time: 60,
      description: '',
      completed_description: '',
      progress: 0,

      // is_deleted: false, // REMOVED - column doesn't exist in Supabase yet
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedData, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single(); // Get single row instead of array

    if (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task: ' + error.message);
    } else if (insertedData) {
      // ✨ OPTIMISTIC UPDATE - Add to UI immediately
      const taskConverted = {
        id: insertedData.id,
        date: insertedData.date,
        name: insertedData.name,
        status: insertedData.status,
        priority: insertedData.priority,
        targetTime: insertedData.target_time,
        description: insertedData.description || '',
        completedDescription: insertedData.completed_description || '',
        progress: insertedData.progress || 0,

      };

      setTasks(prevTasks => [...prevTasks, taskConverted]);
    }
  };

  const updateTask = async (id: string, updates: Partial<any>) => {
    if (!user) return;

    const supabaseUpdates: any = {};
    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
    if (updates.targetTime !== undefined) supabaseUpdates.target_time = updates.targetTime;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.progress !== undefined) supabaseUpdates.progress = updates.progress;

    supabaseUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('tasks')
      .update(supabaseUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating task:', error);
    } else {
      // Update local state optimistically
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === id ? { ...t, ...updates } : t
        )
      );
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;

    // Hard delete since is_deleted column doesn't exist in Supabase
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting task:', error);
    } else {
      // Remove from UI immediately
      setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
    }
  };

  const handleTemplateSelect = async (template: any) => {
    if (!user) {
      alert('Please sign in to add tasks');
      return;
    }

    console.log('🔥 Creating task from template:', template);

    // 🔥 FIX: Convert Cloud integer ID to distinct UUID format (Offset from Local IDs)
    // Local Dexie IDs used 0000... prefix. We use ffff... for Cloud to prevent collision.
    const templateUuid = `ffffffff-ffff-ffff-ffff-${String(template.id).padStart(12, '0')}`;
    console.log('📝 Template ID conversion (Cloud):', template.id, '→', templateUuid);

    // Streaks will be calculated automatically by PostgreSQL trigger
    // See: migrations/001_create_streak_trigger.sql

    // Create task from selected template with Supabase
    const newTask = {
      // DON'T include 'id' - let Supabase auto-generate it
      user_id: user.id,
      date: dateString,
      name: template.name || '',
      status: 'lagging',
      priority: template.priority || null,
      target_time: template.targetTime || 60,
      description: template.description || '',
      completed_description: '',
      progress: 0,

      // 🔥 Save template_id so trigger can calculate streaks
      template_id: templateUuid,
      // Trigger will set these automatically based on yesterday's task
      achiever_strike: 0,
      fighter_strike: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedData, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single(); // Get single row

    if (error) {
      console.error('Error adding task from template:', error);
      alert('Failed to add task: ' + error.message);
    } else if (insertedData) {
      console.log('✅ Task created with template_id:', insertedData.template_id);
      console.log('✅ Base streaks saved:', {
        achiever: insertedData.achiever_strike,
        fighter: insertedData.fighter_strike
      });

      // ✨ OPTIMISTIC UPDATE - Add to UI immediately
      const taskConverted = {
        id: insertedData.id,
        date: insertedData.date,
        name: insertedData.name,
        status: insertedData.status,
        priority: insertedData.priority,
        targetTime: insertedData.target_time,
        description: insertedData.description || '',
        completedDescription: insertedData.completed_description || '',
        progress: insertedData.progress || 0,

        // 🔥 Include streak data
        templateId: insertedData.template_id,
        achieverStrike: insertedData.achiever_strike || 0,
        fighterStrike: insertedData.fighter_strike || 0
      };

      setTasks(prevTasks => [...prevTasks, taskConverted]);
    }
  };

  // Removed incrementStrike function - strike_count column no longer exists

  const handleRecalculateStreak = async (task: any) => {
    const confirmed = window.confirm(`Recalculate entire streak history for "${task.name}"? This will fix gaps in history.`);
    if (!confirmed) return;

    try {
      const { recalculateStreakChain } = await import('@/lib/streakCorrection');
      await recalculateStreakChain(user?.id || '', task.templateId, task.name);
      alert('Recalculation complete. Refreshing...');
      window.location.reload();
    } catch (e) {
      console.error('Recalculation failed', e);
      alert('Failed to recalculate');
    }
  };

  return (
    <motion.div
      className="notion-card overflow-hidden w-full space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Mobile Card View */}
      {isMobile ? (
        <div className="p-4 space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {tasks?.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-card rounded-xl border border-border/60 shadow-sm p-3 relative group"
              >
                {/* Header: Strike & Priority & Delete */}
                <div className="flex justify-between items-start mb-3">
                  {/* Strike (Left) */}
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <div className="flex flex-col items-center justify-center min-w-[32px]">
                        {task.achieverStrike === 0 && task.fighterStrike === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {task.achieverStrike > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">🔥</span>
                                <span className="text-xs font-semibold text-orange-600">
                                  {task.achieverStrike}
                                </span>
                              </div>
                            )}
                            {task.fighterStrike > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">⚔️</span>
                                <span className="text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
                                  {task.fighterStrike}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleRecalculateStreak(task)}>
                        Recalculate History
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>

                  {/* Priority (Middle) */}
                  <div className="flex-1 flex justify-center mx-2">
                    <Select
                      value={task.priority || ''}
                      onValueChange={(value) => updateTask(task.id!, { priority: value })}
                    >
                      <SelectTrigger className="h-6 w-auto min-w-[80px] border-none bg-transparent hover:bg-muted/50 transition-colors justify-center p-0 shadow-none">
                        <SelectValue>
                          <PriorityTag
                            priority={task.priority}
                            color={priorities.find(p => p.name === task.priority)?.color}
                          />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="center">
                        {priorities?.map(p => (
                          <SelectItem key={p.id} value={p.name}>
                            <PriorityTag priority={p.name} color={p.color} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delete (Right) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask(task.id!)}
                    className="h-6 w-6 text-muted-foreground hover:text-danger -mr-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Task Name */}
                <div className="mb-3">
                  <DebouncedInput
                    value={task.name}
                    onChange={(value) => updateTask(task.id!, { name: value })}
                    placeholder="Task name..."
                    className="ghost-input h-7 text-sm font-semibold flex-1 min-w-0"
                  />
                </div>

                {/* Progress Bar */}
                <div className="mb-3 px-1">
                  <TaskProgressBar
                    progress={task.id ? (taskProgress[task.id] || 0) : 0}
                    targetTime={task.targetTime}
                  />
                </div>

                {/* Description & Target */}
                <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                  <DebouncedTextarea
                    value={task.description}
                    onChange={(value) => updateTask(task.id!, { description: value })}
                    placeholder="Description..."
                    className="ghost-input min-h-[80px] text-xs resize-none"
                    rows={3}
                  />

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Target</span>
                    <DurationPicker
                      value={task.targetTime}
                      onChange={(minutes) => updateTask(task.id!, { targetTime: minutes })}
                    />
                  </div>
                </div>

                {/* Completed Desc */}
                {task.completedDescription && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded">
                    ✓ {task.completedDescription}
                  </div>
                )}

              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Desktop Table View */
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {/* Strike - Sticky Left 0 */}
                <th className="w-[80px] sticky left-0 z-20 bg-background border-r border-border px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Strike
                </th>
                {/* Task Name - Sticky Left 80px */}
                <th className="min-w-[250px] sticky left-[79px] z-20 bg-background border-r border-border pl-2 pr-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Task Name
                </th>
                <th className="min-w-[150px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">Progress</th>
                <th className="min-w-[150px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">Priority</th>
                <th className="min-w-[100px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">Target</th>
                <th className="min-w-[350px] px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Description</th>
                <th className="min-w-[300px] px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Completed</th>
                <th className="w-[80px] px-4 py-3"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/50">
              <AnimatePresence mode="popLayout">
                {tasks?.map((task, index) => {
                  // 🔍 DEBUG: Log task data
                  /* console.log('Task Data:', { ... }); */

                  return (
                    <motion.tr
                      key={task.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Strike - Sticky Left 0 */}
                      <td className="w-[80px] sticky left-0 z-20 bg-background group-hover:bg-background border-r border-border px-4 py-3 cursor-context-menu">
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <div className="flex flex-col items-center gap-1 h-full w-full justify-center min-h-[24px]">
                              {/* Display strikes directly from database */}
                              {task.achieverStrike === 0 && task.fighterStrike === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {/* Achiever Strike */}
                                  {task.achieverStrike > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-base">🔥</span>
                                      <span className="text-sm font-semibold text-orange-600">
                                        {task.achieverStrike}
                                      </span>
                                    </div>
                                  )}

                                  {/* Fighter Strike */}
                                  {task.fighterStrike > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-base">⚔️</span>
                                      <span className="text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
                                        {task.fighterStrike}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleRecalculateStreak(task)}>
                              Recalculate History
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </td>

                      {/* Task Name - Sticky Left 80px */}
                      <td className="min-w-[250px] sticky left-[79px] z-20 bg-background group-hover:bg-background border-r border-border pl-2 pr-4 py-3">
                        <div className="flex items-center gap-2">
                          <DebouncedInput
                            value={task.name}
                            onChange={(value) => updateTask(task.id!, { name: value })}
                            placeholder="Task name..."
                            className="ghost-input h-8 text-sm font-medium flex-1 min-w-0"
                          />
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="min-w-[150px] px-4 py-3">
                        <TaskProgressBar
                          progress={task.id ? (taskProgress[task.id] || 0) : 0}
                          targetTime={task.targetTime}
                        />
                      </td>

                      {/* Priority */}
                      <td className="min-w-[150px] px-4 py-3">
                        <div className="flex justify-center">
                          <Select
                            value={task.priority || ''}
                            onValueChange={(value) => updateTask(task.id!, { priority: value })}
                          >
                            <SelectTrigger className="h-8 w-full border-none bg-transparent hover:bg-muted/50 transition-colors justify-center">
                              <SelectValue>
                                <PriorityTag
                                  priority={task.priority}
                                  color={priorities.find(p => p.name === task.priority)?.color}
                                />
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="center">
                              {priorities?.map(p => (
                                <SelectItem key={p.id} value={p.name}>
                                  <PriorityTag priority={p.name} color={p.color} />
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      {/* Target Time */}
                      <td className="min-w-[100px] px-4 py-3">
                        <div className="flex justify-center">
                          <DurationPicker
                            value={task.targetTime}
                            onChange={(minutes) => updateTask(task.id!, { targetTime: minutes })}
                          />
                        </div>
                      </td>

                      {/* Description */}
                      <td className="min-w-[350px] px-4 py-3">
                        <DebouncedTextarea
                          value={task.description}
                          onChange={(value) => updateTask(task.id!, { description: value })}
                          placeholder="Description..."
                          className="ghost-input min-h-[80px] text-sm resize-none"
                          rows={3}
                        />
                      </td>

                      {/* Completed Description */}
                      <td className="min-w-[300px] px-4 py-3">
                        <p className="text-sm text-muted-foreground truncate">
                          {task.completedDescription || '—'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="w-[80px] px-4 py-3">
                        <div className="flex items-center justify-center gap-1">

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTask(task.id!)}
                            className="h-7 w-7 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Add Task Button with Template Dropdown */}
      <motion.div
        className="p-3 border-t border-dashed border-border/60 flex gap-2 items-center opacity-80 hover:opacity-100 transition-opacity"
      >
        <Button
          variant="ghost"
          onClick={() => addTask()}
          className="flex-1 justify-start text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-dashed border-transparent hover:border-border/50 h-9"
        >
          <Plus className="h-4 w-4 mr-2 opacity-50" />
          Add task...
        </Button>
        <TemplateDropdown onTemplateSelect={handleTemplateSelect} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Repeat Schedule Dialog */}
      <RepeatScheduleDialog
        open={repeatDialogOpen}
        onOpenChange={setRepeatDialogOpen}
        task={selectedTask}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab="priorities"
      />
    </motion.div>
  );
};
export default PlanningTable;
