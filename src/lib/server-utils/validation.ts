/**
 * Server-side validation utilities
 */

import { z } from "zod";

/**
 * Date format validation schema (YYYY-MM-DD)
 */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
	message: "Date must be in YYYY-MM-DD format",
});

/**
 * Validates and parses a date string
 */
export function validateDateString(dateStr: string): Date | null {
	try {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return null;

		// Check if the date string matches YYYY-MM-DD format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

		return date;
	} catch {
		return null;
	}
}

/**
 * Validates district codes against allowed values
 */
export function validateDistrictCodes(
	districts: string[],
	allowedDistricts: Set<string>,
): boolean {
	return districts.every((d) => d === "All" || allowedDistricts.has(d));
}

/**
 * Validates venue ID exists in provided list
 */
export function validateVenueId(
	venueId: string,
	allowedVenueIds: Set<string>,
): boolean {
	return venueId === "All" || allowedVenueIds.has(venueId);
}

/**
 * Validates facility code exists in provided list
 */
export function validateFacilityCode(
	facilityCode: string,
	allowedFacilityCodes: Set<string>,
): boolean {
	return facilityCode === "All" || allowedFacilityCodes.has(facilityCode);
}
