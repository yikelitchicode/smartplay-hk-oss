/**
 * Booking-related custom hooks
 * Reusable hooks extracted from booking page for better organization and testability
 */

export { useBookingDataProcessor } from "./useBookingDataProcessor";
export type {
	BookingFilters,
	UseBookingFiltersParams,
} from "./useBookingFilters";
export { useBookingFilters } from "./useBookingFilters";
export type {
	NavigationUpdates,
	UseBookingNavigationParams,
} from "./useBookingNavigation";
export { useBookingNavigation } from "./useBookingNavigation";
export type { UseBookingStatsParams } from "./useBookingStats";
export { useBookingStats } from "./useBookingStats";
export { useProjectedSessions } from "./useProjectedSessions";
export type { UseVenueFiltersParams } from "./useVenueFilters";
export { useVenueFilters } from "./useVenueFilters";
export { useWatcherSync } from "./useWatcherSync";
