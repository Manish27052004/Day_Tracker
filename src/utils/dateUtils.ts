/**
 * IST (Indian Standard Time) Date Utilities
 * 
 * All functions in this file enforce Asia/Kolkata timezone to prevent timezone shift bugs.
 * The app is designed for users in India and always operates in IST, regardless of system timezone.
 */

/**
 * Get current date in IST timezone as YYYY-MM-DD string
 * 
 * Example: If it's 2 AM on Dec 13 in India, returns "2025-12-13"
 * (Even if system timezone would say it's still Dec 12)
 */
export function getTodayIST(): string {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
    });
}

/**
 * Convert any Date object to YYYY-MM-DD string in IST timezone
 * 
 * @param date - JavaScript Date object
 * @returns YYYY-MM-DD string in IST
 */
export function formatToIST(date: Date): string {
    return date.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
    });
}

/**
 * Get current time in IST as HH:mm string
 * 
 * @returns Current time in 24-hour format (e.g., "14:30")
 */
export function getCurrentTimeIST(): string {
    const now = new Date();
    const istTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    return istTime;
}

/**
 * Parse a YYYY-MM-DD string and create a Date object representing that date in IST
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at midnight IST for that date
 */
export function parseISTDate(dateString: string): Date {
    // Create date in IST by using the date string with IST time component
    const [year, month, day] = dateString.split('-').map(Number);

    // Create a date string that will be interpreted correctly
    // Using ISO format with IST offset (+05:30)
    const istOffset = '+05:30';
    const isoString = `${dateString}T00:00:00${istOffset}`;

    return new Date(isoString);
}

/**
 * Get date string for yesterday in IST
 */
export function getYesterdayIST(): string {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return formatToIST(yesterday);
}

/**
 * Get date string for tomorrow in IST
 */
export function getTomorrowIST(): string {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return formatToIST(tomorrow);
}

/**
 * Check if a date string is today in IST
 */
export function isTodayIST(dateString: string): boolean {
    return dateString === getTodayIST();
}

/**
 * Format a date for display in Indian format
 * 
 * @param date - Date object or YYYY-MM-DD string
 * @returns Formatted string like "13 Dec 2025"
 */
export function formatDateForDisplay(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parseISTDate(date) : date;

    return dateObj.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Get the "logical" date based on a start hour offset.
 * If the current time (or given time) hour is < startHour, it belongs to the previous day.
 * 
 * @param date - The date/time to check (defaults to now)
 * @param startHour - The hour (0-23) when the day logically starts
 * @returns Date object normalized to midnight of the logical date in IST
 */
export function getLogicalDate(date: Date = new Date(), startHour: number = 0): Date {
    // Clone to avoid mutating original
    const workingDate = new Date(date);

    // Get hour in IST 
    // Optimization: Since we are in an IST environment context (per file header),
    // and we want to perform simple hour subtraction, we can adjust the underlying time.

    // However, to be safe with timezone boundaries:
    // 1. Convert to IST time string to know the "apparent" wall clock time
    const istString = workingDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
    const istDate = new Date(istString);

    const currentHour = istDate.getHours();

    // 2. Logic: If currentHour < startHour, subtract 1 day from the date
    if (currentHour < startHour) {
        workingDate.setTime(workingDate.getTime() - 24 * 60 * 60 * 1000);
    }

    // 3. Return the midnight version of this logical date
    return parseISTDate(formatToIST(workingDate));
}

/**
 * Get the logical date string (YYYY-MM-DD)
 */
export function getLogicalDateString(date: Date = new Date(), startHour: number = 0): string {
    return formatToIST(getLogicalDate(date, startHour));
}
