/**
 * Booking service layer
 * Business logic for booking operations separated from server functions
 */

import { prisma } from "@/db";
import type { NormalizedVenue } from "@/lib/booking/types";
import {
	getFacilityDetails,
	getRegion,
	isSessionPassed,
	normalizeTime,
} from "@/lib/booking/utils";
import { healthChecker } from "@/lib/health";
import type { DatabaseErrorType } from "@/lib/health/types";
import {
	classifyDatabaseError,
	withDbErrorHandlingEnhanced,
} from "@/lib/server-utils/error-handler";
import {
	formatDateToYYYYMMDD,
	sortStrings,
} from "@/lib/server-utils/formatting";

// Constants
const ALL_FILTER_VALUE = "All";

/**
 * Retrieves available dates from today onwards
 */
export async function getAvailableDatesService(): Promise<string[]> {
	try {
		// Pre-flight health check
		await healthChecker.checkOrThrow({ timeout: 2000 });

		return await withDbErrorHandlingEnhanced(
			async () => {
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				const sessions = await prisma.session.findMany({
					where: {
						date: {
							gte: today,
						},
					},
					select: {
						date: true,
					},
					distinct: ["date"],
					orderBy: {
						date: "asc",
					},
				});

				// Convert Date objects to YYYY-MM-DD strings
				return sessions.map((s) => formatDateToYYYYMMDD(s.date));
			},
			{
				operationName: "fetching available dates",
				retryOnConnectionError: true,
				maxRetries: 2,
				fallbackValue: [], // Return empty array on connection failure
			},
		);
	} catch (error) {
		// Handle health check failure or database errors
		const errorType = classifyDatabaseError(error);

		if (errorType === ("CONNECTION_FAILED" as DatabaseErrorType)) {
			console.warn(
				"Database unavailable in getAvailableDatesService, returning empty array",
			);
			return []; // Graceful degradation
		}

		throw error; // Re-throw non-connection errors
	}
}

/**
 * Filter parameters for booking data
 */
export interface BookingFilters {
	districts?: string[];
	venueId?: string;
	facilityCode?: string;
	priceType?: "Paid" | "Free";
}

/**
 * Metadata result
 */
export interface MetadataResult {
	districts: Array<{
		code: string;
		name: string;
		nameEn: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
		region: string | null;
	}>;
	facilityTypes: Array<{
		code: string;
		name: string;
		nameEn: string | null;
		nameTc: string | null;
		nameSc: string | null;
		isFree: boolean;
	}>;
	facilityGroups: Array<{
		code: string;
		name: string;
		nameEn: string | null;
		nameTc: string | null;
		nameSc: string | null;
		isFree: boolean;
		facilities: Array<{
			code: string;
			name: string;
			nameEn: string | null;
			nameTc: string | null;
			nameSc: string | null;
			isFree: boolean;
		}>;
	}>;
	centers: Array<{
		id: string;
		name: string;
		nameEn: string | null;
		districtCode: string;
		districtName: string;
		districtNameEn: string | null;
		districtNameTc?: string | null;
		districtNameSc?: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
	}>;
}

/**
 * Result structure for booking data
 */
export interface BookingDataResult {
	venues: NormalizedVenue[];
	districts: Array<{
		code: string;
		name: string;
		region: string;
		nameEn?: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
	}>;
	centers: Array<{
		id: string;
		name: string;
		nameEn?: string | null;
		districtName: string;
		districtCode: string;
		districtNameEn?: string | null;
		districtNameTc?: string | null;
		districtNameSc?: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
	}>;
	districtStats: Record<string, { t: number; a: number }>;
	centerStats: Record<string, { t: number; a: number }>;
}

/**
 * Retrieves and processes booking data for a specific date
 *
 * Performance optimizations:
 * - Single database query with venue inclusion
 * - Single-pass processing through all sessions
 * - Cached computations (normalizeTime, getFacilityDetails, isSessionPassed)
 * - O(1) Map lookups for districts and venues
 *
 * Processing logic:
 * 1. Fetches all sessions for the target date with venue data
 * 2. Builds metadata maps for districts and venues
 * 3. Builds complete venue/facility/session hierarchy for display
 * 4. Calculates statistics for all districts and centers
 * 5. Sorts sessions and prepares response
 *
 * @param date - Target date in YYYY-MM-DD format
 * @param _filters - Unused filter parameters (kept for signature compatibility if needed)
 * @returns Processed booking data with venues, metadata, and statistics
 */
export async function getBookingDataService(
	date: string,
	_filters: BookingFilters = {},
): Promise<BookingDataResult> {
	try {
		// Pre-flight health check
		await healthChecker.checkOrThrow({ timeout: 2000 });

		return await withDbErrorHandlingEnhanced(
			async () => {
				const targetDate = new Date(date);

				// Single comprehensive query
				const allSessions = await prisma.session.findMany({
					where: {
						date: targetDate,
					},
					include: {
						venue: true,
						facilityType: true,
					},
					orderBy: [{ venue: { districtCode: "asc" } }, { startTime: "asc" }],
				});

				// Build maps for districts and venues
				const districtMap = new Map<
					string,
					{
						code: string;
						name: string;
						region: string;
						nameEn?: string | null;
						nameTc?: string | null;
						nameSc?: string | null;
					}
				>();
				const venueMap = new Map<
					string,
					{
						id: string;
						name: string;
						nameEn?: string | null;
						nameTc?: string | null;
						nameSc?: string | null;
						districtName: string;
						districtCode: string;
						districtNameEn?: string | null;
						districtNameTc?: string | null;
						districtNameSc?: string | null;
					}
				>();

				// Initialize stats structures
				const districtStats: Record<string, { t: number; a: number }> = {};
				const centerStats: Record<string, { t: number; a: number }> = {};
				const venuesMap = new Map<string, NormalizedVenue>();

				const targetDateStr = formatDateToYYYYMMDD(targetDate);

				// Single pass through sessions for all operations
				for (const session of allSessions) {
					const dCode = session.venue.districtCode;
					const vId = session.venueId;

					// Collect districts and venues
					if (!districtMap.has(dCode)) {
						districtMap.set(dCode, {
							code: dCode,
							name: session.venue.districtName,
							region: getRegion(dCode),
							nameEn: session.venue.districtNameEn,
							nameTc: session.venue.districtNameTc,
							nameSc: session.venue.districtNameSc,
						});
						districtStats[dCode] = { t: 0, a: 0 };
					}

					if (!venueMap.has(vId)) {
						venueMap.set(vId, {
							id: session.venue.id,
							name: session.venue.name,
							nameEn: session.venue.nameEn,
							nameTc: session.venue.nameTc,
							nameSc: session.venue.nameSc,
							districtName: session.venue.districtName,
							districtCode: dCode,
							districtNameEn: session.venue.districtNameEn,
							districtNameTc: session.venue.districtNameTc,
							districtNameSc: session.venue.districtNameSc,
						});
						centerStats[vId] = { t: 0, a: 0 };
					}

					// Cache session data to avoid redundant computations
					const { name: facilityName, priceType } = getFacilityDetails(
						session.facilityCode,
						session.facilityTypeName,
						session.facilityTypeNameEn,
					);
					const normalizedStartTime = normalizeTime(session.startTime);
					const isSessionPassedValue = isSessionPassed(
						targetDateStr,
						normalizedStartTime,
					);
					const isAvailableSession = session.available && !isSessionPassedValue;

					// Update stats
					districtStats[dCode].t++;
					centerStats[vId].t++;
					if (isAvailableSession) {
						districtStats[dCode].a++;
						centerStats[vId].a++;
					}

					// Build venue structure
					if (!venuesMap.has(vId)) {
						venuesMap.set(vId, {
							id: vId,
							name: session.venue.name,
							nameEn: session.venue.nameEn,
							nameTc: session.venue.nameTc,
							nameSc: session.venue.nameSc,
							districtCode: dCode,
							districtName: session.venue.districtName,
							districtNameEn: session.venue.districtNameEn,
							districtNameTc: session.venue.districtNameTc,
							districtNameSc: session.venue.districtNameSc,
							region: getRegion(dCode),
							imageUrl: session.venue.imageUrl,
							facilities: {},
						});
					}

					const venue = venuesMap.get(vId);
					if (venue) {
						const code = session.facilityCode;

						if (!venue.facilities[code]) {
							venue.facilities[code] = {
								name: session.facilityType?.name || facilityName,
								nameEn:
									session.facilityType?.nameEn || session.facilityTypeNameEn,
								nameTc: session.facilityType?.nameTc,
								nameSc: session.facilityType?.nameSc,
								code: code,
								sessions: [],
								priceType: priceType,
							};
						}

						venue.facilities[code].sessions.push({
							id: session.id,
							startTime: normalizedStartTime,
							endTime: normalizeTime(session.endTime),
							date: targetDateStr,
							available: session.available,
							isPassed: isSessionPassedValue,
							peakHour: session.isPeakHour,
							facilityName: facilityName,
							facilityId: session.facilityCode,
						});
					}
				}

				// Sort sessions within facilities
				venuesMap.forEach((venue) => {
					Object.keys(venue.facilities).forEach((key) => {
						venue.facilities[key].sessions.sort((a, b) =>
							a.startTime.localeCompare(b.startTime),
						);
					});
				});

				// Prepare districts and venues for response
				const availableDistricts = Array.from(districtMap.values()).sort(
					(a, b) => sortStrings(a.name, b.name),
				);

				const centersList = Array.from(venueMap.values()).sort((a, b) =>
					sortStrings(a.name, b.name),
				);

				return {
					venues: Array.from(venuesMap.values()),
					districts: availableDistricts,
					centers: centersList,
					districtStats,
					centerStats,
				};
			},
			{
				operationName: "fetching booking data",
				retryOnConnectionError: true,
				maxRetries: 2,
			},
		);
	} catch (error) {
		// Handle health check failure or database errors
		const errorType = classifyDatabaseError(error);

		if (errorType === ("CONNECTION_FAILED" as DatabaseErrorType)) {
			console.warn(
				`Database unavailable in getBookingDataService for date ${date}, returning empty data`,
			);
			// Return empty structure for graceful degradation
			return {
				venues: [],
				districts: [],
				centers: [],
				districtStats: {},
				centerStats: {},
			};
		}

		throw error; // Re-throw non-connection errors
	}
}

/**
 * Retrieves availability statistics for multiple dates
 */
export async function getDatesAvailabilityService(
	filters: BookingFilters,
): Promise<Record<string, { t: number; a: number }>> {
	try {
		// Pre-flight health check
		await healthChecker.checkOrThrow({ timeout: 2000 });

		return await withDbErrorHandlingEnhanced(
			async () => {
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				const targetDistricts = filters.districts?.includes(ALL_FILTER_VALUE)
					? undefined
					: filters.districts;
				const targetVenueId =
					filters.venueId === ALL_FILTER_VALUE ? undefined : filters.venueId;
				const targetFacilityCode =
					filters.facilityCode === ALL_FILTER_VALUE
						? undefined
						: filters.facilityCode;

				// Fetch all future sessions matching filters
				const sessions = await prisma.session.findMany({
					where: {
						date: { gte: today },
						AND: [
							targetDistricts
								? {
										venue: {
											districtCode: { in: targetDistricts },
										},
									}
								: {},
							targetVenueId ? { venueId: targetVenueId } : {},
							targetFacilityCode ? { facilityCode: targetFacilityCode } : {},
						],
					},
					select: {
						date: true,
						available: true,
						facilityCode: true,
						facilityTypeName: true,
						facilityTypeNameEn: true,
						startTime: true,
					},
				});

				const dateStats: Record<string, { t: number; a: number }> = {};

				for (const s of sessions) {
					const { priceType: sPriceType } = getFacilityDetails(
						s.facilityCode,
						s.facilityTypeName,
						s.facilityTypeNameEn,
					);

					if (filters.priceType && sPriceType !== filters.priceType) continue;

					const dateStr = formatDateToYYYYMMDD(s.date);
					if (!dateStats[dateStr]) dateStats[dateStr] = { t: 0, a: 0 };

					dateStats[dateStr].t++;
					if (
						s.available &&
						!isSessionPassed(dateStr, normalizeTime(s.startTime))
					) {
						dateStats[dateStr].a++;
					}
				}

				return dateStats;
			},
			{
				operationName: "fetching dates availability",
				retryOnConnectionError: true,
				maxRetries: 2,
				fallbackValue: {},
			},
		);
	} catch (error) {
		// Handle health check failure or database errors
		const errorType = classifyDatabaseError(error);

		if (errorType === ("CONNECTION_FAILED" as DatabaseErrorType)) {
			console.warn(
				"Database unavailable in getDatesAvailabilityService, returning empty stats",
			);
			return {}; // Graceful degradation
		}

		throw error; // Re-throw non-connection errors
	}
}

/**
 * Retrieves the last update timestamp
 */
export async function getLastUpdateTimeService(): Promise<Date | null> {
	try {
		// Pre-flight health check
		await healthChecker.checkOrThrow({ timeout: 2000 });

		return await withDbErrorHandlingEnhanced(
			async () => {
				const lastJob = await prisma.crawlJob.findFirst({
					where: {
						status: "COMPLETED",
					},
					orderBy: {
						completedAt: "desc",
					},
					select: {
						completedAt: true,
					},
				});

				return lastJob?.completedAt || null;
			},
			{
				operationName: "fetching last update time",
				retryOnConnectionError: true,
				maxRetries: 2,
				fallbackValue: null,
			},
		);
	} catch (error) {
		// Handle health check failure or database errors
		const errorType = classifyDatabaseError(error);

		if (errorType === ("CONNECTION_FAILED" as DatabaseErrorType)) {
			console.warn(
				"Database unavailable in getLastUpdateTimeService, returning null",
			);
			return null; // Graceful degradation
		}

		throw error; // Re-throw non-connection errors
	}
}

/**
 * Retrieves static metadata (Districts, FacilityTypes)
 */
export async function getMetadataService(): Promise<MetadataResult> {
	try {
		// Pre-flight health check
		await healthChecker.checkOrThrow({ timeout: 2000 });

		return await withDbErrorHandlingEnhanced(
			async () => {
				const [districts, facilityGroups, centers] = await Promise.all([
					prisma.district.findMany({
						orderBy: { code: "asc" },
					}),
					prisma.facilityGroup.findMany({
						where: { isVisible: true },
						include: {
							facilities: {
								where: { isVisible: true },
								orderBy: { seq: "asc" },
							},
						},
						orderBy: { seq: "asc" },
					}),
					prisma.facility.findMany({
						include: { district: true },
						orderBy: [{ districtCode: "asc" }, { name: "asc" }],
					}),
				]);

				// Flatten facility types from groups for backward compatibility
				const facilityTypes = facilityGroups.flatMap((g) =>
					g.facilities.map((ft) => ({
						code: ft.code,
						name: ft.name,
						nameEn: ft.nameEn,
						nameTc: ft.nameTc,
						nameSc: ft.nameSc,
						isFree: ft.isFree,
					})),
				);

				return {
					districts: districts.map((d) => ({
						code: d.code,
						name: d.name,
						nameEn: d.nameEn,
						nameTc: d.nameTc,
						nameSc: d.nameSc,
						region: d.region,
					})),
					facilityTypes,
					facilityGroups: facilityGroups.map((g) => ({
						code: g.code,
						name: g.name,
						nameEn: g.nameEn,
						nameTc: g.nameTc,
						nameSc: g.nameSc,
						isFree: g.isFree,
						facilities: g.facilities.map((ft) => ({
							code: ft.code,
							name: ft.name,
							nameEn: ft.nameEn,
							nameTc: ft.nameTc,
							nameSc: ft.nameSc,
							isFree: ft.isFree,
						})),
					})),
					centers: centers.map((c) => ({
						id: c.id,
						name: c.name,
						nameEn: c.nameEn,
						nameTc: c.nameTc,
						nameSc: c.nameSc,
						districtCode: c.districtCode,
						districtName: c.district.name,
						districtNameEn: c.district.nameEn,
						districtNameTc: c.district.nameTc,
						districtNameSc: c.district.nameSc,
					})),
				};
			},
			{
				operationName: "fetching metadata",
				retryOnConnectionError: true,
				maxRetries: 2,
			},
		);
	} catch (error) {
		// Handle health check failure or database errors
		const errorType = classifyDatabaseError(error);

		if (errorType === ("CONNECTION_FAILED" as DatabaseErrorType)) {
			console.warn(
				"Database unavailable in getMetadataService, throwing error",
			);
			throw new Error(
				"Database unavailable. Unable to fetch facility metadata.",
			);
		}

		throw error; // Re-throw non-connection errors
	}
}
