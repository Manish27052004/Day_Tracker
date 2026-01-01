import { useEffect } from 'react';

export function useBackgroundReminders() {
    useEffect(() => {
        const registerPeriodicSync = async () => {
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.ready;

                    // Request Notification Permission
                    if (Notification.permission === 'default') {
                        await Notification.requestPermission();
                    }

                    // Register Periodic Sync
                    // @ts-ignore
                    if (registration.periodicSync) {
                        try {
                            // @ts-ignore
                            await registration.periodicSync.register('execution-reminder', {
                                minInterval: 30 * 60 * 1000, // 30 minutes
                            });
                            console.log('✅ Periodic Sync registered: execution-reminder');
                        } catch (error) {
                            console.log('⚠️ Periodic Sync registration failed:', error);
                        }
                    } else {
                        console.log('ℹ️ Periodic Sync not supported in this browser');
                    }

                } catch (error) {
                    console.error('Error setting up background reminders:', error);
                }
            }
        };

        registerPeriodicSync();
    }, []);
}
