/**
 * Booking library exports
 * Centralized exports for booking-related utilities, hooks, and types
 */

// Stats functions
export {
	type AvailabilityStats,
	calculateAllStats,
	sortByStats,
} from "./calculate-stats";

// Constants
export {
	assertPriceType,
	DEFAULT_FILTERS,
	isValidPriceType,
	parsePriceType,
	QUERY_CACHE_CONFIG,
	SORT_WEIGHTS,
	TOAST_DURATION,
} from "./constants";
// Filter functions
export {
	filterByDistrict,
	filterBySearchQuery,
	filterVenueFacilities,
	filterVenues,
} from "./filter-venues";
// Hooks
export {
	type BookingFilters,
	type NavigationUpdates,
	type UseBookingFiltersParams,
	type UseBookingNavigationParams,
	type UseBookingStatsParams,
	type UseVenueFiltersParams,
	useBookingFilters,
	useBookingNavigation,
	useBookingStats,
	useVenueFilters,
} from "./hooks";
// Types
export type {
	FacilityGroup,
	NormalizedFacility,
	NormalizedSession,
	NormalizedVenue,
	PriceType,
	RegionType,
	TimeFilter,
} from "./types";
// Utility functions
export {
	type AvailabilityTheme,
	getAvailabilityColor,
	getFacilityDetails,
	getRegion,
	isSessionPassed,
	normalizeTime,
} from "./utils";
// Venue utilities
export {
	createDateStyles,
	filterCentersByDistricts,
	getVenueDisplayName,
	getVenueId,
	isVenueInSelectedDistricts,
	venueHasAvailableFacilities,
} from "./venue-utils";
