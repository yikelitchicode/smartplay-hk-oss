/**
 * Validation utilities for crawler testing
 */

import type {
	FacilityApiResponse,
	ProcessedFacilityData,
	TimePeriodData,
} from "../../src/lib/crawler/types";

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	summary: {
		totalVenues: number;
		totalSessions: number;
		availableSessions: number;
	};
}

export function validateApiResponse(
	response: FacilityApiResponse,
): ValidationResult {
	const result: ValidationResult = {
		valid: true,
		errors: [],
		warnings: [],
		summary: {
			totalVenues: 0,
			totalSessions: 0,
			availableSessions: 0,
		},
	};

	if (!response) {
		result.valid = false;
		result.errors.push("Response is empty");
		return result;
	}

	if (response.code !== "0") {
		result.valid = false;
		result.errors.push(
			`API returned error code: ${response.code} - ${response.message}`,
		);
	}

	if (!response.data) {
		result.valid = false;
		result.errors.push("Response data missing");
		return result;
	}

	const { morning, afternoon, evening } = response.data;

	if (!morning || !afternoon || !evening) {
		result.errors.push(
			"Missing one or more time periods (morning, afternoon, evening)",
		);
		result.valid = false;
	}

	// Basic structure check
	const checkPeriod = (name: string, data: TimePeriodData) => {
		if (data?.distList) {
			for (const dist of data.distList) {
				result.summary.totalSessions += dist.sessionCount || 0;
				if (dist.venueList) {
					result.summary.totalVenues += dist.venueList.length;
					for (const venue of dist.venueList) {
						if (!venue.venueId)
							result.errors.push(`Venue missing ID in ${name}`);
						if (!venue.fatList)
							result.errors.push(
								`Venue ${venue.venueName} missing facility list in ${name}`,
							);
					}
				}
			}
		}
	};

	checkPeriod("morning", morning);
	checkPeriod("afternoon", afternoon);
	checkPeriod("evening", evening);

	return result;
}

export function validateProcessedData(
	data: ProcessedFacilityData[],
): ValidationResult {
	const result: ValidationResult = {
		valid: true,
		errors: [],
		warnings: [],
		summary: {
			totalVenues: 0,
			totalSessions: data.length,
			availableSessions: 0,
		},
	};

	if (!Array.isArray(data)) {
		result.valid = false;
		result.errors.push("Processed data is not an array");
		return result;
	}

	const venueIds = new Set<string | number>();

	for (const item of data) {
		venueIds.add(item.venueId);
		if (item.available) {
			result.summary.availableSessions++;
		}

		// Required fields check
		if (!item.venueId) result.errors.push("Missing venueId in processed item");
		if (!item.districtCode)
			result.errors.push("Missing districtCode in processed item");
		if (!item.sessionStartDate)
			result.errors.push("Missing sessionStartDate in processed item");
		if (!item.startTime)
			result.errors.push("Missing startTime in processed item");

		// Logic check
		if (item.available && !item.isOpen) {
			result.warnings.push(
				`Session ${item.startTime} at ${item.venueName} is available but not open`,
			);
		}
	}

	result.summary.totalVenues = venueIds.size;

	if (result.errors.length > 0) {
		result.valid = false;
	}

	return result;
}

export function validateSessionId(id: string): boolean {
	// Base64 encoded session IDs should be strings of reasonable length
	return typeof id === "string" && id.length > 0 && id.length <= 32;
}
