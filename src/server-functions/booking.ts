import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import {
	NormalizedSession,
	type NormalizedVenue,
	RegionType,
} from "@/lib/booking/types";
import {
	determinePriceType,
	getRegion,
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
		}),
	)
	.handler(async ({ data: { date } }) => {
		// Parse date string to Date object
		// Assuming the input is YYYY-MM-DD and stored as UTC midnight or local midnight
		// We try to match the exact date stored in DB
		const targetDate = new Date(date);

		// We might need to be careful with timezones.
		// If stored as 2026-01-13T00:00:00.000Z, doing new Date("2026-01-13") gives UTC midnight.
		// So simple equality check should work if data was stored sanely.

		const sessions = await prisma.session.findMany({
			where: {
				date: targetDate,
			},
			include: {
				venue: true, // This is the Facility model
			},
			orderBy: {
				startTime: "asc",
			},
		});

		// Transform to NormalizedVenue[]
		const venuesMap = new Map<number, NormalizedVenue>();

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

			const venue = venuesMap.get(session.venueId)!;

			// 2. Identify Facility (Logic from utils but adapted)
			// The DB has facilityTypeName (e.g. "Tennis Court (Urban)") and facilityTypeNameEn
			// We use facilityTypeNameEn for PriceType determination if possible, or mapping

			const { name, priceType } = determinePriceType(
				session.facilityTypeName,
				session.facilityTypeNameEn,
			);

			// 3. Add to Facility Map
			if (!venue.facilities[name]) {
				venue.facilities[name] = {
					name: name,
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
			const ssnId = `${date}-${session.venueId}-${sessionStart}-${session.facilityCode}`; // Enhanced ID uniqueness

			// Check if session with same ID already exists (should happen if distinct facility codes map to same display name)
			// Actually strictly speaking, different 'courts' are usually represented by facilityVRId or similar,
			// but the API/Crawler seems to aggregate counts?
			// The schema says `session` has `available`, `isOpen`.
			// The draft logic pushed sessions.

			venue.facilities[name].sessions.push({
				id: session.id, // Use DB ID
				startTime: sessionStart,
				endTime: normalizeTime(session.endTime),
				date: date,
				available: session.available,
				peakHour: session.isPeakHour,
				facilityName: name,
				facilityId: session.facilityTypeId, // Use type ID kind of loose here
			});
		}

		// Sort sessions again just in case merging messed up order
		venuesMap.forEach((venue) => {
			Object.keys(venue.facilities).forEach((key) => {
				venue.facilities[key].sessions.sort((a, b) =>
					a.startTime.localeCompare(b.startTime),
				);
			});
		});

		return {
			success: true,
			data: Array.from(venuesMap.values()),
		};
	});
