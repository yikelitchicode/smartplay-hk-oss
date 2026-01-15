/**
 * Crawler server functions for TanStack Start
 * These functions provide the API endpoints for the crawler service
 */

import { createServerFn } from "@tanstack/react-start";
import { getScheduler, initScheduler } from "@/lib/crawler";
import "@/lib/server-init"; // Initialize scheduler on server start
import { z } from "zod";
import type { UIVenue } from "@/lib/crawler/schemas";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/lib/server-utils/error-handler";
import { dateSchema } from "@/lib/server-utils/validation";

// ============================================
// Manual Trigger
// ============================================

export const runCrawl = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			distCode: z.array(z.string()).optional(),
			faCode: z.array(z.string()).optional(),
			playDate: dateSchema.optional(),
		}),
	)
	.handler(async ({ data }) => {
		try {
			console.log("Manual crawl trigger with params:", data);

			const scheduler = initScheduler();
			const jobId = await scheduler.runNow(data);

			return createSuccessResponse({ jobId }, "Crawl job started successfully");
		} catch (error) {
			console.error("Error running crawl:", error);
			return createErrorResponse("Failed to start crawl job", "CRAWL_ERROR");
		}
	});

// ============================================
// Get Crawl History
// ============================================

export const getCrawlHistory = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			limit: z.number().min(1).max(100).optional(),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const scheduler = getScheduler();
			const orchestrator = scheduler.getOrchestrator();

			const history = await orchestrator.getCrawlHistory(data.limit ?? 10);

			return createSuccessResponse(history);
		} catch (error) {
			console.error("Error fetching crawl history:", error);
			return createErrorResponse(
				"Failed to fetch crawl history",
				"FETCH_HISTORY_ERROR",
			);
		}
	});

// ============================================
// Get Crawl Job Details
// ============================================

export const getCrawlJob = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			jobId: z.string().min(1),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const scheduler = getScheduler();
			const orchestrator = scheduler.getOrchestrator();

			const job = await orchestrator.getCrawlJob(data.jobId);

			if (!job) {
				return createErrorResponse("Job not found", "JOB_NOT_FOUND");
			}

			return createSuccessResponse(job);
		} catch (error) {
			console.error("Error fetching crawl job:", error);
			return createErrorResponse(
				"Failed to fetch crawl job",
				"FETCH_JOB_ERROR",
			);
		}
	});

// ============================================
// Get Available Sessions
// ============================================

export const getAvailableSessions = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			date: dateSchema,
			districtCode: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const scheduler = getScheduler();
			const orchestrator = scheduler.getOrchestrator();

			const sessions = await orchestrator.getAvailableSessions(
				data.date,
				data.districtCode,
			);

			return createSuccessResponse(sessions);
		} catch (error) {
			console.error("Error fetching available sessions:", error);
			return createErrorResponse(
				"Failed to fetch available sessions",
				"FETCH_SESSIONS_ERROR",
			);
		}
	});

// ============================================
// Get Available Venues (UI Optimized)
// ============================================

export const getAvailableVenues = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			date: dateSchema,
			districtCode: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const scheduler = getScheduler();
			const orchestrator = scheduler.getOrchestrator();

			const sessions = await orchestrator.getAvailableSessions(
				data.date,
				data.districtCode,
			);

			// Group sessions by venue for a cleaner UI structure
			const venuesMap = new Map<string | number, UIVenue>();

			for (const session of sessions) {
				const venue = session.venue;
				if (!venuesMap.has(venue.id)) {
					venuesMap.set(venue.id, {
						id: venue.id,
						name: venue.name,
						district: venue.districtName,
						districtCode: venue.districtCode,
						imageUrl: venue.imageUrl,
						facilities: [],
					});
				}

				const uiVenue = venuesMap.get(venue.id);
				if (!uiVenue) continue;

				// Group by facility type
				let facility = uiVenue.facilities.find(
					(f) => f.code === session.facilityCode,
				);
				if (!facility) {
					facility = {
						code: session.facilityCode,
						name: session.facilityTypeName,
						nameEn: session.facilityTypeNameEn,
						vrId: session.facilityVRId,
						sessions: [],
					};
					uiVenue.facilities.push(facility);
				}

				if (facility) {
					facility.sessions.push({
						id: session.id,
						startTime: session.startTime,
						endTime: session.endTime,
						available: session.available,
						isPeakHour: session.isPeakHour,
						timePeriod: session.timePeriod as
							| "MORNING"
							| "AFTERNOON"
							| "EVENING",
					});
				}
			}

			return createSuccessResponse(Array.from(venuesMap.values()));
		} catch (error) {
			console.error("Error fetching available venues:", error);
			return createErrorResponse(
				"Failed to fetch available venues",
				"FETCH_VENUES_ERROR",
			);
		}
	});

// ============================================
// Get Facility Statistics
// ============================================

export const getFacilityStats = createServerFn({
	method: "GET",
}).handler(async () => {
	try {
		const scheduler = getScheduler();
		const orchestrator = scheduler.getOrchestrator();

		const stats = await orchestrator.getFacilityStats();

		return createSuccessResponse(stats);
	} catch (error) {
		console.error("Error fetching facility stats:", error);
		return createErrorResponse(
			"Failed to fetch facility stats",
			"FETCH_STATS_ERROR",
		);
	}
});

// ============================================
// Get Scheduler Status
// ============================================

export const getSchedulerStatus = createServerFn({
	method: "GET",
}).handler(async () => {
	try {
		const scheduler = getScheduler();

		const data = {
			isActive: scheduler.isActive(),
			isCrawlRunning: scheduler.isCrawlRunning(),
		};

		return createSuccessResponse(data);
	} catch (error) {
		console.error("Error fetching scheduler status:", error);
		return createErrorResponse(
			"Failed to fetch scheduler status",
			"FETCH_STATUS_ERROR",
		);
	}
});

// ============================================
// Start/Stop Scheduler (Admin Functions)
// ============================================

export const startScheduler = createServerFn({
	method: "POST",
}).handler(async () => {
	try {
		const scheduler = initScheduler();

		if (scheduler.isActive()) {
			return createSuccessResponse(undefined, "Scheduler already running");
		}

		scheduler.start();

		return createSuccessResponse(undefined, "Scheduler started");
	} catch (error) {
		console.error("Error starting scheduler:", error);
		return createErrorResponse(
			"Failed to start scheduler",
			"START_SCHEDULER_ERROR",
		);
	}
});

export const stopScheduler = createServerFn({
	method: "POST",
}).handler(async () => {
	try {
		const scheduler = getScheduler();

		if (!scheduler.isActive()) {
			return createSuccessResponse(undefined, "Scheduler not running");
		}

		scheduler.stop();

		return createSuccessResponse(undefined, "Scheduler stopped");
	} catch (error) {
		console.error("Error stopping scheduler:", error);
		return createErrorResponse(
			"Failed to stop scheduler",
			"STOP_SCHEDULER_ERROR",
		);
	}
});
