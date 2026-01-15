import { z } from "zod";

/**
 * Zod schemas for SmartPlay API responses
 * These match the structure found in live API responses
 */

export const sessionSchema = z.object({
	ssnStartTime: z.string(),
	ssnEndTime: z.string(),
	ssnStartDate: z.string(),
	available: z.boolean(),
	peakHour: z.boolean(),
	sfadFlag: z.boolean(),
	sessionCount: z.number(),
});

export const facilityTypeSchema = z.object({
	fatName: z.string(),
	enFatName: z.string(),
	fatId: z.number(),
	sessionCount: z.number(),
	faCode: z.string(),
	faGroupCode: z.string(),
	fvrId: z.union([z.number(), z.string()]),
	sessionList: z.array(sessionSchema),
	openFlag: z.boolean(),
	fitness: z.boolean(),
});

export const venueSchema = z.object({
	venueName: z.string(),
	venueId: z.union([z.number(), z.string()]),
	venueImageUrl: z.string(),
	sessionCount: z.number(),
	fatList: z.array(facilityTypeSchema),
});

export const districtSchema = z.object({
	distCode: z.string(),
	sessionCount: z.number(),
	distName: z.string(),
	venueList: z.array(venueSchema),
	seqNo: z.number().optional(),
});

export const timePeriodSchema = z.object({
	distList: z.array(districtSchema),
	venueCount: z.number().optional(),
	sessionCount: z.number().optional(),
});

export const facilityApiResponseSchema = z.object({
	code: z.string(),
	message: z.string(),
	data: z.object({
		morning: timePeriodSchema,
		afternoon: timePeriodSchema,
		evening: timePeriodSchema,
		venueCountList: z
			.array(
				z.object({
					playDate: z.string(),
					count: z.number(),
				}),
			)
			.optional(),
	}),
	timestamp: z
		.number()
		.optional()
		.default(() => Date.now()),
});

/**
 * Frontend Optimized Types
 * These are useful for tRPC or Server Functions to return a cleaner structure
 */

export const uiSessionSchema = z.object({
	id: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	available: z.boolean(),
	isPeakHour: z.boolean(),
	timePeriod: z.enum(["MORNING", "AFTERNOON", "EVENING"]),
});

export const uiVenueSchema = z.object({
	id: z.union([z.number(), z.string()]),
	name: z.string(),
	district: z.string(),
	districtCode: z.string(),
	imageUrl: z.string(),
	facilities: z.array(
		z.object({
			code: z.string(),
			name: z.string(),
			nameEn: z.string(),
			vrId: z.union([z.number(), z.string()]),
			sessions: z.array(uiSessionSchema),
		}),
	),
});

// Infer types from schemas
export type FacilityApiResponse = z.infer<typeof facilityApiResponseSchema>;
export type UISession = z.infer<typeof uiSessionSchema>;
export type UIVenue = z.infer<typeof uiVenueSchema>;

/**
 * Example usage with tRPC or TanStack Start
 *
 * .inputValidator(z.object({ date: z.string() }))
 * .handler(async ({ data }) => {
 *   // ... fetch from DB ...
 *   return result as UIVenue[];
 * })
 */
