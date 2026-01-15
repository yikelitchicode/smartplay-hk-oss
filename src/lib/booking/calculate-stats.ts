/**
 * Availability statistics calculation utilities
 * Pure functions for calculating availability stats for districts, centers, and facilities
 */

import { SORT_WEIGHTS } from "./constants";
import type { NormalizedVenue, PriceType } from "./types";
import type { AvailabilityTheme } from "./utils";
import { getAvailabilityColor } from "./utils";

/**
 * Statistics for availability (total and available sessions)
 */
export interface AvailabilityStats {
	/** Total number of sessions */
	t: number;
	/** Number of available sessions */
	a: number;
}

/**
 * Filter venues by price type and calculate facility stats
 */
function calculateFacilityStatsFromVenues(
	venues: NormalizedVenue[],
	selectedPriceType: PriceType,
): Record<string, AvailabilityStats> {
	const stats: Record<string, AvailabilityStats> = {};

	venues.forEach((venue) => {
		Object.values(venue.facilities).forEach((facility) => {
			if (facility.priceType !== selectedPriceType) return;

			const t = facility.sessions.length;
			const a = facility.sessions.filter(
				(s) => s.available && !s.isPassed,
			).length;

			if (!stats[facility.code]) {
				stats[facility.code] = { t: 0, a: 0 };
			}
			stats[facility.code].t += t;
			stats[facility.code].a += a;
		});
	});

	return stats;
}

/**
 * Filter venues by district and calculate center stats
 */
function calculateCenterStatsFromVenues(
	venues: NormalizedVenue[],
	selectedDistricts: string[],
	selectedPriceType: PriceType,
	selectedFacilityCode: string,
): Record<string, AvailabilityStats> {
	const stats: Record<string, AvailabilityStats> = {};

	venues.forEach((venue) => {
		Object.values(venue.facilities).forEach((facility) => {
			if (facility.priceType !== selectedPriceType) return;
			if (
				selectedFacilityCode !== "All" &&
				facility.code !== selectedFacilityCode
			)
				return;

			const t = facility.sessions.length;
			const a = facility.sessions.filter(
				(s) => s.available && !s.isPassed,
			).length;

			const isVenueInSelectedDistricts =
				selectedDistricts.includes("All") ||
				selectedDistricts.includes(venue.districtCode);

			if (isVenueInSelectedDistricts) {
				if (!stats[venue.id]) {
					stats[venue.id] = { t: 0, a: 0 };
				}
				stats[venue.id].t += t;
				stats[venue.id].a += a;
			}
		});
	});

	return stats;
}

/**
 * Calculate district stats from venues
 */
function calculateDistrictStatsFromVenues(
	venues: NormalizedVenue[],
	selectedPriceType: PriceType,
	selectedFacilityCode: string,
): Record<string, AvailabilityStats> {
	const stats: Record<string, AvailabilityStats> = {};

	venues.forEach((venue) => {
		Object.values(venue.facilities).forEach((facility) => {
			if (facility.priceType !== selectedPriceType) return;
			if (
				selectedFacilityCode !== "All" &&
				facility.code !== selectedFacilityCode
			)
				return;

			const t = facility.sessions.length;
			const a = facility.sessions.filter(
				(s) => s.available && !s.isPassed,
			).length;

			if (!stats[venue.districtCode]) {
				stats[venue.districtCode] = { t: 0, a: 0 };
			}
			stats[venue.districtCode].t += t;
			stats[venue.districtCode].a += a;
		});
	});

	return stats;
}

/**
 * Map stats to availability color styles
 */
function mapStatsToStyles(
	stats: Record<string, AvailabilityStats>,
): Record<string, AvailabilityTheme> {
	const styles: Record<string, AvailabilityTheme> = {};

	Object.keys(stats).forEach((key) => {
		styles[key] = getAvailabilityColor(stats[key].t, stats[key].a);
	});

	return styles;
}

/**
 * Calculate all statistics (district, center, facility) with server override support
 */
export function calculateAllStats(params: {
	venues: NormalizedVenue[];
	selectedDistricts: string[];
	selectedPriceType: PriceType;
	selectedFacilityCode: string;
	serverDistrictStats?: Record<string, AvailabilityStats>;
	serverCenterStats?: Record<string, AvailabilityStats>;
	districts: Array<{ code: string }>;
	centers: Array<{ id: string }>;
}): {
	districtStyles: Record<string, AvailabilityTheme>;
	centerStyles: Record<string, AvailabilityTheme>;
	facilityStyles: Record<string, AvailabilityTheme>;
	districtStats: Record<string, AvailabilityStats>;
	centerStats: Record<string, AvailabilityStats>;
} {
	const {
		venues,
		selectedDistricts,
		selectedPriceType,
		selectedFacilityCode,
		serverDistrictStats,
		serverCenterStats,
		districts,
		centers,
	} = params;

	// Initialize with all known districts and centers
	const districtStats: Record<string, AvailabilityStats> = {};
	const centerStats: Record<string, AvailabilityStats> = {};

	districts.forEach((d) => {
		districtStats[d.code] = { t: 0, a: 0 };
	});
	centers.forEach((c) => {
		centerStats[c.id] = { t: 0, a: 0 };
	});

	// Use server-provided district stats if available
	if (serverDistrictStats && Object.keys(serverDistrictStats).length > 0) {
		Object.entries(serverDistrictStats).forEach(([code, stat]) => {
			districtStats[code] = stat;
		});
	} else {
		// Calculate district stats
		const calcStats = calculateDistrictStatsFromVenues(
			venues,
			selectedPriceType,
			selectedFacilityCode,
		);
		Object.entries(calcStats).forEach(([code, stat]) => {
			districtStats[code] = stat;
		});
	}

	// Use server-provided center stats if available, otherwise calculate from venues
	if (serverCenterStats && Object.keys(serverCenterStats).length > 0) {
		Object.entries(serverCenterStats).forEach(([id, stat]) => {
			centerStats[id] = stat;
		});
	} else {
		// Calculate center stats (filtered by district)
		Object.entries(
			calculateCenterStatsFromVenues(
				venues,
				selectedDistricts,
				selectedPriceType,
				selectedFacilityCode,
			),
		).forEach(([id, stat]) => {
			centerStats[id] = stat;
		});
	}

	// Calculate facility stats
	const facilityStats = calculateFacilityStatsFromVenues(
		venues,
		selectedPriceType,
	);

	return {
		districtStyles: mapStatsToStyles(districtStats),
		centerStyles: mapStatsToStyles(centerStats),
		facilityStyles: mapStatsToStyles(facilityStats),
		districtStats, // Return raw stats for sorting
		centerStats, // Return raw stats for sorting
	};
}

/**
 * Sort items by availability stats (available desc, total desc, name asc)
 */
export function sortByStats<
	T extends { name: string; id?: string; code?: string },
>(items: T[], stats: Record<string, AvailabilityStats>): T[] {
	return [...items].sort((a, b) => {
		const keyA = a.id || a.code;
		const keyB = b.id || b.code;
		const statA = stats[keyA || ""] || { t: 0, a: 0 };
		const statB = stats[keyB || ""] || { t: 0, a: 0 };

		// Sort by available count (descending)
		if (statB.a !== statA.a) {
			return (statB.a - statA.a) * SORT_WEIGHTS.AVAILABLE;
		}

		// Then by total count (descending)
		if (statB.t !== statA.t) {
			return (statB.t - statA.t) * SORT_WEIGHTS.TOTAL;
		}

		// Finally by name (ascending)
		return a.name.localeCompare(b.name) * SORT_WEIGHTS.NAME;
	});
}
