import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withLogging } from "@/lib/logging";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/lib/server-utils/error-handler";
import { dateSchema } from "@/lib/server-utils/validation";
import {
	getAvailableDatesService,
	getBookingDataService,
	getLastUpdateTimeService,
	getMetadataService,
} from "@/services/booking.service";
import { checkSessionAvailabilityService } from "@/services/check-availability.service";

// ============================================
// Get Available Dates
// ============================================

export const getAvailableDates = createServerFn({
	method: "GET",
}).handler(
	withLogging("getAvailableDates", async () => {
		try {
			const data = await getAvailableDatesService();
			return createSuccessResponse(data);
		} catch (_error) {
			return createErrorResponse(
				"Failed to fetch available dates",
				"FETCH_DATES_ERROR",
			);
		}
	}),
);

// ============================================
// Get Booking Data for a Date
// ============================================

export const getBookingData = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			date: dateSchema,
			filters: z
				.object({
					districts: z.array(z.string()).optional(),
					venueId: z.string().optional(),
					facilityCode: z.string().optional(),
					priceType: z.enum(["Free", "Paid"] as const).optional(),
					query: z.string().max(100).optional(),
				})
				.optional(),
			page: z.number().optional(),
			pageSize: z.number().optional(),
		}),
	)
	.handler(
		withLogging(
			"getBookingData",
			async ({ data: { date, filters, page, pageSize } }) => {
				try {
					const data = await getBookingDataService(
						date,
						filters,
						page,
						pageSize,
					);
					return createSuccessResponse(data);
				} catch (_error) {
					return createErrorResponse(
						"Failed to fetch booking data",
						"FETCH_BOOKING_ERROR",
					);
				}
			},
		),
	);

// ============================================
// Get Availability Stats for multiple dates
// ============================================

// getDatesAvailability is deprecated and removed in favor of /stats endpoints

// ============================================
// Get Last Update Time
// ============================================

export const getLastUpdateTime = createServerFn({
	method: "GET",
}).handler(
	withLogging("getLastUpdateTime", async () => {
		try {
			const lastUpdate = await getLastUpdateTimeService();
			return createSuccessResponse({ lastUpdate });
		} catch (_error) {
			return createErrorResponse(
				"Failed to fetch last update time",
				"FETCH_LAST_UPDATE_ERROR",
			);
		}
	}),
);

// ============================================
// Get Metadata (Districts, FacilityTypes)
// ============================================

export const getMetadata = createServerFn({
	method: "GET",
}).handler(
	withLogging("getMetadata", async () => {
		try {
			const data = await getMetadataService();
			return createSuccessResponse(data);
		} catch (_error) {
			return createErrorResponse(
				"Failed to fetch metadata",
				"FETCH_METADATA_ERROR",
			);
		}
	}),
);

// ============================================
// Check Real-time Session Availability
// ============================================

export const checkSessionAvailability = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			venueId: z.string(),
			facilityCode: z.string(),
			date: dateSchema,
			startTime: z.string(),
			endTime: z.string(),
		}),
	)
	.handler(
		withLogging("checkSessionAvailability", async ({ data }) => {
			try {
				const result = await checkSessionAvailabilityService(data);
				return createSuccessResponse(result);
			} catch (error) {
				return createErrorResponse(
					error instanceof Error
						? error.message
						: "Failed to check availability",
					"CHECK_AVAILABILITY_ERROR",
				);
			}
		}),
	);
