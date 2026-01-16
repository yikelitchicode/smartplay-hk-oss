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
	getDatesAvailabilityService,
	getLastUpdateTimeService,
	getMetadataService,
} from "@/services/booking.service";

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
		}),
	)
	.handler(
		withLogging("getBookingData", async ({ data: { date } }) => {
			try {
				const data = await getBookingDataService(date, {});
				return createSuccessResponse(data);
			} catch (_error) {
				return createErrorResponse(
					"Failed to fetch booking data",
					"FETCH_BOOKING_ERROR",
				);
			}
		}),
	);

// ============================================
// Get Availability Stats for multiple dates
// ============================================

export const getDatesAvailability = createServerFn({
	method: "GET",
})
	.inputValidator(z.object({}).optional())
	.handler(
		withLogging("getDatesAvailability", async () => {
			try {
				const data = await getDatesAvailabilityService({});
				return createSuccessResponse(data);
			} catch (_error) {
				return createErrorResponse(
					"Failed to fetch dates availability",
					"FETCH_AVAILABILITY_ERROR",
				);
			}
		}),
	);

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
