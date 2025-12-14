import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// DISABLED for Cloud-Only mode
// import { useLiveQuery } from 'dexie-react-hooks';
// import { db, type Task, getDateString, calculateTaskProgress } from '@/lib/db';
import { type Task, getDateString } from '@/lib/db';
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
import { cn } from '@/lib/utils';

interface PlanningTableProps {
  selectedDate: Date;
}

const PlanningTable = ({ selectedDate }: PlanningTableProps) => {
  const dateString = getDateString(selectedDate);
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});
  const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | undefined>();

  // === CLOUD-ONLY MODE ===
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks from Supabase only
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
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
          isRepeating: t.is_repeating || false,
          strikeCount: t.strike_count || 0
        }));
        setTasks(tasksConverted);
      } else {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      }
      setLoading(false);
    };

    fetchTasks();
  }, [dateString, user]);

  // Fetch priorities from Supabase
  useEffect(() => {
    const fetchPriorities = async () => {
      // For now, use hardcoded priorities (or fetch from Supabase if you have a priorities table)
      setPriorities([
        { id: 1, name: 'Urgent & Important', color: 'bg-danger/10 text-danger border-danger/20', order: 1 },
        { id: 2, name: 'Urgent & Not Important', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', order: 2 },
        { id: 3, name: 'Not Urgent & Important', color: 'bg-success/10 text-success border-success/20', order: 3 },
        { id: 4, name: 'Not Urgent & Not Important', color: 'bg-muted text-muted-foreground border-border', order: 4 }
      ]);
    };
    fetchPriorities();
  }, []);

  // === CLOUD-ONLY FUNCTIONS ===

  const addTask = async (isRepeating: boolean = false) => {
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
      is_repeating: isRepeating,
      strike_count: 0,
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
        isRepeating: insertedData.is_repeating || false,
        strikeCount: insertedData.strike_count || 0
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
      is_repeating: false,
      strike_count: 0,
      // is_deleted: false, // REMOVED - column doesn't exist in Supabase yet
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
        isRepeating: insertedData.is_repeating || false,
        strikeCount: insertedData.strike_count || 0
      };

      setTasks(prevTasks => [...prevTasks, taskConverted]);
    }
  };

  const incrementStrike = async (id: string, currentCount: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('tasks')
      .update({
        strike_count: currentCount + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === id ? { ...t, strikeCount: currentCount + 1 } : t
        )
      );
    }
  };

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
              {/* Strike - Sticky Left 0 */}
              <th className="w-[80px] sticky left-0 z-20 bg-background border-r border-border px-4 py-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap">
                Strike
              </th>
              {/* Task Name - Sticky Left 80px */}
              <th className="min-w-[250px] sticky left-[80px] z-20 bg-background border-r border-border px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">
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
              {tasks?.map((task, index) => (
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
                  <td className="w-[80px] sticky left-0 z-20 bg-background group-hover:bg-background border-r border-border px-4 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <StrikeBadge taskName={task.name} />
                    </div>
                  </td>

                  {/* Task Name - Sticky Left 80px */}
                  <td className="min-w-[250px] sticky left-[80px] z-20 bg-background group-hover:bg-background border-r border-border px-4 py-3">
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
                            <PriorityTag priority={task.priority} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="center">
                          {priorities?.map(p => (
                            <SelectItem key={p.id} value={p.name}>
                              <PriorityTag priority={p.name} />
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
                      className="ghost-input min-h-[32px] text-sm resize-none"
                      rows={1}
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
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Add Task Button with Template Dropdown */}
      <motion.div
        className="p-4 border-t border-border/50 flex gap-2"
        whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }}
      >
        <Button
          variant="ghost"
          onClick={() => addTask(false)}
          className="flex-1 justify-start text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add task
        </Button>
        <TemplateDropdown onTemplateSelect={handleTemplateSelect} />
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
