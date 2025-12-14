import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import TimePicker from './TimePicker';

interface SleepTrackerProps {
  wakeUpTime: string;
  bedTime: string;
  onWakeUpChange: (time: string) => void;
  onBedTimeChange: (time: string) => void;
}

const SleepTracker = ({ wakeUpTime, bedTime, onWakeUpChange, onBedTimeChange }: SleepTrackerProps) => {
  return (
    <motion.div
      className="notion-card p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
        {/* Wake Up Time */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10 flex-shrink-0">
            <Sun className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Wake Up
            </label>
            <TimePicker
              value={wakeUpTime}
              onChange={onWakeUpChange}
              placeholder="Set wake up time"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-10 w-px bg-border flex-shrink-0" />
        <div className="sm:hidden h-px w-full bg-border" />

        {/* Bed Time */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-info/10 flex-shrink-0">
            <Moon className="h-5 w-5 text-info" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Bed Time
            </label>
            <TimePicker
              value={bedTime}
              onChange={onBedTimeChange}
              placeholder="Set bed time"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SleepTracker;
