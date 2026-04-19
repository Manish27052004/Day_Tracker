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
      {/* Primary Page Title for SEO Context */}
      <h1 className="text-3xl font-bold text-foreground mb-6 text-center tracking-tight">
        Smart Daily Habit & Task Tracker
      </h1>
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

      {/* Educational & Contextual Content for AdSense (Expanded Thin Content Fix) */}
      <div className="mt-16 bg-card rounded-lg p-6 md:p-10 shadow-sm border border-border/50 text-card-foreground">
        
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Master Your Day with Our Daily Tracker</h2>
          <p className="text-muted-foreground leading-relaxed text-lg text-justify">
            Creating and maintaining a structured daily routine is the fundamental difference between hoping for success and actively engineering it. Our Daily Tracker is purposefully built to bridge the gap between your long-term ambitions and your everyday actions. By recording your essential task and habits on a daily basis, you significantly improve your baseline consistency, minimizing the friction that typically derails productivity. Human psychology responds remarkably well to visual momentum—when you see a streak of successfully completed habits, you naturally experience the motivation required to keep that chain unbroken. Tracking your habits converts ambiguous goals into manageable, measurable micro-actions. Whether you're trying to establish a new morning ritual, ensure you execute high-priority professional tasks, or simply wish to reflect on where your time was spent throughout the day, the fundamental act of recording data provides unmatched clarity. Tracking enhances personal accountability; it shifts your perspective from a passive observer of your day to an active architect of your time, providing the structural integrity needed to achieve sustainable personal transformation.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-primary">How to Use the Tracker</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Effectively utilizing this application is designed to be frictionless, taking only a few minutes each day. Follow this straightforward methodology to get the most out of your daily routine:</p>
            <ol className="list-decimal list-outside space-y-3 ml-5">
              <li><strong className="text-foreground">Step 1: Setting Your Daily Intentions.</strong> Begin your morning in the 'Planning' phase. Here, you systematically outline your primary tasks, mandatory appointments, and aspirational habits for the upcoming twenty-four hours. Be realistic but ambitious about what you aim to achieve.</li>
              <li><strong className="text-foreground">Step 2: Execution and Real-Time Tracking.</strong> Throughout your day, transition to the 'Execution' phase. As you complete your scheduled activities, click or tap the respective items to instantly mark them as finished. This provides an immediate dopamine reward, reinforcing positive behavior. If unanticipated tasks arise, smoothly add them into the tracker to maintain an accurate ledger of your activity.</li>
              <li><strong className="text-foreground">Step 3: End-of-Day Review and Streak Maintenance.</strong> In the evening, enter the 'Breakdown' or 'Analytics' phase to audit your performance. You'll receive a detailed visualization of your efficiency, comparing planned efforts against actual accomplishments. Continuously doing this builds your daily streaks, an essential gamification element that makes tracking deeply rewarding over the long term.</li>
            </ol>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Key Features</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground">
            <li className="bg-muted/30 p-4 rounded-md border border-border/40">
              <strong className="text-foreground block mb-1 text-lg">Lightning-Fast Client-Side Performance</strong>
              Built with modern React and optimized architecture, interactions are instantaneous, completely avoiding the slow loading times of traditional web apps.
            </li>
            <li className="bg-muted/30 p-4 rounded-md border border-border/40">
              <strong className="text-foreground block mb-1 text-lg">Local Browser Storage</strong>
              All your deeply personal routine data remains completely private. Everything is stored directly on your specific device, meaning no mandatory accounts and total data sovereignty.
            </li>
            <li className="bg-muted/30 p-4 rounded-md border border-border/40">
              <strong className="text-foreground block mb-1 text-lg">Mobile-Responsive Design</strong>
              Cultivating habits requires accessibility. The interface fluidly adapts to any screen size, allowing you to log a habit from your smartphone while commuting seamlessly.
            </li>
            <li className="bg-muted/30 p-4 rounded-md border border-border/40">
              <strong className="text-foreground block mb-1 text-lg">Distraction-Free Minimalist UI</strong>
              By employing a clean, aesthetic design philosophy reminiscent of premium productivity tools, the interface removes cognitive clutter so you can focus entirely on your work.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6 text-primary">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-background rounded-md p-5 border border-border/50">
              <h3 className="text-lg font-medium text-foreground mb-2">What is the psychological benefit of tracking habits daily?</h3>
              <p className="text-muted-foreground">The core benefit lies in the "Hawthorne Effect"—merely observing a behavior tends to change it. When you track what you do, you inherently become more conscious of your decisions. It eliminates the cognitive dissonance of believing you are productive when the data proves otherwise, forcing positive alignment.</p>
            </div>
            <div className="bg-background rounded-md p-5 border border-border/50">
              <h3 className="text-lg font-medium text-foreground mb-2">Is my tracking data completely secure and private?</h3>
              <p className="text-muted-foreground">Absolutely. By default, the Daily Tracker employs a privacy-first local architecture. Your entries, habits, and tasks are saved securely within your browser's indexed database. We strictly do not harvest or transmit this personal data to external servers without your permission.</p>
            </div>
            <div className="bg-background rounded-md p-5 border border-border/50">
              <h3 className="text-lg font-medium text-foreground mb-2">Can I recover my data if I clear my browser cache?</h3>
              <p className="text-muted-foreground">Because the core functional data relies on local storage, clearing your site data will erase your local history. However, you can frequently utilize export functionality to save backups, or configure optional cross-device synchronization to ensure data persists.</p>
            </div>
            <div className="bg-background rounded-md p-5 border border-border/50">
              <h3 className="text-lg font-medium text-foreground mb-2">Do I need to sign up for an account to start tracking?</h3>
              <p className="text-muted-foreground">No, immediate utility is our priority. You can begin tracking tasks and building habit streaks instantly without giving us your email address or creating a password. Our tool is designed to provide immediate value the moment you load the application.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
