import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import Header from '@/components/Header';
import DateController from '@/components/DateController';
import SleepTracker from '@/components/SleepTracker';
import PhaseNavigation, { type Phase } from '@/components/PhaseNavigation';
import PlanningTable from '@/components/PlanningTable';
import ExecutionTable from '@/components/ExecutionTable';
import DailyBreakdown from '@/components/DailyBreakdown';
import { db } from '@/lib/db';
import { formatToIST, getLogicalDate } from '@/utils/dateUtils';
import { useTemplateGenerator } from '@/hooks/useTemplateGenerator';
import { useSync } from '@/hooks/useSync';
import { syncData } from '@/services/SyncManager';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

const Index = () => {
  const { dayStartHour } = useUserPreferences();

  // Initialize with logical date (e.g., if 2 AM and start is 4 AM -> Yesterday)
  const [selectedDate, setSelectedDate] = useState(() => getLogicalDate(new Date(), dayStartHour));
  // Initialize phase from localStorage
  const [activePhase, setActivePhase] = useState<Phase>(() => {
    return (localStorage.getItem('last_active_phase') as Phase) || 'planning';
  });
  const { fetchDateData, processSyncQueue } = useSync();
  const { user } = useAuth();

  // Persist phase changes
  useEffect(() => {
    localStorage.setItem('last_active_phase', activePhase);
  }, [activePhase]);

  // Auto-generate tasks from templates for TODAY only
  useTemplateGenerator();

  // Use IST timezone for date string
  const dateString = formatToIST(selectedDate);

  // Fetch data from cloud when date changes
  useEffect(() => {
    fetchDateData(dateString);
  }, [dateString, fetchDateData]);

  // === NEW: SyncManager Integration (TEMPORARILY DISABLED FOR DEBUGGING) ===
  // Trigger sync on mount and when user authenticates
  /*
  useEffect(() => {
    const runSync = async () => {
      if (user && navigator.onLine) {
        console.log('🔄 Running automatic sync...');
        const result = await syncData();
        if (!result.success && result.errors.length > 0) {
          console.warn('⚠️ Sync completed with errors:', result.errors);
        }
      }
    };
  
    // Initial sync when component mounts or user logs in
    runSync();
  }, [user]);
  
  // Sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online - triggering sync...');
      syncData();
    };
  
    const handleOffline = () => {
      console.log('📴 Offline - sync will resume when connection restored');
    };
  
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Periodic sync every 30 seconds (when online and authenticated)
  useEffect(() => {
    if (!user || !navigator.onLine) return;
  
    const syncInterval = setInterval(async () => {
      console.log('⏰ Periodic sync...');
      await syncData();
    }, 30000); // 30 seconds
  
    return () => clearInterval(syncInterval);
  }, [user]);
  */
  // === END: SyncManager Integration ===

  const sleepEntry = useLiveQuery(
    () => db.sleepEntries.where('date').equals(dateString).first(),
    [dateString]
  );

  // 🔥 NEW: Fetch previous day's sleep entry to link Bed Time
  const prevDate = new Date(selectedDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateString = formatToIST(prevDate);

  const prevSleepEntry = useLiveQuery(
    () => db.sleepEntries.where('date').equals(prevDateString).first(),
    [prevDateString]
  );

  const handleWakeUpChange = async (time: string) => {
    if (sleepEntry) {
      // Optimistic update with sync pending
      await db.sleepEntries.update(sleepEntry.id!, {
        wakeUpTime: time,
        syncStatus: 'pending' // Mark for sync
      });
    } else {
      await db.sleepEntries.add({
        date: dateString,
        wakeUpTime: time,
        bedTime: '',
        syncStatus: 'pending',
        userId: 'local'
      });
    }
    // Trigger Sync immediately
    processSyncQueue();
  };

  const handleBedTimeChange = async (time: string) => {
    if (sleepEntry) {
      await db.sleepEntries.update(sleepEntry.id!, {
        bedTime: time,
        syncStatus: 'pending' // Mark for sync
      });
    } else {
      await db.sleepEntries.add({
        date: dateString,
        wakeUpTime: '',
        bedTime: time,
        syncStatus: 'pending',
        userId: 'local'
      });
    }
    // Trigger Sync immediately
    processSyncQueue();
  };

  const renderPhaseContent = () => {
    switch (activePhase) {
      case 'planning':
        return <PlanningTable selectedDate={selectedDate} />;
      case 'execution':
        return <ExecutionTable selectedDate={selectedDate} wakeUpTime={sleepEntry?.wakeUpTime} />;
      case 'breakdown':
        return (
          <DailyBreakdown
            selectedDate={selectedDate}
            wakeUpTime={sleepEntry?.wakeUpTime}
            bedTime={sleepEntry?.bedTime}
            previousBedTime={prevSleepEntry?.bedTime}
            dayStartHour={dayStartHour}
          />
        );
      default:
        // Fallback to ensure we never render nothing if state is wonky
        return <PlanningTable selectedDate={selectedDate} />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl w-full">
      {/* Date Controller */}
      <DateController
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Sleep Tracker */}
      <SleepTracker
        wakeUpTime={sleepEntry?.wakeUpTime || ''}
        bedTime={sleepEntry?.bedTime || ''}
        onWakeUpChange={handleWakeUpChange}
        onBedTimeChange={handleBedTimeChange}
      />

      {/* Phase Navigation */}
      <PhaseNavigation
        activePhase={activePhase}
        onPhaseChange={setActivePhase}
      />

      {/* Phase Content */}
      <motion.div
        key={activePhase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {renderPhaseContent()}
      </motion.div>

      {/* Educational & Contextual Content for AdSense (Thin Content Fix) */}
      <div className="mt-16 bg-card rounded-lg p-6 md:p-8 shadow-sm border border-border/50 text-card-foreground">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-primary">How to Use This Tracker</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
            <li><strong className="text-foreground">Plan Your Day:</strong> Start by adding your daily tasks, appointments, and habits in the Planning phase.</li>
            <li><strong className="text-foreground">Execute & Track:</strong> Move to the Execution phase to mark tasks as complete, track your time, and log any unplanned activities.</li>
            <li><strong className="text-foreground">Review Progress:</strong> Use the Breakdown and Analytics screens to monitor your daily efficiency and long-term trends.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Why Track Your Daily Tasks?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Consistently tracking your daily activities is a proven method for improving productivity and time management. 
            By visualizing where your time goes, you can identify inefficiencies, stay focused on high-priority objectives, 
            and build lasting, positive habits. A daily tracker serves as a personal accountability partner, ensuring you 
            make incremental progress toward your goals every single day.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Features</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
            <li><strong className="text-foreground">Lightning Fast:</strong> Optimized client-side performance for immediate responsiveness.</li>
            <li><strong className="text-foreground">Local Storage:</strong> Your data is stored securely in your browser for maximum privacy.</li>
            <li><strong className="text-foreground">Distraction-Free:</strong> A clean, minimalist interface designed to keep you focused.</li>
            <li><strong className="text-foreground">Comprehensive Analytics:</strong> Visual breakdowns of your daily performance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-primary">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground">Is my tracking data secure?</h3>
              <p className="text-muted-foreground mt-1">Yes, everything is saved locally in your browser. If you enable sync features, data is encrypted securely.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Do I need an account to use this?</h3>
              <p className="text-muted-foreground mt-1">No, you can start tracking immediately without signing up. An account is only needed if you want to sync your data across multiple devices.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Can I use this on my phone?</h3>
              <p className="text-muted-foreground mt-1">Absolutely. This tracker is fully responsive and designed to work seamlessly across desktop, tablet, and mobile devices.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground">How does the habit matrix work?</h3>
              <p className="text-muted-foreground mt-1">The Habit Matrix gives you a bird's-eye view of your consistency over time, utilizing automated templates based on your routine.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
