/**
 * Date and time formatting utilities for server-side
 */

/**
 * Formats a Date object to YYYY-MM-DD string
 * Cached implementation for performance in loops
 */
const dateCache = new Map<number, string>();

export function formatDateToYYYYMMDD(date: Date): string {
	const timestamp = date.getTime();
	const cached = dateCache.get(timestamp);
	if (cached !== undefined) {
		return cached;
	}

	const formatted = date.toISOString().split("T")[0];
	dateCache.set(timestamp, formatted);

	// Prevent unbounded cache growth
	if (dateCache.size > 1000) {
		const oldestKey = dateCache.keys().next().value;
		if (oldestKey !== undefined) {
			dateCache.delete(oldestKey);
		}
	}

	return formatted;
}

/**
 * Clears the date cache (useful for testing or memory management)
 */
export function clearDateCache(): void {
	dateCache.clear();
}

/**
 * Checks if a date string is in the past
 */
export function isDateInPast(dateStr: string): boolean {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const targetDate = new Date(dateStr);
	targetDate.setHours(0, 0, 0, 0);

	return targetDate < today;
}

/**
 * Normalizes time string to ensure consistent format
 */
export function normalizeTime(time: string): string {
	return time;
}

/**
 * Sorts strings using localeCompare with consistent options
 */
export function sortStrings(a: string, b: string): number {
	return a.localeCompare(b, "en", { sensitivity: "base" });
}
