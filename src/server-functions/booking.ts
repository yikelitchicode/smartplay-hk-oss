import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import type { NormalizedVenue } from "@/lib/booking/types";
import {
	getFacilityDetails,
	getRegion,
	isSessionPassed,
	normalizeTime,
} from "@/lib/booking/utils";

// ============================================
// Get Available Dates
// ============================================

export const getAvailableDates = createServerFn({
	method: "GET",
}).handler(async () => {
	// Get distinct dates with available sessions
	// Since we want dates that have ANY sessions (or available ones? The draft implied just dates with data)
	// We will query distinct dates from Session table

	// Note: Prisma distinct is good.
	// We need to fetch dates greater than or equal to today to avoid old history?
	// For now, let's just get all future dates.

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
	const uniqueDates = sessions.map((s) => {
		return s.date.toISOString().split("T")[0];
	});

	return {
		success: true,
		data: uniqueDates,
	};
});

// ============================================
// Get Booking Data for a Date
// ============================================

export const getBookingData = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			date: z.string(), // YYYY-MM-DD
			districts: z.array(z.string()).optional(), // These should be codes now
			venueId: z.string().optional(),
			facilityCode: z.string().optional(),
			priceType: z.enum(["Paid", "Free"]).optional(),
		}),
	)
	.handler(
		async ({ data: { date, districts, venueId, facilityCode, priceType } }) => {
			// Parse date string to Date object
			// Assuming the input is YYYY-MM-DD and stored as UTC midnight or local midnight
			// We try to match the exact date stored in DB
			const targetDate = new Date(date);

			// 1. Get ALL unique districts that have ANY sessions for this date
			// This is used for the filter bar so it doesn't shrink when one is selected
			const allSessionsOnDate = await prisma.session.findMany({
				where: {
					date: targetDate,
				},
				select: {
					venue: {
						select: {
							districtCode: true,
							districtName: true,
						},
					},
				},
				distinct: ["venueId"],
			});

			const availableDistricts = Array.from(
				new Map(
					allSessionsOnDate.map((s) => [
						s.venue.districtName,
						{
							code: s.venue.districtCode,
							name: s.venue.districtName,
							region: getRegion(s.venue.districtCode),
						},
					]),
				).values(),
			).sort((a, b) => a.name.localeCompare(b.name));

			// 2. Get ALL venues that match the DISTRICT filter (available options for Center dropdown)
			const districtFilteredSessions = await prisma.session.findMany({
				where: {
					date: targetDate,
					venue:
						districts && districts.length > 0 && !districts.includes("All")
							? {
									districtCode: { in: districts },
								}
							: undefined,
				},
				select: {
					venue: {
						select: {
							id: true,
							name: true,
							districtName: true,
							districtCode: true,
						},
					},
				},
				distinct: ["venueId"],
			});

			const availableVenues = districtFilteredSessions
				.map((s) => ({
					id: s.venue.id,
					name: s.venue.name,
					districtName: s.venue.districtName,
					districtCode: s.venue.districtCode,
				}))
				.sort((a, b) => a.name.localeCompare(b.name));

			// 3. Get the venues (filtered by districts AND specific venue if selected)
			// We might need to be careful with timezones.
			// If stored as 2026-01-13T00:00:00.000Z, doing new Date("2026-01-13") gives UTC midnight.
			// So simple equality check should work if data was stored sanely.

			const sessions = await prisma.session.findMany({
				where: {
					date: targetDate,
					AND: [
						districts && districts.length > 0 && !districts.includes("All")
							? {
									venue: {
										districtCode: { in: districts },
									},
								}
							: {},
						venueId && venueId !== "All"
							? {
									venueId: venueId,
								}
							: {},
						facilityCode && facilityCode !== "All"
							? {
									facilityCode: facilityCode,
								}
							: {},
					],
				},
				include: {
					venue: true,
				},
				orderBy: [
					{
						venue: {
							districtCode: "asc",
						},
					},
					{
						startTime: "asc",
					},
				],
			});

			// Transform to NormalizedVenue[]
			const venuesMap = new Map<string, NormalizedVenue>();

			for (const session of sessions) {
				// 1. Get or Create Queue Venue
				if (!venuesMap.has(session.venueId)) {
					venuesMap.set(session.venueId, {
						id: session.venueId,
						name: session.venue.name,
						districtCode: session.venue.districtCode,
						districtName: session.venue.districtName,
						region: getRegion(session.venue.districtCode),
						imageUrl: session.venue.imageUrl,
						facilities: {},
					});
				}

				const venue = venuesMap.get(session.venueId);
				if (!venue) {
					throw new Error(`Venue ${session.venueId} not found in map`);
				}

				// 2. Identify Facility (Logic from utils but adapted)
				const { name, priceType } = getFacilityDetails(
					session.facilityCode,
					session.facilityTypeName,
					session.facilityTypeNameEn,
				);

				// 3. Add to Facility Map
				const code = session.facilityCode;
				if (!venue.facilities[code]) {
					venue.facilities[code] = {
						name: name,
						code: code,
						sessions: [],
						priceType: priceType,
					};
				}

				// 4. Add Session
				// Logic checks for duplicates in draft utils, but DB should be unique by constraint?
				// @@unique([venueId, facilityTypeId, date, startTime]) in schema.
				// But here we are grouping by 'name' (Display Name).
				// Different facilityTypeIds could map to same Display Name (e.g. Tennis Urban vs Tennis NT).
				// If so, we merge them. Duplicate check is good practice.

				const sessionStart = normalizeTime(session.startTime);
				// const ssnId calculation removed as it was unused
				// Actually strictly speaking, different 'courts' are usually represented by facilityVRId or similar,
				// but the API/Crawler seems to aggregate counts?
				// The schema says `session` has `available`, `isOpen`.
				// The draft logic pushed sessions.

				venue.facilities[code].sessions.push({
					id: session.id, // Use DB ID
					startTime: sessionStart,
					endTime: normalizeTime(session.endTime),
					date: date,
					available: session.available,
					isPassed: isSessionPassed(date, sessionStart),
					peakHour: session.isPeakHour,
					facilityName: name,
					facilityId: session.facilityTypeId, // Use type ID kind of loose here
				});
			}

			// Sort sessions again just in case merging messed up order
			// Sort sessions again just in case merging messed up order
			venuesMap.forEach((venue) => {
				Object.keys(venue.facilities).forEach((key) => {
					venue.facilities[key].sessions.sort((a, b) =>
						a.startTime.localeCompare(b.startTime),
					);
				});
			});

			// 5. Calculate District Stats (Independent of District Filter)
			// We need to count sessions per district for the current date/facility/price filters
			// but IGNORING the district filter itself.
			// Fortunately we can reuse logic or query.
			// Since we want "Availability" (available sessions) and "Total", we need to query sessions.
			// Querying all sessions might be heavy if we don't filter by district.
			// But for the filter bar to work correctly (show availability for other districts), we MUST know their stats.

			// Let's do an aggregate query or findMany with select.
			const districtStatsSessions = await prisma.session.findMany({
				where: {
					date: targetDate, // Same date
					// Same Facility/Price filters
					venueId: venueId !== "All" ? venueId : undefined,
					facilityCode: facilityCode !== "All" ? facilityCode : undefined,
					// Filter by price type if needed (checking facility detail or if stored on session?)
					// Session doesn't strictly have priceType, we infer from facilityCode usually.
					// But we did strict check in loop above.
					// For improved performance we might need to trust facilityCode implies priceType usually.
					// Or fetch minimal data and filter in JS.
				},
				select: {
					available: true,
					startTime: true,
					venueId: true,
					venue: {
						select: {
							id: true,
							districtCode: true,
						},
					},
					facilityCode: true,
					facilityTypeName: true,
					facilityTypeNameEn: true,
				},
			});

			const districtStats: Record<string, { t: number; a: number }> = {};
			const centerStats: Record<string, { t: number; a: number }> = {};

			// Initialize all available districts and venues with 0
			availableDistricts.forEach((d) => {
				districtStats[d.code] = { t: 0, a: 0 };
			});
			availableVenues.forEach((v) => {
				centerStats[v.id] = { t: 0, a: 0 };
			});

			for (const s of districtStatsSessions) {
				const { priceType: sPriceType } = getFacilityDetails(
					s.facilityCode,
					s.facilityTypeName,
					s.facilityTypeNameEn,
				);

				// Now priceType is available in scope
				if (priceType && sPriceType !== priceType) continue;

				// District Stats
				const dCode = s.venue.districtCode;
				if (!districtStats[dCode]) districtStats[dCode] = { t: 0, a: 0 };
				districtStats[dCode].t++;

				// Center Stats
				const vId = s.venueId as string; // prisma select includes venueId? wait let's check select
				if (!centerStats[vId]) centerStats[vId] = { t: 0, a: 0 };
				centerStats[vId].t++;

				if (
					s.available &&
					!isSessionPassed(
						targetDate.toISOString().split("T")[0],
						normalizeTime(s.startTime),
					)
				) {
					districtStats[dCode].a++;
					centerStats[vId].a++;
				}
			}

			return {
				success: true,
				data: {
					venues: Array.from(venuesMap.values()),
					districts: availableDistricts,
					centers: availableVenues,
					districtStats: districtStats,
					centerStats: centerStats, // Return standard center stats
				},
			};
		},
	);

// ============================================
// Get Availability Stats for multiple dates
// ============================================

export const getDatesAvailability = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			districts: z.array(z.string()).optional(),
			venueId: z.string().optional(),
			facilityCode: z.string().optional(),
			priceType: z.enum(["Paid", "Free"]).optional(),
		}),
	)
	.handler(
		async ({ data: { districts, venueId, facilityCode, priceType } }) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const targetDistricts = districts?.includes("All")
				? undefined
				: districts;
			const targetVenueId = venueId === "All" ? undefined : venueId;
			const targetFacilityCode =
				facilityCode === "All" ? undefined : facilityCode;

			// Fetch all future sessions matching filters
			// We select only minimal fields for performance
			const sessions = await prisma.session.findMany({
				where: {
					date: { gte: today },
					AND: [
						targetDistricts
							? { venue: { districtCode: { in: targetDistricts } } }
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

				if (priceType && sPriceType !== priceType) continue;

				const dateStr = s.date.toISOString().split("T")[0];
				if (!dateStats[dateStr]) dateStats[dateStr] = { t: 0, a: 0 };

				dateStats[dateStr].t++;
				if (
					s.available &&
					!isSessionPassed(dateStr, normalizeTime(s.startTime))
				) {
					dateStats[dateStr].a++;
				}
			}

			return {
				success: true,
				data: dateStats,
			};
		},
	);

// ============================================
// Get Last Update Time
// ============================================

export const getLastUpdateTime = createServerFn({
	method: "GET",
}).handler(async () => {
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

	return {
		success: true,
		lastUpdate: lastJob?.completedAt || null,
	};
});
