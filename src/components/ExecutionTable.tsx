import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
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

// Component to manage description field with local state
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
      className="ghost-input min-h-[32px] text-xs resize-none"
      rows={1}
    />
  );
};

interface ExecutionTableProps {
  selectedDate: Date;
}

const ExecutionTable = ({ selectedDate }: ExecutionTableProps) => {
  const dateString = getDateString(selectedDate);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useAuth();

  // CLOUD-ONLY STATE
  const [sessions, setSessions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
          description: s.description || ''
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

  // 🔥 FIX: Add session with proper ID tracking
  const addSession = async () => {
    if (!user) {
      alert('Please sign in to add sessions');
      return;
    }

    // Default to first 'work' category if available, else 'Deep Work'
    const defaultCategory = categories.find(c => c.type === 'work') || categories[0] || { name: 'Deep Work', type: 'work' };

    const newSession = {
      user_id: user.id,
      date: dateString,
      task_id: null,
      custom_name: '',
      category: defaultCategory.name,
      category_type: defaultCategory.type,
      start_time: '09:00',
      end_time: '10:00',
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
        description: insertedData.description || ''
      }]);

      // Update task if linked (though usually null on creation)
      if (insertedData.task_id) updateTaskProgress(insertedData.task_id);
    }
  };

  // 🔥 FIX: Update session (not insert!)
  const updateSession = async (id: string, updates: Partial<any>) => {
    if (!user) return;

    // Find the session before update to know previous Task ID (if changing tasks)
    const oldSession = sessions.find(s => s.id === id);
    const oldTaskId = oldSession?.taskId;

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
      // If task changed, update BOTH old and new tasks
      const newTaskId = updates.taskId !== undefined ? updates.taskId : oldTaskId;

      if (oldTaskId && oldTaskId !== newTaskId) {
        await updateTaskProgress(oldTaskId);
      }
      if (newTaskId) {
        // Add small delay to ensure Supabase read consistency if we are reading back sessions
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

  return (
    <motion.div
      className="notion-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Table Wrapper with Horizontal Scroll */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {/* Session - Sticky Left 0 */}
              <th className="min-w-[250px] sticky left-0 z-20 bg-background border-r border-border px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">
                Session
              </th>
              <th className="min-w-[140px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">Category</th>
              <th className="min-w-[120px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">Start</th>
              <th className="min-w-[120px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">End</th>
              <th className="min-w-[80px] px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">Duration</th>
              <th className="min-w-[300px] px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Notes</th>
              <th className="w-[50px] px-4 py-3"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/50">
            <AnimatePresence mode="popLayout">
              {sessions?.map((session, index) => {
                const duration = calculateDuration(session.startTime, session.endTime);

                // Construct Select Value: "type:name" to ensure uniqueness and parsing
                // Or just use name if names are unique. Current DB schema doesn't enforce unique names across types, but UI implies it.
                // Let's use `${ session.categoryType }:${ session.category } ` pattern just like before, but `session.category` is now the Name.
                // NOTE: The previous values had a trailing space? `work:${c.name} ` -> check if space is needed. 
                // Previous code: value={`work:${c.name} `}. Yes, trailing space. I will keep it for consistency.
                const selectValue = `${session.categoryType}:${session.category} `;

                return (
                  <motion.tr
                    key={session.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    {/* Session (Task Link or Custom Name) - Sticky Left 0 */}
                    <td className="min-w-[250px] sticky left-0 z-20 bg-background group-hover:bg-background border-r border-border px-4 py-3">
                      <TaskComboBox
                        tasks={tasks || []}
                        selectedTaskId={session.taskId}
                        customValue={session.customName}
                        onTaskSelect={(taskId, name) => {
                          if (taskId) {
                            // Link to existing task
                            updateSession(session.id!, { taskId, customName: '' });
                          } else {
                            // Custom name entry
                            updateSession(session.id!, { taskId: null, customName: name });
                          }
                        }}
                        placeholder="Select task or type custom..."
                      />
                    </td>

                    {/* Category */}
                    <td className="min-w-[140px] px-4 py-3">
                      <div className="flex justify-center">
                        <Select
                          value={selectValue}
                          onValueChange={(value) => {
                            const [type, catName] = value.split(':');
                            const cleanCatName = catName.trim(); // Remove the trailing space we added
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
                      <div className="flex justify-center">
                        <TimePicker
                          value={session.startTime}
                          onChange={(time) => updateSession(session.id!, { startTime: time })}
                          placeholder="Start"
                        />
                      </div>
                    </td>

                    {/* End Time */}
                    <td className="min-w-[120px] px-4 py-3">
                      <div className="flex justify-center">
                        <TimePicker
                          value={session.endTime}
                          onChange={(time) => updateSession(session.id!, { endTime: time })}
                          placeholder="End"
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

      {/* Add Session Button */}
      <motion.div
        className="p-4 border-t border-border/50 flex gap-2"
        whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }}
      >
        <Button
          variant="ghost"
          onClick={addSession}
          className="flex-1 justify-start text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add session
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </motion.div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab="categories"
      />
    </motion.div>
  );
};

export default ExecutionTable;
