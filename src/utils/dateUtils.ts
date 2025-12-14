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
