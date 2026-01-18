/**
 * Real-time availability check service
 * Queries the LCSD API directly to verify session availability
 */

import { prisma } from "@/db";
import type { VerificationSource } from "@/generated/prisma/enums";
import { SmartPlayHttpClient } from "@/lib/crawler";
import { loadConfig } from "@/lib/crawler/config";
import type { FacilityApiResponse } from "@/lib/crawler/types";
import { crawlerLogger } from "@/lib/logger";

export interface CheckAvailabilityParams {
	venueId: string;
	facilityCode: string;
	date: string; // YYYY-MM-DD format from Zod validation
	startTime: string;
	endTime: string;
}

export interface AvailabilityResult {
	isAvailable: boolean;
	details?: {
		fatId: number;
		fvrId: number;
		faGroupCode: string;
		venueName: string;
		venueId: string;
		typeCode: string;
		sessionIndex: number;
		dateIndex: number;
	};
}

/**
 * Update session availability in database after verification
 */
async function updateSessionAvailability(params: {
	venueId: string;
	facilityCode: string;
	date: Date;
	startTime: string;
	endTime: string;
	available: boolean;
	verifiedBy: VerificationSource;
}): Promise<void> {
	try {
		// Normalize the date to UTC midnight (same format as stored in database)
		// Both frontend and database use dates normalized to UTC midnight (e.g., 2026-01-18T00:00:00.000Z)
		const normalizedDate = new Date(
			Date.UTC(
				params.date.getUTCFullYear(),
				params.date.getUTCMonth(),
				params.date.getUTCDate(),
				0,
				0,
				0,
				0,
			),
		);

		// Normalize time to HH:MM:SS format (database stores with seconds)
		// Frontend sends "08:00" but database stores "08:00:00"
		const normalizeTimeForDb = (time: string): string => {
			const parts = time.split(":");
			if (parts.length === 2) {
				return `${parts[0]}:${parts[1]}:00`;
			}
			return time; // Already has seconds
		};

		const normalizedStartTime = normalizeTimeForDb(params.startTime);

		crawlerLogger.debug(
			{
				venueId: params.venueId,
				facilityCode: params.facilityCode,
				inputDate: params.date.toISOString(),
				normalizedDate: normalizedDate.toISOString(),
				inputStartTime: params.startTime,
				normalizedStartTime,
			},
			"Searching for session to update availability",
		);

		// Find the session using unique constraint
		const session = await prisma.session.findUnique({
			where: {
				venueId_facilityCode_date_startTime: {
					venueId: params.venueId,
					facilityCode: params.facilityCode,
					date: normalizedDate,
					startTime: normalizedStartTime,
				},
			},
		});

		if (!session) {
			crawlerLogger.warn(
				{
					venueId: params.venueId,
					facilityCode: params.facilityCode,
					date: normalizedDate.toISOString(),
					startTime: params.startTime,
					endTime: params.endTime,
					inputDate: params.date.toISOString(),
				},
				"Session not found for availability update",
			);
			return;
		}

		// Update session with verification data
		await prisma.session.update({
			where: { id: session.id },
			data: {
				available: params.available,
				lastVerifiedAt: new Date(),
				verifiedBy: params.verifiedBy,
				// If confirming as available, update lastAvailableAt
				...(params.available && { lastAvailableAt: new Date() }),
			},
		});

		crawlerLogger.info(
			{
				sessionId: session.id,
				venueId: params.venueId,
				facilityCode: params.facilityCode,
				available: params.available,
				verifiedBy: params.verifiedBy,
				previousAvailable: session.available,
			},
			"Session availability updated after user verification",
		);
	} catch (error) {
		// Log but don't throw - database update shouldn't block user experience
		crawlerLogger.error(
			{
				error: error instanceof Error ? error.message : String(error),
				venueId: params.venueId,
				facilityCode: params.facilityCode,
			},
			"Failed to update session availability in database",
		);
	}
}

/**
 * Check if a specific session is currently available in the LCSD API
 */
export async function checkSessionAvailabilityService({
	venueId,
	facilityCode,
	date,
	startTime,
	endTime,
}: CheckAvailabilityParams): Promise<AvailabilityResult> {
	try {
		crawlerLogger.info(
			{
				venueId,
				facilityCode,
				date,
				startTime,
				endTime,
			},
			"Checking real-time availability",
		);

		// Get venue info to extract district code
		const venue = await prisma.facility.findUnique({
			where: { id: venueId },
			select: {
				districtCode: true,
				name: true,
			},
		});

		if (!venue) {
			crawlerLogger.warn({ venueId }, "Venue not found");
			throw new Error("Venue not found");
		}

		// Date is already in YYYY-MM-DD format from Zod schema

		// Configure crawler for single district, single facility type
		const config = loadConfig({
			distCode: [venue.districtCode],
			faCode: [facilityCode],
		});

		// Create HTTP client
		const httpClient = new SmartPlayHttpClient(config);

		// Query LCSD API
		const response = await httpClient.fetchWithRetry({
			distCode: venue.districtCode,
			faCode: [facilityCode],
			playDate: date, // Already in YYYY-MM-DD format
		});

		// Check if the specific session is available
		const isAvailable = findSessionInResponse(
			response,
			venueId,
			facilityCode,
			startTime,
			endTime,
		);

		// Update database if session is confirmed unavailable
		// This keeps data fresh for all users
		if (!isAvailable) {
			// Fire-and-forget update - don't block user experience
			updateSessionAvailability({
				venueId,
				facilityCode,
				date: new Date(date),
				startTime,
				endTime,
				available: false,
				verifiedBy: "USER",
			}).catch((err) => {
				// Already logged inside function
				console.error("Background availability update failed:", err);
			});
		} else {
			// Also update when confirmed available (for tracking)
			updateSessionAvailability({
				venueId,
				facilityCode,
				date: new Date(date),
				startTime,
				endTime,
				available: true,
				verifiedBy: "USER",
			}).catch((err) => {
				console.error("Background availability update failed:", err);
			});
		}

		crawlerLogger.info(
			{
				venueId,
				facilityCode,
				isAvailable: isAvailable.isAvailable,
			},
			"Real-time availability check completed",
		);

		return isAvailable;
	} catch (error) {
		crawlerLogger.error(
			{
				error: error instanceof Error ? error.message : String(error),
				venueId,
				facilityCode,
			},
			"Failed to check real-time availability",
		);

		// Re-throw with context
		throw new Error(
			`Failed to check availability: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Find a specific session in the LCSD API response
 */
function findSessionInResponse(
	response: FacilityApiResponse,
	venueId: string,
	facilityCode: string,
	startTime: string,
	endTime: string,
): AvailabilityResult {
	try {
		if (!response.data) {
			crawlerLogger.warn("No data in LCSD API response");
			return { isAvailable: false };
		}

		// Normalize time to HH:MM format for comparison
		const normalizeTime = (time: string): string => {
			// Handle both "18:00" and "18:00:00" formats
			const parts = time.split(":");
			return `${parts[0]}:${parts[1]}`;
		};

		const normalizedStartTime = normalizeTime(startTime);
		const normalizedEndTime = normalizeTime(endTime);

		// Search through all time periods
		const timePeriods = [
			response.data.morning,
			response.data.afternoon,
			response.data.evening,
		];

		// Debug: Log what we're searching for
		crawlerLogger.debug(
			{
				venueId,
				facilityCode,
				startTime: normalizedStartTime,
				endTime: normalizedEndTime,
			},
			"Searching for session in LCSD API response",
		);

		for (let periodIdx = 0; periodIdx < timePeriods.length; periodIdx++) {
			const period = timePeriods[periodIdx];
			if (!period?.distList) continue;

			for (const district of period.distList) {
				if (!district.venueList) continue;

				for (const venue of district.venueList) {
					// Match venue ID (convert to string for comparison)
					if (String(venue.venueId) !== venueId) continue;

					if (!venue.fatList) continue;

					for (const facilityType of venue.fatList) {
						// Match facility code
						if (facilityType.faCode !== facilityCode) continue;

						if (!facilityType.sessionList) continue;

						// User clarified:
						// dateIndex = 0 (Morning), 1 (Afternoon), 2 (Evening)
						// sessionIndex = 0-based index within that period list
						const sessionIdx = facilityType.sessionList.findIndex(
							(s) =>
								normalizeTime(s.ssnStartTime) === normalizedStartTime &&
								normalizeTime(s.ssnEndTime) === normalizedEndTime,
						);

						if (sessionIdx !== -1) {
							const matchingSession = facilityType.sessionList[sessionIdx];

							return {
								isAvailable: matchingSession.available === true,
								details:
									matchingSession.available === true
										? {
												fatId: facilityType.fatId,
												fvrId: facilityType.fvrId,
												faGroupCode: facilityType.faGroupCode,
												venueName: venue.venueName,
												venueId: String(venue.venueId),
												typeCode: facilityType.faCode,
												sessionIndex: sessionIdx,
												dateIndex: periodIdx,
											}
										: undefined,
							};
						}
					}
				}
			}
		}

		crawlerLogger.warn(
			{
				venueId,
				facilityCode,
				startTime: normalizedStartTime,
				endTime: normalizedEndTime,
			},
			"Session not found in LCSD API response",
		);

		return { isAvailable: false };
	} catch (error) {
		crawlerLogger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to parse LCSD API response",
		);
		return { isAvailable: false };
	}
}
