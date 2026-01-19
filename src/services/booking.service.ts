/**
 * Booking service layer
 * Business logic for booking operations separated from server functions
 */

import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import type { NormalizedVenue } from "@/lib/booking/types";

interface DistrictMapValue {
	code: string;
	name: string;
	region: string;
	nameEn: string | null;
	nameTc?: string | null;
	nameSc?: string | null;
}

import {
	getFacilityDetails,
	getRegion,
	isSessionPassed,
	normalizeTime,
} from "@/lib/booking/utils";
import { healthChecker } from "@/lib/health";

import {
	classifyDatabaseError,
	withDbErrorHandling,
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

		return await withDbErrorHandling(
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

		if (errorType === "CONNECTION_FAILED") {
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
	query?: string; // Search query for venue/district/facility type names
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
 * Result structure for paginated booking data
 */
export interface BookingDataPaginatedResult {
	venues: NormalizedVenue[];
	districts: Array<{
		code: string;
		name: string;
		region: string;
		nameEn?: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
		hasData?: boolean;
		totalSessions: number;
		availableSessions: number;
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
	pagination: {
		currentPage: number;
		totalPages: number;
		totalVenues: number;
	};
	availableFacilities?: string[];
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
/**
 * Retrieves and processes booking data for a specific date
 */
export async function getBookingDataService(
	date: string,
	filters: BookingFilters = {},
	page = 1,
	pageSize = 6,
): Promise<BookingDataPaginatedResult> {
	try {
		await healthChecker.checkOrThrow({ timeout: 2000 });

		return await withDbErrorHandling(
			async () => {
				const targetDate = new Date(date);

				// Calculate pagination
				// Add an offset to skip "page-1" pages of size "pageSize"
				const skip = (page - 1) * pageSize;

				// 1. Fetch filtered venues first (Pagination Logic)
				// We need to find venues that have sessions matching our criteria
				const targetDistricts = filters.districts?.includes(ALL_FILTER_VALUE)
					? undefined
					: filters.districts;
				const targetVenueId =
					filters.venueId === ALL_FILTER_VALUE ? undefined : filters.venueId;
				const targetFacilityCode =
					filters.facilityCode === ALL_FILTER_VALUE
						? undefined
						: filters.facilityCode;

				// Base where clause for venues
				const venueWhere: Prisma.FacilityWhereInput = {};

				if (targetDistricts) {
					venueWhere.districtCode = { in: targetDistricts };
				}
				if (targetVenueId) {
					venueWhere.id = targetVenueId;
				}

				// Base session filter (date, price type) - WITHOUT specific facility code
				const baseSessionWhereInput: Prisma.SessionWhereInput = {
					date: targetDate,
				};

				if (filters.priceType) {
					const isFree = filters.priceType === "Free";
					baseSessionWhereInput.facilityType = { isFree };
				}

				// Main session filter - INCLUDES specific facility code if selected
				const mainSessionWhereInput: Prisma.SessionWhereInput = {
					...baseSessionWhereInput,
				};

				if (targetFacilityCode) {
					mainSessionWhereInput.facilityCode = targetFacilityCode;
				}

				// Helper to build venue search conditions
				const buildVenueWhere = (
					sessionWhere: Prisma.SessionWhereInput,
				): Prisma.FacilityWhereInput => {
					const vWhere: Prisma.FacilityWhereInput = {};
					if (targetDistricts) vWhere.districtCode = { in: targetDistricts };
					if (targetVenueId) vWhere.id = targetVenueId;

					if (filters.query && filters.query.trim().length >= 2) {
						const q = filters.query.trim();
						const venueNameConditions = [
							{ name: { contains: q, mode: "insensitive" as const } },
							{ nameEn: { contains: q, mode: "insensitive" as const } },
							{ nameTc: { contains: q, mode: "insensitive" as const } },
							{ nameSc: { contains: q, mode: "insensitive" as const } },
							{ districtName: { contains: q, mode: "insensitive" as const } },
							{ districtNameEn: { contains: q, mode: "insensitive" as const } },
							{ districtNameTc: { contains: q, mode: "insensitive" as const } },
							{ districtNameSc: { contains: q, mode: "insensitive" as const } },
						];

						vWhere.OR = [
							...venueNameConditions.map((cond) => ({
								...cond,
								sessions: { some: sessionWhere },
							})),
							{
								sessions: {
									some: {
										...sessionWhere,
										OR: [
											{
												facilityTypeName: {
													contains: q,
													mode: "insensitive" as const,
												},
											},
											{
												facilityTypeNameEn: {
													contains: q,
													mode: "insensitive" as const,
												},
											},
											{
												facilityTypeNameTc: {
													contains: q,
													mode: "insensitive" as const,
												},
											},
											{
												facilityTypeNameSc: {
													contains: q,
													mode: "insensitive" as const,
												},
											},
										],
									},
								},
							},
						];
					} else {
						// Ensure venues have at least one valid session if no search query
						vWhere.sessions = { some: sessionWhere };
					}
					return vWhere;
				};

				const mainVenueWhere = buildVenueWhere(mainSessionWhereInput);
				const optionsVenueWhere = buildVenueWhere(baseSessionWhereInput);

				// 1. Get paginated venues
				const [totalVenues, facilities] = await Promise.all([
					prisma.facility.count({ where: mainVenueWhere }),
					prisma.facility.findMany({
						where: mainVenueWhere,
						include: {
							sessions: {
								where: mainSessionWhereInput,
								orderBy: { startTime: "asc" },
								include: {
									facilityType: true,
								},
							},
						},
						skip,
						take: pageSize,
					}),
				]);

				// 2. Get available facility codes matching the broad search (for dropdown filtering)
				const availableFacilitiesResult = await prisma.session.findMany({
					where: {
						venue: optionsVenueWhere,
						...baseSessionWhereInput,
					},
					distinct: ["facilityCode"],
					select: {
						facilityCode: true,
					},
				});
				const availableFacilities = availableFacilitiesResult.map(
					(f) => f.facilityCode,
				);

				// Build maps for districts (needed for response structure)
				// We fetch ALL districts relevant to the venues we found, not just paginated ones
				// actually we just need distinct districts from the venues

				const districtMap = new Map<string, DistrictMapValue>();
				const venueMap = new Map<string, NormalizedVenue>();

				// Initialize venues from facilities (even if they have no sessions matching criteria)
				for (const facility of facilities) {
					const dCode = facility.districtCode;

					if (!districtMap.has(dCode)) {
						districtMap.set(dCode, {
							code: dCode,
							name: facility.districtName,
							region: getRegion(dCode),
							nameEn: facility.districtNameEn,
							nameTc: facility.districtNameTc,
							nameSc: facility.districtNameSc,
						});
					}

					venueMap.set(facility.id, {
						id: facility.id,
						name: facility.name,
						nameEn: facility.nameEn,
						nameTc: facility.nameTc,
						nameSc: facility.nameSc,
						districtCode: dCode,
						districtName: facility.districtName,
						districtNameEn: facility.districtNameEn,
						districtNameTc: facility.districtNameTc,
						districtNameSc: facility.districtNameSc,
						region: getRegion(dCode),
						imageUrl: facility.imageUrl,
						facilities: {}, // Will populate
					});
				}

				// Populate match sessions
				const targetDateStr = formatDateToYYYYMMDD(targetDate);

				for (const facility of facilities) {
					const venue = venueMap.get(facility.id);
					// Skip if venue not in map (should not happen as we just populated it)
					if (!venue) continue;

					for (const session of facility.sessions) {
						// Cache session data
						const { name: facilityName, priceType } = getFacilityDetails(
							session.facilityCode,
							session.facilityTypeName,
							session.facilityTypeNameEn,
						);
						const normalizedStartTime = normalizeTime(session.startTime);
						// Note: isSessionPassed logic might need checking context, but simple usage here
						// Assuming isSessionPassed is pure helper
						// const isSessionPassedValue = isSessionPassed(...) // Not strictly used in map population?
						// Actually it IS used to mark availability? No, usage below only sets Basic fields.
						// Wait, original code didn't use isSessionPassedValue in the push?
						// Let's check original lines. It was calculating it but maybe not using it?
						// Ah, NormalizedSession has isPassed.

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
							isPassed: false, // Calculated on frontend usually
							peakHour: session.isPeakHour,
							facilityName: session.facilityTypeName,
							facilityId: session.facilityCode,
							isProjected: false,
						});
					}
				}

				// Cleanup empty facilities if needed?
				// No, keep them to show "no slots"

				// Sort sessions
				venueMap.forEach((venue) => {
					Object.keys(venue.facilities).forEach((key) => {
						venue.facilities[key].sessions.sort((a, b) =>
							a.startTime.localeCompare(b.startTime),
						);
					});
				});

				// This ignores the district filter but respects facility/price filters
				const { districtCode: _, ...statsWhere } = mainVenueWhere;
				const districtData = await prisma.facility.findMany({
					where: statsWhere,
					select: {
						districtCode: true,
						sessions: {
							where: mainSessionWhereInput,
							select: {
								available: true,
								startTime: true,
							},
						},
					},
				});

				const districtStatsMap = new Map<string, { t: number; a: number }>();
				for (const item of districtData) {
					const stats = districtStatsMap.get(item.districtCode) || {
						t: 0,
						a: 0,
					};
					stats.t += item.sessions.length;
					stats.a += item.sessions.filter(
						(s) =>
							s.available &&
							!isSessionPassed(targetDateStr, normalizeTime(s.startTime)),
					).length;
					districtStatsMap.set(item.districtCode, stats);
				}

				// Fetch ALL system districts to display in filter bar
				const allDistricts = await prisma.district.findMany({
					orderBy: { code: "asc" },
				});

				const availableDistricts = allDistricts
					.map((d) => {
						const stats = districtStatsMap.get(d.code) || { t: 0, a: 0 };
						return {
							code: d.code,
							name: d.name,
							region: d.region || "New Territories",
							nameEn: d.nameEn,
							nameTc: d.nameTc,
							nameSc: d.nameSc,
							hasData: stats.t > 0,
							totalSessions: stats.t,
							availableSessions: stats.a,
						};
					})
					.sort((a, b) => sortStrings(a.name, b.name));

				// Fetch ALL matching centers for the filter dropdown
				// We use venueWhere but exclude the specific venue ID filter to allow switching
				const centersWhere: Prisma.FacilityWhereInput = {
					...mainVenueWhere,
					id: undefined,
				};

				const allMatchingCenters = await prisma.facility.findMany({
					where: centersWhere,
					include: { district: true },
					orderBy: { name: "asc" },
				});

				const centersList = allMatchingCenters.map((c) => ({
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
				}));

				return {
					venues: Array.from(venueMap.values()),
					districts: availableDistricts,
					centers: centersList,
					pagination: {
						currentPage: page,
						totalPages: Math.ceil(totalVenues / pageSize),
						totalVenues,
					},
					availableFacilities,
				};
			},
			{
				operationName: "fetching booking data",
				retryOnConnectionError: true,
				maxRetries: 2,
			},
		);
	} catch (error) {
		const errorType = classifyDatabaseError(error);

		if (errorType === "CONNECTION_FAILED") {
			console.warn(
				`Database unavailable in getBookingDataService for date ${date}`,
			);
			return {
				venues: [],
				districts: [],
				centers: [],
				pagination: {
					currentPage: 1,
					totalPages: 0,
					totalVenues: 0,
				},
				availableFacilities: [],
			};
		}

		throw error;
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

		return await withDbErrorHandling(
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

		if (errorType === "CONNECTION_FAILED") {
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

		return await withDbErrorHandling(
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

		if (errorType === "CONNECTION_FAILED") {
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

		return await withDbErrorHandling(
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

		if (errorType === "CONNECTION_FAILED") {
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
