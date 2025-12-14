import { useEffect } from 'react';
import { generateTasksFromTemplates } from '@/lib/db';
import { getTodayIST } from '@/utils/dateUtils';

/**
 * Hook to automatically generate tasks from templates for TODAY'S date
 * Runs on mount and checks periodically for new days
 * 
 * ⚠️ TEMPORARILY DISABLED - Causing duplicate tasks
 * Re-enable after switching to cloud-only mode
 */
export const useTemplateGenerator = () => {
    useEffect(() => {
        // DISABLED: Automatic task generation
        // This was causing duplicate tasks in local database

        /* 
        const generate = async () => {
            const todayString = getTodayIST();
            await generateTasksFromTemplates(todayString);
        };

        // Generate on mount
        generate();

        // Check every hour if we've crossed into a new day
        const interval = setInterval(() => {
            generate();
        }, 60 * 60 * 1000); // Check every hour

        return () => clearInterval(interval);
        */
    }, []); // Only run on mount, no dependencies
};
