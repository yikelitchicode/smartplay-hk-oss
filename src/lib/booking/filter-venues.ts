/**
 * Venue filtering utilities
 * Pure functions for filtering venues based on search criteria
 */

import type { NormalizedFacility, NormalizedVenue, PriceType } from "./types";

/**
 * Filter venues by search query
 */
export function filterBySearchQuery(
	venues: NormalizedVenue[],
	searchQuery: string,
): NormalizedVenue[] {
	if (!searchQuery) return venues;

	const query = searchQuery.toLowerCase();
	return venues.filter((venue) => venue.name.toLowerCase().includes(query));
}

/**
 * Filter venues by district
 */
export function filterByDistrict(
	venues: NormalizedVenue[],
	selectedDistricts: string[],
): NormalizedVenue[] {
	if (selectedDistricts.includes("All")) return venues;

	return venues.filter((venue) =>
		selectedDistricts.includes(venue.districtCode),
	);
}

/**
 * Filter facilities within a venue by facility code and price type
 * Returns filtered facilities object and whether any facilities are visible
 */
export function filterVenueFacilities(
	venue: NormalizedVenue,
	filters: {
		selectedFacilityCode: string;
		selectedPriceType: PriceType;
	},
): {
	filteredFacilities: Record<string, NormalizedFacility>;
	hasVisible: boolean;
} {
	const filteredFacilities: Record<string, NormalizedFacility> = {};
	let hasVisible = false;

	Object.entries(venue.facilities).forEach(([key, facility]) => {
		// Facility code filter
		if (
			filters.selectedFacilityCode !== "All" &&
			facility.code !== filters.selectedFacilityCode
		) {
			return;
		}

		// Price type filter
		if (facility.priceType !== filters.selectedPriceType) return;

		// Must have available sessions
		if (facility.sessions.length > 0) {
			filteredFacilities[key] = facility;
			hasVisible = true;
		}
	});

	return { filteredFacilities, hasVisible };
}

/**
 * Apply all filters to venues
 * Combines search, district, and facility filters
 */
export function filterVenues(
	venues: NormalizedVenue[],
	filters: {
		searchQuery: string;
		selectedDistricts: string[];
		selectedCenter: string;
		selectedFacilityCode: string;
		selectedPriceType: PriceType;
	},
): NormalizedVenue[] {
	return venues
		.map((venue) => {
			// Center filter
			if (
				filters.selectedCenter !== "All" &&
				venue.id !== filters.selectedCenter
			) {
				return null;
			}

			// District filter
			const districtMatch =
				filters.selectedDistricts.includes("All") ||
				filters.selectedDistricts.includes(venue.districtCode);

			if (!districtMatch) return null;

			// Search filter
			if (
				filters.searchQuery &&
				!venue.name.toLowerCase().includes(filters.searchQuery.toLowerCase())
			) {
				return null;
			}

			// Facility filter
			const { filteredFacilities, hasVisible } = filterVenueFacilities(venue, {
				selectedFacilityCode: filters.selectedFacilityCode,
				selectedPriceType: filters.selectedPriceType,
			});

			if (!hasVisible) return null;

			return {
				...venue,
				facilities: filteredFacilities,
			};
		})
		.filter((venue): venue is NormalizedVenue => venue !== null);
}
