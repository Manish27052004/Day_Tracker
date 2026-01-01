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

  // Fetch or create sleep entry for the selected date
  const sleepEntry = useLiveQuery(
    () => db.sleepEntries.where('date').equals(dateString).first(),
    [dateString]
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
    </div>
  );
};

export default Index;
