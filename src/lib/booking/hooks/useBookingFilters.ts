/**
 * Custom hook for managing booking filter state
 * Handles district, center, facility, and search query filters with URL synchronization
 */

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FILTERS } from "../constants";

/**
 * Filter state interface
 */
export interface BookingFilters {
	/** Selected districts (multi-select) */
	selectedDistricts: string[];
	/** Selected center (single-select) */
	selectedCenter: string;
	/** Selected facility code (single-select) */
	selectedFacilityCode: string;
	/** Search query for venue name */
	searchQuery: string;
}

/**
 * Hook parameters
 */
export interface UseBookingFiltersParams {
	/** Initial districts from URL */
	initialDistricts?: string[];
	/** Initial center from URL */
	initialCenter?: string;
	/** Initial facility from URL */
	initialFacility?: string;
	/** Navigation function for URL updates */
	onNavigate: (updates: {
		districts?: string[];
		center?: string;
		facility?: string;
	}) => void;
}

/**
 * Manage booking filter state with URL synchronization
 */
export function useBookingFilters({
	initialDistricts = [DEFAULT_FILTERS.DISTRICT],
	initialCenter = DEFAULT_FILTERS.CENTER,
	initialFacility = DEFAULT_FILTERS.FACILITY,
	onNavigate,
}: UseBookingFiltersParams) {
	// Local state for filters
	const [selectedDistricts, setSelectedDistricts] =
		useState<string[]>(initialDistricts);
	const [selectedCenter, setSelectedCenter] = useState<string>(initialCenter);
	const [selectedFacilityCode, setSelectedFacilityCode] =
		useState<string>(initialFacility);
	const [searchQuery, setSearchQuery] = useState(DEFAULT_FILTERS.SEARCH_QUERY);

	// Sync with URL params when they change
	useEffect(() => {
		if (initialCenter !== undefined && initialCenter !== selectedCenter) {
			setSelectedCenter(initialCenter);
		}
	}, [initialCenter, selectedCenter]);

	useEffect(() => {
		if (
			initialFacility !== undefined &&
			initialFacility !== selectedFacilityCode
		) {
			setSelectedFacilityCode(initialFacility);
		}
	}, [initialFacility, selectedFacilityCode]);

	// Initialize selected districts from props
	useEffect(() => {
		if (
			initialDistricts !== undefined &&
			JSON.stringify(initialDistricts) !== JSON.stringify(selectedDistricts)
		) {
			setSelectedDistricts(initialDistricts);
		}
	}, [initialDistricts, selectedDistricts]);

	/**
	 * Handle district selection with multi-select support
	 * Toggles district selection, manages "All" state
	 */
	const handleSelectDistrict = useCallback(
		(districtCode: string) => {
			setSelectedDistricts((prev) => {
				let next: string[];

				if (districtCode === "All") {
					next = ["All"];
				} else {
					const withoutAll = prev.filter((d) => d !== "All");

					if (withoutAll.includes(districtCode)) {
						next = withoutAll.filter((d) => d !== districtCode);
						if (next.length === 0) next = ["All"];
					} else {
						next = [...withoutAll, districtCode];
					}
				}

				// Update URL
				onNavigate({
					districts: next.includes("All") ? undefined : next,
				});

				return next;
			});
		},
		[onNavigate],
	);

	/**
	 * Handle center selection (single-select)
	 */
	const handleSelectCenter = useCallback(
		(centerId: string) => {
			setSelectedCenter(centerId);
			onNavigate({
				center: centerId === DEFAULT_FILTERS.CENTER ? undefined : centerId,
			});
		},
		[onNavigate],
	);

	/**
	 * Handle facility selection (single-select)
	 */
	const handleSelectFacility = useCallback(
		(fCode: string) => {
			setSelectedFacilityCode(fCode);
			onNavigate({
				facility: fCode === DEFAULT_FILTERS.FACILITY ? undefined : fCode,
			});
		},
		[onNavigate],
	);

	/**
	 * Handle search query change
	 */
	const handleSearchChange = useCallback((query: string) => {
		// biome-ignore lint/suspicious/noExplicitAny: query typing issue with state setter
		setSearchQuery(query as any);
	}, []);

	/**
	 * Reset all filters to default values
	 */
	const handleResetFilters = useCallback(() => {
		setSelectedDistricts([DEFAULT_FILTERS.DISTRICT]);
		setSelectedCenter(DEFAULT_FILTERS.CENTER);
		setSelectedFacilityCode(DEFAULT_FILTERS.FACILITY);
		setSearchQuery(DEFAULT_FILTERS.SEARCH_QUERY);
		onNavigate({
			districts: undefined,
			center: undefined,
			facility: undefined,
		});
	}, [onNavigate]);

	return {
		// State
		selectedDistricts,
		selectedCenter,
		selectedFacilityCode,
		searchQuery,

		// Handlers
		handleSelectDistrict,
		handleSelectCenter,
		handleSelectFacility,
		handleSearchChange,
		handleResetFilters,

		// Computed
		hasActiveFilters:
			searchQuery !== DEFAULT_FILTERS.SEARCH_QUERY ||
			!selectedDistricts.includes(DEFAULT_FILTERS.DISTRICT) ||
			selectedCenter !== DEFAULT_FILTERS.CENTER ||
			selectedFacilityCode !== DEFAULT_FILTERS.FACILITY,
	};
}
