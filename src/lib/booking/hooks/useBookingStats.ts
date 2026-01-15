/**
 * Custom hook for calculating booking availability statistics
 * Computes district, center, and facility availability stats with memoization
 */

import { useMemo } from "react";
import { calculateAllStats, sortByStats } from "../calculate-stats";
import type { NormalizedVenue, PriceType, RegionType } from "../types";
import { filterCentersByDistricts } from "../venue-utils";

/**
 * Statistics hooks parameters
 */
export interface UseBookingStatsParams {
	/** All venues from server */
	venues: NormalizedVenue[];
	/** Available districts */
	districts: Array<{
		code: string;
		name: string;
		region: RegionType;
		nameTc?: string | null;
		nameSc?: string | null;
	}>;
	/** Available centers */
	centers: Array<{
		id: string;
		name: string;
		nameTc?: string | null;
		nameSc?: string | null;
		districtCode: string;
		districtName: string;
		districtNameTc?: string | null;
		districtNameSc?: string | null;
	}>;
	/** Selected districts */
	selectedDistricts: string[];
	/** Selected center */
	selectedCenter: string;
	/** Selected facility code */
	selectedFacilityCode: string;
	/** Selected price type */
	selectedPriceType: PriceType;
}

/**
 * Calculate and provide availability statistics for UI components
 * Returns sorted lists and color styles for districts, centers, and facilities
 */
export function useBookingStats({
	venues,
	districts,
	centers,
	selectedDistricts,
	selectedCenter: _selectedCenter,
	selectedFacilityCode,
	selectedPriceType,
}: UseBookingStatsParams) {
	// Calculate all statistics with memoization
	const stats = useMemo(() => {
		return calculateAllStats({
			venues,
			selectedDistricts,
			selectedPriceType,
			selectedFacilityCode, // Passing this to allow facility-aware stats
			districts,
			centers,
		});
	}, [
		venues,
		selectedDistricts,
		selectedPriceType,
		selectedFacilityCode,
		districts,
		centers,
	]);

	// Filter and sort districts by availability
	const availableDistricts = useMemo(() => {
		return sortByStats(districts, stats.districtStats);
	}, [districts, stats.districtStats]);

	// Filter centers by selected districts and sort by availability
	const availableCenters = useMemo(() => {
		const filtered = filterCentersByDistricts(
			centers,
			selectedDistricts,
			districts,
		);

		return sortByStats(filtered, stats.centerStats);
	}, [centers, selectedDistricts, districts, stats.centerStats]);

	return {
		// Availability styles for UI
		districtStyles: stats.districtStyles,
		centerStyles: stats.centerStyles,
		facilityStyles: stats.facilityStyles,

		// Sorted lists for filters
		availableDistricts,
		availableCenters,
	};
}
