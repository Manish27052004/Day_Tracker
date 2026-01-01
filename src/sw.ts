/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { db } from './lib/db';
import { getLogicalDateString } from './utils/dateUtils';

declare let self: ServiceWorkerGlobalScope;

// Precache resources
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

// Periodic Sync Listener
self.addEventListener('periodicsync', (event: any) => {
    if (event.tag === 'execution-reminder') {
        event.waitUntil(checkRecentExecutionAndNotify());
    }
});

// Fallback: Push event can also trigger checks if you have a backend pushing silent notifications
self.addEventListener('push', (event) => {
    // If you implemented push notifications later, this is where you'd handle them
});

async function checkRecentExecutionAndNotify() {
    try {
        const now = new Date();
        // IST Timezone enforcement (simple offset check isn't enough, we rely on string parsing)
        const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
        const istNow = new Date(istString);

        // Calculate "Today" and "Yesterday" in IST terms to query DB
        const todayStr = getLogicalDateString(now); // This defaults to startHour=0 which is fine for "Calendar Date"

        // We also check Yesterday because of the "Day Start Time" feature (e.g., 4 AM).
        // If it's 2 AM, the user might have logged their session under "Yesterday" (logical date).
        // SW doesn't know the user's startHour preference (stored in localStorage, inaccessible here).
        // SAFETY FIX: Query BOTH Today and Yesterday.
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLogicalDateString(yesterday);

        // Fetch sessions for range
        const [sessionsToday, sessionsYesterday] = await Promise.all([
            db.sessions.where('date').equals(todayStr).toArray(),
            db.sessions.where('date').equals(yesterdayStr).toArray()
        ]);

        const allSessions = [...sessionsYesterday, ...sessionsToday];

        if (allSessions.length === 0) {
            // Absolutely no data for yesterday or today? 
            // This might definitely be a "missed execution" scenario if they are active.
            await showReminder();
            return;
        }

        const validSessions = allSessions.filter(s => !!s.endTime && !!s.startTime);
        if (validSessions.length === 0) {
            await showReminder();
            return;
        }

        // Helper: Convert HH:mm to continuous minutes relative to "Yesterday 00:00"
        // This unifies the timeline across 48 hours for easier comparison.
        // 0 = Yesterday 00:00
        // 1440 = Today 00:00
        // 2880 = Tomorrow 00:00
        const toContinuousMinutes = (time: string, dateStr: string) => {
            const [h, m] = time.split(':').map(Number);
            let offset = 0;
            if (dateStr === todayStr) offset = 1440;
            // if dateStr is yesterday, offset = 0.

            return offset + (h * 60) + m;
        };

        // Current time in continuous minutes
        const currentH = istNow.getHours();
        const currentM = istNow.getMinutes();
        const currentContinuous = 1440 + (currentH * 60) + currentM;

        let covered = false;
        let minGap = Infinity;

        for (const s of validSessions) {
            let start = toContinuousMinutes(s.startTime, s.date);
            let end = toContinuousMinutes(s.endTime, s.date);

            // Handle session overlapping midnight LOCALLY within its day assignment
            // e.g. Session on Yesterday: 23:00 - 01:00.
            // start = 23*60 = 1380.
            // end "01:00" -> 1*60 = 60.
            // 60 < 1380, so it crossed midnight. End should be 60 + 1440 = 1500.
            if (end < start) {
                end += 1440;
            }

            // Check if NOW is inside this session
            if (currentContinuous >= start && currentContinuous <= end) {
                covered = true;
                break;
            }

            // Check gap from end
            const gap = currentContinuous - end;
            if (gap >= 0 && gap < minGap) {
                minGap = gap;
            }
        }

        if (covered) {
            return; // User is currently working!
        }

        // If strict gap is > 30 mins, notify
        // (and ensure gap isn't huge, e.g. > 24 hours, implying they stopped using app long ago)
        // Let's set a reasonable bounds: Notify if gap is between 30 mins and 12 hours.
        if (minGap > 30 && minGap < 720) {
            await showReminder();
        }

    } catch (err) {
        console.error('Error in background check:', err);
    }
}

async function showReminder() {
    await self.registration.showNotification("Time Tracker", {
        body: "You did not add the execution",
        icon: "/logo.png", // Ensure this exists
        badge: "/mask-icon.svg", // Ensure this exists
        tag: "execution-reminder",
        // @ts-ignore
        renotify: true,
        // @ts-ignore
        requireInteraction: true, // Persist until user dismisses
        data: {
            url: "/"
        }
    });
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.openWindow(event.notification.data?.url || '/')
    );
});
