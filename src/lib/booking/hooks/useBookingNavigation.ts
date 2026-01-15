/**
 * Custom hook for booking page navigation and URL state management
 * Handles price type changes and URL parameter updates
 */

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import type { PriceType } from "../types";

/**
 * Hook parameters
 */
export interface UseBookingNavigationParams {
	/** Current route path */
	fullPath: string;
}

/**
 * Navigation updates for URL parameters
 */
export interface NavigationUpdates {
	/** Price type selection */
	priceType?: PriceType;
	/** Selected districts */
	districts?: string[];
	/** Selected center */
	center?: string;
	/** Selected facility code */
	facility?: string;
	/** Selected date */
	date?: string;
}

/**
 * Manage booking page navigation with URL parameter synchronization
 */
export function useBookingNavigation({ fullPath }: UseBookingNavigationParams) {
	// biome-ignore lint/suspicious/noExplicitAny: from: path typing issue with Tanstack Router
	const navigate = useNavigate({ from: fullPath as any });

	/**
	 * Update URL search parameters
	 */
	const updateSearchParams = useCallback(
		(updates: NavigationUpdates) => {
			navigate({
				// biome-ignore lint/suspicious/noExplicitAny: search typing issue with Tanstack Router
				search: ((prev: any) => ({
					...prev,
					...updates,
					// biome-ignore lint/suspicious/noExplicitAny: search typing issue
				})) as any,
			});
		},
		[navigate],
	);

	/**
	 * Handle price type change with facility reset
	 * Resets facility filter when price type changes since facilities are price-type-specific
	 */
	const handlePriceTypeChange = useCallback(
		(type: PriceType) => {
			updateSearchParams({
				priceType: type,
				facility: undefined, // Reset facility when price type changes
			});
		},
		[updateSearchParams],
	);

	/**
	 * Handle date selection with URL replacement (no history entry)
	 */
	const handleDateSelect = useCallback(
		(newDate: string) => {
			navigate({
				// biome-ignore lint/suspicious/noExplicitAny: search typing issue with Tanstack Router
				search: ((prev: any) => ({
					...prev,
					date: newDate,
					// biome-ignore lint/suspicious/noExplicitAny: search typing issue
				})) as any,
				replace: true,
			});
		},
		[navigate],
	);

	/**
	 * Reset all filters to default values
	 */
	const handleResetAllFilters = useCallback(() => {
		updateSearchParams({
			districts: undefined,
			center: undefined,
			facility: undefined,
			priceType: undefined,
		});
	}, [updateSearchParams]);

	return {
		handlePriceTypeChange,
		handleDateSelect,
		handleResetAllFilters,
		updateSearchParams,
	};
}
