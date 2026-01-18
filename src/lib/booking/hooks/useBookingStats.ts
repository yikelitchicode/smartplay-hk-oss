/**
 * Custom hook for calculating booking availability statistics
 * Computes district, center, and facility availability stats with memoization
 */

import { useMemo } from "react";
import { DISTRICT_COORDINATES } from "@/data/districts";
import { getDistance } from "@/utils/location";
import {
	type AvailabilityStats,
	calculateAllStats,
	sortByStats,
} from "../calculate-stats";
import type { NormalizedVenue, PriceType, RegionType } from "../types";
import { type AvailabilityTheme, getAvailabilityColor } from "../utils";
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
		hasData?: boolean;
		totalSessions: number;
		availableSessions: number;
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
	/** Pre-computed stats from server */
	stats?: {
		districtStats: Record<string, AvailabilityStats>;
		centerStats: Record<string, AvailabilityStats>;
		facilityStats: Record<string, AvailabilityStats>;
	};
	/** User location for GPS sorting */
	userLocation?: { lat: number; lng: number } | null;
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
	stats,
	userLocation,
}: UseBookingStatsParams) {
	// Calculate all statistics with memoization
	const computedStats = useMemo(() => {
		return calculateAllStats({
			venues,
			selectedDistricts,
			selectedPriceType,
			selectedFacilityCode, // Passing this to allow facility-aware stats
			districts,
			centers,
			serverDistrictStats: stats?.districtStats,
			serverCenterStats: stats?.centerStats,
			serverFacilityStats: stats?.facilityStats,
		});
	}, [
		venues,
		selectedDistricts,
		selectedPriceType,
		selectedFacilityCode,
		districts,
		centers,
		stats,
	]);

	// Filter and sort districts by availability
	// Disabled districts (hasData === false) are moved to the end
	const availableDistricts = useMemo(() => {
		const sorted = sortByStats(districts, computedStats.districtStats);
		return [...sorted].sort((a, b) => {
			const aActive = a.hasData !== false && a.availableSessions > 0;
			const bActive = b.hasData !== false && b.availableSessions > 0;

			// 1. Prioritize Active Districts (sessions > 0)
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;

			// Both are active or both are inactive
			// If inactive, still prioritize those that have data at all over those with false hasData
			const aHasData = a.hasData !== false;
			const bHasData = b.hasData !== false;
			if (aHasData && !bHasData) return -1;
			if (!aHasData && bHasData) return 1;

			// 2. Sort by Distance (if GPS enabled)
			if (userLocation) {
				const coordsA =
					DISTRICT_COORDINATES[a.code as keyof typeof DISTRICT_COORDINATES];
				const coordsB =
					DISTRICT_COORDINATES[b.code as keyof typeof DISTRICT_COORDINATES];

				if (coordsA && coordsB) {
					const distA = getDistance(userLocation, coordsA);
					const distB = getDistance(userLocation, coordsB);

					if (Math.abs(distA - distB) > 0.1) {
						return distA - distB;
					}
				} else if (coordsA) {
					return -1;
				} else if (coordsB) {
					return 1;
				}
			}

			// 3. Fallback to availability (already partially sorted by sortByStats, but sort maintains order)
			return 0;
		});
	}, [districts, computedStats.districtStats, userLocation]);

	// Filter centers by selected districts and sort by availability
	const availableCenters = useMemo(() => {
		const filtered = filterCentersByDistricts(
			centers,
			selectedDistricts,
			districts,
		);

		return sortByStats(filtered, computedStats.centerStats);
	}, [centers, selectedDistricts, districts, computedStats.centerStats]);

	// Calculate district styles based on data provided by backend
	// If a district has no data for current filters, force it to be disabled with gray background
	const mergedDistrictStyles = useMemo(() => {
		const styles: Record<string, AvailabilityTheme> = {};

		for (const district of districts) {
			const total = district.totalSessions ?? 0;
			const available = district.availableSessions ?? 0;

			// Use availability color logic
			let style = getAvailabilityColor(total, available);

			// Override if no data
			if (district.hasData === false) {
				style = {
					bg: "bg-porcelain-100",
					text: "text-porcelain-400",
					border: "border-porcelain-200",
					hover: "cursor-not-allowed",
					ring: "",
					disabled: true,
				};
			}

			styles[district.code] = style;
		}

		return styles;
	}, [districts]);

	return {
		// Availability styles for UI
		districtStyles: mergedDistrictStyles,
		centerStyles: computedStats.centerStyles,
		facilityStyles: computedStats.facilityStyles,

		// Sorted lists for filters
		availableDistricts,
		availableCenters,
	};
}
