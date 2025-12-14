import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// CLOUD-ONLY MODE
import { type Session, type Task, formatDuration, calculateDuration, getDateString, type Category } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
  const [categories, setCategories] = useState<any[]>([]);
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
          targetTime: t.target_time
        })));
      }
    };
    fetchTasks();
  }, [dateString, user]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      // Hardcoded categories for now
      setCategories([
        { id: 1, name: 'Deep Work', type: 'work', color: 'text-blue-600', order: 1 },
        { id: 2, name: 'Shallow Work', type: 'work', color: 'text-cyan-600', order: 2 },
        { id: 3, name: 'Meeting', type: 'work', color: 'text-purple-600', order: 3 },
        { id: 4, name: 'Exercise', type: 'life', color: 'text-green-600', order: 4 },
        { id: 5, name: 'Reading', type: 'life', color: 'text-amber-600', order: 5 },
        { id: 6, name: 'Social', type: 'life', color: 'text-pink-600', order: 6 }
      ]);
    };
    fetchCategories();
  }, []);

  // \ud83d\udd25 FIX: Add session with proper ID tracking
  const addSession = async () => {
    if (!user) {
      alert('Please sign in to add sessions');
      return;
    }

    const newSession = {
      user_id: user.id,
      date: dateString,
      task_id: null,
      custom_name: '',
      category: 'Deep Work',
      category_type: 'work',
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
    }
  };

  // \ud83d\udd25 FIX: Update session (not insert!)
  const updateSession = async (id: string, updates: Partial<any>) => {
    if (!user) return;

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
    }
  };

  // \ud83d\udd25 FIX: Delete session
  const deleteSession = async (id: string) => {
    if (!user) return;

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

  const getSessionDisplayName = (session: Session, linkedTask?: Task) => {
    if (session.customName) return session.customName;
    if (linkedTask?.name) return linkedTask.name;
    return '';
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
                            updateSession(session.id!, { categoryType: type as any, category: catName });
                          }}
                        >
                          <SelectTrigger className="h-8 w-full border-none bg-transparent hover:bg-muted/50 transition-colors justify-center">
                            <span className={cn('text-xs font-medium', getCategoryColor(session.category))}>
                              {session.category}
                            </span>
                          </SelectTrigger>
                          <SelectContent align="center">
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Work</div>
                            {workCategories.map(c => (
                              <SelectItem key={c.id} value={`work:${c.name} `}>
                                <span className={c.color}>{c.name}</span>
                              </SelectItem>
                            ))}
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase mt-2">Life</div>
                            {lifeCategories.map(c => (
                              <SelectItem key={c.id} value={`life:${c.name} `}>
                                <span className={c.color}>{c.name}</span>
                              </SelectItem>
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
                      <Textarea
                        value={session.description}
                        onChange={(e) => updateSession(session.id!, { description: e.target.value })}
                        placeholder="What did you accomplish?"
                        className="ghost-input min-h-[32px] text-xs resize-none"
                        rows={1}
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
