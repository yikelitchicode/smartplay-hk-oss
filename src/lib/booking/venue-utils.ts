/**
 * Venue-related utility functions
 * Helper functions for working with venue data
 */

import type { NormalizedVenue } from "./types";

/**
 * Check if venue is in selected districts
 */
export function isVenueInSelectedDistricts(
	venue: NormalizedVenue,
	selectedDistricts: string[],
): boolean {
	return (
		selectedDistricts.includes("All") ||
		selectedDistricts.includes(venue.districtCode)
	);
}

/**
 * Get venue identifier (fallback-safe)
 */
export function getVenueId(venue: NormalizedVenue): string {
	return venue.id || venue.name;
}

/**
 * Get venue display name
 */
export function getVenueDisplayName(venue: NormalizedVenue): string {
	return venue.name;
}

/**
 * Check if venue has any available facilities
 */
export function venueHasAvailableFacilities(venue: NormalizedVenue): boolean {
	return Object.values(venue.facilities).some(
		(facility) => facility.sessions.length > 0,
	);
}

/**
 * Filter centers by districts
 */
export function filterCentersByDistricts<
	T extends {
		districtCode?: string;
		districtName?: string;
	},
>(
	centers: T[],
	selectedDistricts: string[],
	districts: Array<{ code: string; name: string }>,
): T[] {
	if (selectedDistricts.includes("All")) return centers;

	return centers.filter((center) => {
		// Check if center has districtCode property
		if ("districtCode" in center && center.districtCode) {
			return selectedDistricts.includes(center.districtCode);
		}

		// Fallback to matching by district name
		const dist = districts.find((d) => d.name === center.districtName);
		return dist ? selectedDistricts.includes(dist.code) : false;
	});
}

/**
 * Create date styles from date availability data
 */
export function createDateStyles(
	dateAvailability: Record<string, { t: number; a: number }>,
): Record<string, string> {
	const styles: Record<string, string> = {};

	Object.keys(dateAvailability).forEach((date) => {
		const { t, a } = dateAvailability[date];
		// This would need getAvailabilityColor from utils
		// For now, just return the data as-is
		styles[date] = `${a}/${t}`;
	});

	return styles;
}
