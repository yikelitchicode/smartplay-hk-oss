/**
 * Custom hook for venue filtering logic
 * Pure filtering functions extracted from component
 */

import { useMemo } from "react";
import { filterVenues } from "../filter-venues";
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
}

/**
 * Filter venues based on current filter criteria
 * Memoized to prevent unnecessary recalculations
 */
export function useVenueFilters({
	venues,
	searchQuery,
	selectedDistricts,
	selectedCenter,
	selectedFacilityCode,
	selectedPriceType,
}: UseVenueFiltersParams): NormalizedVenue[] {
	return useMemo(() => {
		return filterVenues(venues, {
			searchQuery,
			selectedDistricts,
			selectedCenter,
			selectedFacilityCode,
			selectedPriceType,
		});
	}, [
		venues,
		searchQuery,
		selectedDistricts,
		selectedCenter,
		selectedFacilityCode,
		selectedPriceType,
	]);
}
