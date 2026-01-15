/**
 * Booking constants and configuration values
 * Centralized magic numbers and configuration for maintainability
 */

import type { PriceType } from "./types";

/**
 * Toast notification duration in milliseconds
 */
export const TOAST_DURATION = 3000;

/**
 * Default filter values
 */
export const DEFAULT_FILTERS = {
	SEARCH_QUERY: "",
	DISTRICT: "All",
	CENTER: "All",
	FACILITY: "All",
} as const;

/**
 * QueryClient caching configuration
 */
export const QUERY_CACHE_CONFIG = {
	/** Data freshness duration in milliseconds */
	STALE_TIME: 5 * 60 * 1000, // 5 minutes

	/** Cache retention duration in milliseconds */
	GC_TIME: 30 * 60 * 1000, // 30 minutes

	/** Retry attempts on failure */
	RETRY: 1,

	/** Disable automatic refetch on window focus */
	REFETCH_ON_FOCUS: false,
} as const;

/**
 * Sorting priority weights for stats
 */
export const SORT_WEIGHTS = {
	AVAILABLE: 2,
	TOTAL: 1,
	NAME: 0,
} as const;

/**
 * Type guard to validate PriceType
 */
export function isValidPriceType(value: string): value is PriceType {
	return value === "Paid" || value === "Free";
}

/**
 * Assert that a value is a valid PriceType
 * @throws {Error} if value is not a valid PriceType
 */
export function assertPriceType(value: string): asserts value is PriceType {
	if (!isValidPriceType(value)) {
		throw new Error(`Invalid PriceType: ${value}. Expected "Paid" or "Free"`);
	}
}

/**
 * Parse price type from URL param with fallback
 */
export function parsePriceType(
	value: string | undefined,
	defaultValue: PriceType = "Free",
): PriceType {
	if (!value) return defaultValue;
	if (isValidPriceType(value)) return value;
	return defaultValue;
}
