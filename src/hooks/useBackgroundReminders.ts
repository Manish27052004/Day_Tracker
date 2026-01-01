import { useEffect } from 'react';

export function useBackgroundReminders() {
    useEffect(() => {
        const registerPeriodicSync = async () => {
            // Check if serviceWorker and navigator are available (safe for SSR/environments)
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.ready;

                    // Periodic Sync Registration
                    // @ts-ignore
                    if (registration.periodicSync) {
                        try {
                            // @ts-ignore
                            await registration.periodicSync.register('execution-reminder', {
                                minInterval: 30 * 60 * 1000, // 30 minutes
                            });
                            console.log('✅ Periodic Sync registered: execution-reminder');
                        } catch (error) {
                            console.log('⚠️ Periodic Sync registration failed (common on non-PWA/non-HTTPS):', error);
                        }
                    } else {
                        console.log('ℹ️ Periodic Sync not supported in this browser');
                    }

                } catch (error) {
                    console.error('Error during background reminder setup:', error);
                }
            }
        };

        // Don't block the main thread - run after a short delay
        const timer = setTimeout(() => {
            registerPeriodicSync();
        }, 1000);

        return () => clearTimeout(timer);
    }, []);
}
