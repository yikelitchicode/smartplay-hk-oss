import type { PriceType, RegionType } from "./types";

// 1. District Data (18 Districts)
const DISTRICT_REGION_MAP: Record<string, RegionType> = {
	// Hong Kong Island
	CW: "Hong Kong Island", // Central & Western
	EN: "Hong Kong Island", // Eastern
	SN: "Hong Kong Island", // Southern
	WCH: "Hong Kong Island", // Wan Chai

	// Kowloon
	KC: "Kowloon", // Kowloon City
	KT: "Kowloon", // Kwun Tong
	SSP: "Kowloon", // Sham Shui Po
	WTS: "Kowloon", // Wong Tai Sin
	YTM: "Kowloon", // Yau Tsim Mong

	// New Territories
	IS: "New Territories", // Islands
	KWT: "New Territories", // Kwai Tsing
	N: "New Territories", // North
	SK: "New Territories", // Sai Kung
	ST: "New Territories", // Sha Tin
	TP: "New Territories", // Tai Po
	TW: "New Territories", // Tsuen Wan
	TM: "New Territories", // Tuen Mun
	YL: "New Territories", // Yuen Long
};

/**
 * Maps Hong Kong district codes to their geographical regions.
 *
 * @param distCode - 2-4 character district code (e.g., "CW", "KC", "TW")
 * @returns Region type: "Hong Kong Island" | "Kowloon" | "New Territories"
 * @default Returns "New Territories" for unknown district codes
 *
 * @example
 * ```typescript
 * getRegion('CW') // Returns: 'Hong Kong Island'
 * getRegion('KC') // Returns: 'Kowloon'
 * getRegion('UNKNOWN') // Returns: 'New Territories'
 * ```
 */
export const getRegion = (distCode: string): RegionType => {
	return DISTRICT_REGION_MAP[distCode] || "New Territories";
};

export interface AvailabilityTheme {
	bg: string;
	text: string;
	border: string;
	hover: string;
	ring: string; // For focus rings or similar
	disabled: boolean; // Whether this option should be disabled
}

/**
 * Returns Tailwind CSS classes based on session availability.
 *
 * Uses a color-coded system to indicate facility availability levels:
 * - **Gray** (Porcelain): No sessions or no availability (disabled)
 * - **Green** (Meadow): High availability (≥50%)
 * - **Yellow** (Vanilla Custard): Medium availability (20-50%)
 * - **Orange** (Tangerine Dream): Low availability (<20%)
 *
 * @param total - Total number of sessions
 * @param available - Number of available sessions
 * @returns AvailabilityTheme with Tailwind CSS classes for bg, text, border, hover, ring, and disabled state
 *
 * @example
 * ```typescript
 * getAvailabilityColor(100, 60)
 * // Returns: { bg: 'bg-meadow-green-100', text: 'text-meadow-green-800', ... }
 *
 * getAvailabilityColor(100, 15)
 * // Returns: { bg: 'bg-tangerine-dream-100', text: 'text-tangerine-dream-800', ... }
 *
 * getAvailabilityColor(0, 0)
 * // Returns: { bg: 'bg-porcelain-100', disabled: true, ... }
 * ```
 */
export const getAvailabilityColor = (
	total: number,
	available: number,
): AvailabilityTheme => {
	// Constants for availability thresholds
	const HIGH_AVAILABILITY_THRESHOLD = 0.5;
	const MEDIUM_AVAILABILITY_THRESHOLD = 0.2;

	// Theme for disabled states (no sessions or no availability)
	const DISABLED_THEME: AvailabilityTheme = {
		bg: "bg-porcelain-100",
		text: "text-porcelain-400",
		border: "border-porcelain-200",
		hover: "",
		ring: "",
		disabled: true,
	};

	// No sessions at all or no available sessions - gray and disabled
	if (total === 0 || available === 0) {
		return DISABLED_THEME;
	}

	const percentage = available / total;

	// High Availability (> 50%) -> Meadow Green
	if (percentage >= HIGH_AVAILABILITY_THRESHOLD) {
		return {
			bg: "bg-meadow-green-100",
			text: "text-meadow-green-800",
			border: "border-meadow-green-200",
			hover: "hover:bg-meadow-green-200",
			ring: "focus:ring-meadow-green-500",
			disabled: false,
		};
	}

	// Medium Availability (20% - 50%) -> Vanilla Custard (Yellow)
	if (percentage >= MEDIUM_AVAILABILITY_THRESHOLD) {
		return {
			bg: "bg-vanilla-custard-100",
			text: "text-vanilla-custard-800",
			border: "border-vanilla-custard-200",
			hover: "hover:bg-vanilla-custard-200",
			ring: "focus:ring-vanilla-custard-500",
			disabled: false,
		};
	}

	// Low Availability (< 20%) -> Tangerine Dream (Orange/Red)
	return {
		bg: "bg-tangerine-dream-100",
		text: "text-tangerine-dream-800",
		border: "border-tangerine-dream-200",
		hover: "hover:bg-tangerine-dream-200",
		ring: "focus:ring-tangerine-dream-500",
		disabled: false,
	};
};

/**
 * Normalizes time string to HH:mm format.
 *
 * Extracts the first 5 characters (HH:mm) from a time string.
 * Returns empty string if input is falsy.
 *
 * @param time - Time string in HH:mm:ss or similar format
 * @returns Time in HH:mm format, or empty string if input is falsy
 *
 * @example
 * ```typescript
 * normalizeTime('14:30:00') // Returns: '14:30'
 * normalizeTime('09:05:00') // Returns: '09:05'
 * normalizeTime('') // Returns: ''
 * normalizeTime(undefined) // Returns: ''
 * ```
 */
export const normalizeTime = (time: string) => {
	if (!time) return "";
	return time.substring(0, 5);
};

/**
 * Determines the price type and simplified name for a facility.
 *
 * Uses the facility code prefix to determine if it's a free facility.
 * Free facilities have codes starting with "NF" (e.g., NFBASC, NFTENC).
 *
 * @param code - LCSD facility code (e.g., "BASC" for basketball, "NFBASC" for free basketball)
 * @param apiName - Chinese facility name from API
 * @param apiEnName - English facility name from API
 * @returns Object with name and priceType ("Paid" | "Free")
 *
 * @example
 * ```typescript
 * getFacilityDetails('BASC', '籃球場', 'Basketball Court')
 * // Returns: { name: '籃球場', priceType: 'Paid' }
 *
 * getFacilityDetails('NFBASC', '籃球場', 'Basketball Court')
 * // Returns: { name: '籃球場', priceType: 'Free' }
 * ```
 */
export const getFacilityDetails = (
	code: string,
	apiName: string,
	apiEnName: string,
): { name: string; priceType: PriceType } => {
	// Determine price type based on code prefix or name
	const isFree =
		code.startsWith("NF") || apiEnName.toLowerCase().includes("free");

	return {
		name: apiName,
		priceType: isFree ? "Free" : "Paid",
	};
};

/**
 * Determines if a booking session has already occurred.
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:mm format (output from normalizeTime)
 * @returns true if session is in the past, false if current or future
 *
 * @remarks
 * - Timezone: Hong Kong (UTC+8)
 * - Uses server time for comparison
 * - Assumes session date/time are in Hong Kong timezone
 *
 * @example
 * ```typescript
 * isSessionPassed('2026-01-14', '10:00') // false (future)
 * isSessionPassed('2026-01-13', '10:00') // true (past)
 * ```
 */
export const isSessionPassed = (dateStr: string, timeStr: string): boolean => {
	// Create a Date object for the session in HK timezone (+08:00)
	const sessionDate = new Date(`${dateStr}T${timeStr}:00+08:00`);
	const now = new Date();

	return now > sessionDate;
};
