import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PriceType } from "@/lib/booking/types";
import { withLogging } from "@/lib/logging";
import { createSuccessResponse } from "@/lib/server-utils/error-handler";
// ... imports
import {
	getCalendarStatsService,
	getPrecomputedStatsService,
} from "@/services/availability-stats.service";
import { getDatesAvailabilityService } from "@/services/booking.service";

/**
 * Get availability stats for the next 14 days
 */
export const getCalendarStats = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			data: z.object({
				districts: z.array(z.string()).optional(),
				venueId: z.string().optional(),
				facilityCode: z.string().optional(),
				priceType: z.enum(["Paid", "Free"]),
			}),
		}),
	)
	.handler(
		withLogging("getCalendarStats", async ({ data: { data: filters } }) => {
			// If we have filters, we need to calculate stats dynamically
			// Otherwise we can use the pre-computed stats
			const hasFilters =
				(filters.districts && filters.districts.length > 0) ||
				filters.venueId ||
				filters.facilityCode;

			if (hasFilters) {
				const data = await getDatesAvailabilityService(filters);
				return createSuccessResponse(data);
			}

			const data = await getCalendarStatsService(filters.priceType);
			return createSuccessResponse(data);
		}),
	);

/**
 * Get detailed stats for a specific date
 */
export const getDetailedStats = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			date: z.string(),
			priceType: z.enum(["Paid", "Free"]),
			facilityCode: z.string().optional(),
		}),
	)
	.handler(
		withLogging(
			"getDetailedStats",
			async ({ data: { date, priceType, facilityCode } }) => {
				const data = await getPrecomputedStatsService(
					date,
					priceType as PriceType,
					facilityCode,
				);
				return createSuccessResponse(data);
			},
		),
	);
