import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, ArrowUp, ArrowDown, ArrowUpDown, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// CLOUD-ONLY MODE
import { type Session, type Task, formatDuration, calculateDuration, getDateString, type Category } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateStreakForTask } from '@/lib/streakCalculator'; // 🔥 FIX
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import TimePicker from './TimePicker';
import TaskComboBox from './TaskComboBox';
import { SettingsDialog } from './SettingsDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { List, Rows3 } from 'lucide-react';
// Removed Timeline imports

const DescriptionInput = ({ sessionId, initialDescription, selectedDate, onUpdate }: { sessionId: string; initialDescription: string; selectedDate: Date; onUpdate: (id: string, updates: Partial<Session>) => void }) => {
  const [description, setDescription] = useState(initialDescription || '');

  // CRITICAL FIX: Sync local state when session changes (date navigation)
  useEffect(() => {
    setDescription(initialDescription || '');
  }, [sessionId, initialDescription, selectedDate]);

  const handleBlur = () => {
    if (description !== initialDescription) {
      onUpdate(sessionId, { description });
    }
  };

  return (
    <Textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      onBlur={handleBlur}
      placeholder="What did you accomplish?"
      className="ghost-input min-h-[80px] text-xs resize-none"
      rows={3}
    />
  );
};

interface ExecutionTableProps {
  selectedDate: Date;
  wakeUpTime?: string;
}

const ExecutionTable = ({ selectedDate, wakeUpTime }: ExecutionTableProps) => {
  const dateString = getDateString(selectedDate);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // CLOUD-ONLY STATE
  const [sessions, setSessions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting State
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('execution_table_sort_order');
    return (saved === 'asc' || saved === 'desc') ? saved : 'asc';
  });

  // Persist sort order
  useEffect(() => {
    localStorage.setItem('execution_table_sort_order', sortOrder);
  }, [sortOrder]);

  // 🔥 FIX: Track session IDs to prevent duplicates
  const [sessionIds, setSessionIds] = useState<Map<number, string>>(new Map());

  // Fetch sessions from Supabase
  useEffect(() => {
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

      if (!error && data) {
        const sessionsConverted = data.map(s => ({
          id: s.id,
          date: s.date,
          taskId: s.task_id,
          customName: s.custom_name || '',
          category: s.category,
          categoryType: s.category_type,
          startTime: s.start_time,
          endTime: s.end_time,
          description: s.description || '',
          richContent: s.rich_content || ''
        }));
        setSessions(sessionsConverted);
      }
      setLoading(false);
    };
    fetchSessions();
  }, [dateString, user]);

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('date', dateString)
        .eq('user_id', user.id);

      if (data) {
        setTasks(data.map(t => ({
          id: t.id,
          name: t.name,
          targetTime: t.target_time,
          templateId: t.template_id // 🔥 NEW: Needed for streak calculation
        })));
      }
    };
    fetchTasks();
  }, [dateString, user]);

  // Fetch categories (Dynamic from Supabase)
  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true) // 🔥 FIX: Hide archived categories
        .order('order', { ascending: true });

      if (data) setCategories(data as Category[]);
    };
    fetchCategories();
  }, [user, settingsOpen]); // Refetch when settings closes

  // ... (existing helper function: calculateDuration)

  // Inside ExecutionTable component:

  // 🔥 FIX: Client-Side Streak Calculation & Task Update
  const updateTaskProgress = async (taskId: string) => {
    if (!taskId || !user) return;

    // 1. Calculate total duration from ALL sessions for this task
    // Better: Fetch fresh sessions to ensure accuracy before writing to 'tasks'
    const { data: taskSessions } = await supabase
      .from('sessions')
      .select('start_time, end_time')
      .eq('task_id', taskId)
      .eq('date', dateString)
      .eq('user_id', user.id);

    if (!taskSessions) return;

    const totalMinutes = taskSessions.reduce((sum, s) => sum + calculateDuration(s.start_time, s.end_time), 0);

    // 2. Get Task details (Target Time & Template ID)
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const progressPercent = task.targetTime > 0
      ? Math.round((totalMinutes / task.targetTime) * 100)
      : 0;

    console.log(`♻️ Syncing Task ${taskId}: ${totalMinutes}m / ${task.targetTime}m = ${progressPercent}%`);

    // 3. Calculate Streak (Client-Side)
    const streaks = await calculateStreakForTask(
      user.id,
      task.templateId,
      dateString,
      progressPercent,
      task.name
    );

    // 4. Update Task in DB
    const { error } = await supabase
      .from('tasks')
      .update({
        progress: progressPercent,
        achiever_strike: streaks.achiever_strike,
        fighter_strike: streaks.fighter_strike,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) console.error('Error updating task progress:', error);
    else console.log(`✅ Task Updated: ${streaks.achiever_strike} 🔥 / ${streaks.fighter_strike} ⚔️`);
  };

  // 🔥 FIX: Time Overlap Validation Helper
  const isTimeOverlapping = (start: string, end: string, currentSessionId: number | null) => {
    // Convert HH:mm to minutes for comparison
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const startM = toMinutes(start);
    const endM = toMinutes(end);

    // Filter out the current session being edited
    const otherSessions = sessions.filter(s => s.id !== currentSessionId);

    return otherSessions.some(s => {
      const sStart = toMinutes(s.startTime);
      const sEnd = toMinutes(s.endTime);

      // Overlap logic: (StartA < EndB) && (EndA > StartB)
      return (startM < sEnd) && (endM > sStart);
    });
  };

  // 🔥 FIX: Add session with proper ID tracking and VALIDATION
  const addSession = async (overrideStartTime?: string) => {
    if (!user) {
      alert('Please sign in to add sessions');
      return;
    }

    // Get current time in HH:mm format
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find the latest end time from existing sessions
    // sort by end time to find the true last one
    const sortedByEnd = [...sessions].sort((a, b) => {
      const endA = a.endTime.split(':').map(Number);
      const endB = b.endTime.split(':').map(Number);
      return (endA[0] * 60 + endA[1]) - (endB[0] * 60 + endB[1]);
    });

    const lastSession = sortedByEnd[sortedByEnd.length - 1];

    let defaultStart = currentHHMM;
    // If override provided (Timeline Gap Click)
    if (overrideStartTime) {
      defaultStart = overrideStartTime;
    } else if (lastSession) {
      defaultStart = lastSession.endTime;
    } else if (wakeUpTime) {
      defaultStart = wakeUpTime;
    }

    // End time is always "now" (or same as start if start > now? No, user said "End time also same with time.now()")
    let defaultEnd = currentHHMM;

    // Small DX improvement: if start > end (e.g. last session ended in future?), set end = start
    // But user strictly said: "End time also same with time.now()"
    // So we stick to that. 

    // We REMOVE the blocking overlap check here. 
    // If defaults overlap, the user will see the visual warning on the new row and can adjust.
    // This prevents the "Cannot add session" block.


    // Default to first 'work' category if available, else 'Deep Work'
    const defaultCategory = categories.find(c => c.type === 'work') || categories[0] || { name: 'Deep Work', type: 'work' };

    const newSession = {
      user_id: user.id,
      date: dateString,
      task_id: null,
      custom_name: '',
      category: defaultCategory.name,
      category_type: defaultCategory.type,
      start_time: defaultStart,
      end_time: defaultEnd,
      description: '',
      created_at: new Date().toISOString()
    };

    const { data: insertedData, error } = await supabase
      .from('sessions')
      .insert(newSession)
      .select()
      .single();

    if (error) {
      console.error('Error adding session:', error);
      alert('Failed to add session: ' + error.message);
    } else if (insertedData) {
      // Add to UI immediately with the returned ID
      setSessions(prev => [...prev, {
        id: insertedData.id,
        date: insertedData.date,
        taskId: insertedData.task_id,
        customName: insertedData.custom_name || '',
        category: insertedData.category,
        categoryType: insertedData.category_type,
        startTime: insertedData.start_time,
        endTime: insertedData.end_time,
        description: insertedData.description || '',
        richContent: insertedData.rich_content || ''
      }]);

      // Update task if linked (though usually null on creation)
      if (insertedData.task_id) updateTaskProgress(insertedData.task_id);
    }
  };

  // 🔥 FIX: Update session (with Overlap Validation)
  const updateSession = async (id: string, updates: Partial<any>) => {
    if (!user) return;

    // Find the session before update
    const oldSession = sessions.find(s => s.id === id);
    if (!oldSession) return;
    const oldTaskId = oldSession.taskId;

    // 1. VALIDATION LOCAL CHECK
    // If times are changing, verify overlap
    if (updates.startTime || updates.endTime) {
      const newStart = updates.startTime || oldSession.startTime;
      const newEnd = updates.endTime || oldSession.endTime;

      if (isTimeOverlapping(newStart, newEnd, Number(id))) {
        // NON-BLOCKING WARNING:
        // We log it, but we ALLOW the update to proceed.
        // The UI will show the red "Time overlaps" warning.
        console.warn("Validation Warning: Overlapping time detected.");
      }
    }

    const supabaseUpdates: any = {};
    if (updates.taskId !== undefined) supabaseUpdates.task_id = updates.taskId;
    if (updates.customName !== undefined) supabaseUpdates.custom_name = updates.customName;
    if (updates.category !== undefined) supabaseUpdates.category = updates.category;
    if (updates.categoryType !== undefined) supabaseUpdates.category_type = updates.categoryType;
    if (updates.startTime !== undefined) supabaseUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) supabaseUpdates.end_time = updates.endTime;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;

    const { error } = await supabase
      .from('sessions')
      .update(supabaseUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating session:', error);
    } else {
      // Optimistic update
      setSessions(prev =>
        prev.map(s =>
          s.id === id ? { ...s, ...updates } : s
        )
      );

      // 🔥 UPDATE STREAKS
      const newTaskId = updates.taskId !== undefined ? updates.taskId : oldTaskId;

      if (oldTaskId && oldTaskId !== newTaskId) {
        await updateTaskProgress(oldTaskId);
      }
      if (newTaskId) {
        setTimeout(() => updateTaskProgress(newTaskId), 500);
      }
    }
  };

  // 🔥 FIX: Delete session
  const deleteSession = async (id: string) => {
    if (!user) return;

    const session = sessions.find(s => s.id === id); // Get task ID before delete

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting session:', error);
    } else {
      // Remove from UI
      setSessions(prev => prev.filter(s => s.id !== id));

      // Update Task
      if (session?.taskId) {
        setTimeout(() => updateTaskProgress(session.taskId), 500);
      }
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories?.find(c => c.name === categoryName);
    // Try to match partial for legacy support or just return default
    if (!category) {
      // Fallback for legacy kepab-case values
      const legacyMatch = categories?.find(c => c.name.toLowerCase().replace(' ', '-') === categoryName);
      return legacyMatch?.color || 'text-muted-foreground';
    }
    return category.color;
  };

  const workCategories = categories?.filter(c => c.type === 'work') || [];
  const lifeCategories = categories?.filter(c => c.type === 'life') || [];

  // Derived state for sorting
  const { dayStartHour } = useUserPreferences();

  const sortedSessions = [...sessions].sort((a, b) => {
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      // 🔥 Adjustment for Day Start Time (e.g. if start is 4 AM, then 2 AM is treated as 26:00)
      const adjustedH = h < dayStartHour ? h + 24 : h;
      return adjustedH * 60 + m;
    };
    const startA = timeToMinutes(a.startTime);
    const startB = timeToMinutes(b.startTime);

    return sortOrder === 'asc' ? startA - startB : startB - startA;
  });

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleUpdateRichContent = async (id: number, content: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ rich_content: content })
      .eq('id', id);

    if (error) {
      console.error("Failed to update rich content:", error);
    } else {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, richContent: content } : s));
    }
  };

  return (
    <motion.div
      className="notion-card h-[calc(100vh-200px)] flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="flex justify-between items-center px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold tracking-tight">Daily Execution</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Add Session Button (MOVED TO TOP) */}
      <motion.div
        className="p-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/10 flex gap-3 items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Button
          variant="secondary"
          onClick={() => { addSession(); }}
          className="flex-1 justify-center font-medium shadow-sm hover:translate-y-[-1px] transition-all active:translate-y-[0px] h-10"
        >
          <Plus className="h-4 w-4 mr-2 text-primary" />
          Add Session
        </Button>
      </motion.div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full border-collapse min-w-max">
          <thead className="sticky top-0 z-30">
            <tr className="bg-muted/90 backdrop-blur-sm border-b border-border shadow-sm">
              <th className="min-w-[250px] sticky left-0 z-40 bg-background/95 backdrop-blur-sm border-r border-border px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">
                Session
              </th>
              <th className="min-w-[140px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">Category</th>
              <th
                className="min-w-[120px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors group select-none"
                onClick={toggleSort}
                title={`Sort by Start Time (${sortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
              >
                <div className="flex items-center justify-center gap-1">
                  Start
                  {sortOrder === 'asc' ? (
                    <ArrowUp className="h-3 w-3 text-muted-foreground/70" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-muted-foreground/70" />
                  )}
                </div>
              </th>
              <th className="min-w-[120px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">End</th>
              <th className="min-w-[80px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">Duration</th>
              <th className="min-w-[300px] px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Notes</th>
              <th className="w-[50px] px-4 py-3"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/50">
            <AnimatePresence mode="popLayout" initial={false}>
              {sortedSessions?.map((session, index) => {
                const duration = calculateDuration(session.startTime, session.endTime);
                const selectValue = `${session.categoryType}:${session.category} `;
                const isOverlapping = isTimeOverlapping(session.startTime, session.endTime, session.id);

                return (
                  <motion.tr
                    key={session.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-muted/20 transition-colors group relative"
                  >
                    {/* Session (Task Link or Custom Name) - Sticky Left 0 */}
                    <td className="min-w-[250px] sticky left-0 z-20 bg-background group-hover:bg-background border-r border-border px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <TaskComboBox
                          tasks={tasks || []}
                          selectedTaskId={session.taskId}
                          customValue={session.customName}
                          onTaskSelect={(taskId, name) => {
                            if (taskId) updateSession(session.id!, { taskId, customName: '' });
                            else updateSession(session.id!, { taskId: null, customName: name });
                          }}
                          placeholder="Select task or type custom..."
                        />
                        {isOverlapping && (
                          <span className="text-[10px] text-destructive font-medium animate-pulse">
                            ⚠️ Time overlaps with existing session
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="min-w-[140px] px-4 py-3">
                      <div className="flex justify-center">
                        <Select
                          value={selectValue}
                          onValueChange={(value) => {
                            const [type, catName] = value.split(':');
                            const cleanCatName = catName.trim();
                            updateSession(session.id!, { categoryType: type as any, category: cleanCatName });
                          }}
                        >
                          <SelectTrigger className="h-8 w-full border-none bg-transparent hover:bg-muted/50 transition-colors justify-center">
                            <span className={cn('text-xs font-medium', getCategoryColor(session.category))}>
                              {session.category}
                            </span>
                          </SelectTrigger>
                          <SelectContent align="center">
                            {Array.from(new Set(categories.map(c => c.type))).sort().map((type) => (
                              <div key={type}>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase capitalize mt-2 first:mt-0">
                                  {type}
                                </div>
                                {categories.filter(c => c.type === type).map(c => (
                                  <SelectItem key={c.id} value={`${type}:${c.name} `}>
                                    <span className={c.color}>{c.name}</span>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>

                    {/* Start Time */}
                    <td className="min-w-[120px] px-4 py-3">
                      <div className={cn("flex justify-center transition-colors", isOverlapping && "text-destructive")}>
                        <TimePicker
                          value={session.startTime}
                          onChange={(time) => updateSession(session.id!, { startTime: time })}
                          placeholder="Start"
                          className={cn(isOverlapping && "text-destructive border-destructive/50 ring-destructive/30")}
                        />
                      </div>
                    </td>

                    {/* End Time */}
                    <td className="min-w-[120px] px-4 py-3">
                      <div className={cn("flex justify-center transition-colors", isOverlapping && "text-destructive")}>
                        <TimePicker
                          value={session.endTime}
                          onChange={(time) => updateSession(session.id!, { endTime: time })}
                          placeholder="End"
                          className={cn(isOverlapping && "text-destructive border-destructive/50 ring-destructive/30")}
                        />
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="min-w-[80px] px-4 py-3">
                      <div className="flex justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {duration > 0 ? formatDuration(duration) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="min-w-[300px] px-4 py-3">
                      <DescriptionInput
                        sessionId={session.id!}
                        initialDescription={session.description || ''}
                        selectedDate={selectedDate}
                        onUpdate={updateSession}
                      />
                      {session.richContent && session.richContent !== '' && (
                        <div className="flex justify-end mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm" title="Rich content attached">
                            <Paperclip className="w-3 h-3" />
                            Content
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="w-[50px] px-4 py-3">
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSession(session.id!)}
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



      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab="categories"
      />
    </motion.div>
  );
};

export default ExecutionTable;
