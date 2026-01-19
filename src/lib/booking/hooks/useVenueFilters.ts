/**
 * Custom hook for venue filtering logic
 * Pure filtering functions extracted from component
 */

import { useMemo } from "react";
import { DISTRICT_COORDINATES, type DistrictCoords } from "@/data/districts";
import { getDistance } from "@/utils/location";
import type { NormalizedVenue, PriceType } from "../types";

/**
 * Hook parameters
 */
export interface UseVenueFiltersParams {
	/** All venues from server */
	venues: NormalizedVenue[];
	/** Search query string */
	searchQuery: string;
	/** Selected district codes */
	selectedDistricts: string[];
	/** Selected center ID */
	selectedCenter: string;
	/** Selected facility code */
	selectedFacilityCode: string;
	/** Selected price type */
	selectedPriceType: PriceType;
	/** User's current location */
	userLocation: DistrictCoords | null;
}

/**
 * Filter venues based on current filter criteria
 * Memoized to prevent unnecessary recalculations
 */
export function useVenueFilters({
	venues,
	userLocation,
}: Pick<UseVenueFiltersParams, "venues" | "userLocation">): NormalizedVenue[] {
	return useMemo(() => {
		// Clone venues to avoid mutation during sort
		let processedVenues = [...venues];

		// Calculate distances if user location is available
		if (userLocation) {
			processedVenues = processedVenues.map((venue) => {
				const districtCode = venue.districtCode;
				// Check if we have coordinates for this district
				// Uses type assertion to check if key exists in record
				if (districtCode in DISTRICT_COORDINATES) {
					// @ts-expect-error - we know it exists from the check above
					const districtCoords = DISTRICT_COORDINATES[districtCode];
					const distance = getDistance(userLocation, districtCoords);
					return { ...venue, distance };
				}
				return venue;
			});

			// Sort by distance (ASC) with Venue ID (ASC) as tie-breaker
			processedVenues.sort((a, b) => {
				if (a.distance !== undefined && b.distance !== undefined) {
					const diff = a.distance - b.distance;
					if (diff !== 0) return diff;
					// Tie-breaker: stable sort by ID
					return a.id.localeCompare(b.id);
				}
				// Venues with distance come first
				if (a.distance !== undefined) return -1;
				if (b.distance !== undefined) return 1;
				// Fallback stable sort
				return a.id.localeCompare(b.id);
			});
		} else {
			// If no location, sort by Venue ID for deterministic order
			processedVenues.sort((a, b) => a.id.localeCompare(b.id));
		}

		return processedVenues;
	}, [venues, userLocation]);
}
