/**
 * Crawler server functions for TanStack Start
 * These functions provide the API endpoints for the crawler service
 */

import { createServerFn } from "@tanstack/react-start";
import { getScheduler, initScheduler } from "@/lib/crawler";
import "@/lib/server-init"; // Initialize scheduler on server start
import { z } from "zod";
import type { UIVenue } from "@/lib/crawler/schemas";

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
			playDate: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const scheduler = initScheduler();

		console.log("Manual crawl trigger with params:", data);

		const jobId = await scheduler.runNow(data);

		return {
			success: true,
			jobId,
			message: "Crawl job started successfully",
		};
	});

// ============================================
// Get Crawl History
// ============================================

export const getCrawlHistory = createServerFn({
	method: "GET",
})
	.inputValidator((data: { limit?: number }) => data)
	.handler(async ({ data }) => {
		const scheduler = getScheduler();
		const orchestrator = scheduler.getOrchestrator();

		const history = await orchestrator.getCrawlHistory(data.limit ?? 10);

		return {
			success: true,
			data: history,
		};
	});

// ============================================
// Get Crawl Job Details
// ============================================

export const getCrawlJob = createServerFn({
	method: "GET",
})
	.inputValidator((data: { jobId: string }) => data)
	.handler(async ({ data }) => {
		const scheduler = getScheduler();
		const orchestrator = scheduler.getOrchestrator();

		const job = await orchestrator.getCrawlJob(data.jobId);

		if (!job) {
			return {
				success: false,
				error: "Job not found",
			};
		}

		return {
			success: true,
			data: job,
		};
	});

// ============================================
// Get Available Sessions
// ============================================

export const getAvailableSessions = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			date: z.string(),
			districtCode: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const scheduler = getScheduler();
		const orchestrator = scheduler.getOrchestrator();

		const sessions = await orchestrator.getAvailableSessions(
			data.date,
			data.districtCode,
		);

		return {
			success: true,
			data: sessions,
		};
	});

// ============================================
// Get Available Venues (UI Optimized)
// ============================================

export const getAvailableVenues = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			date: z.string(),
			districtCode: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const scheduler = getScheduler();
		const orchestrator = scheduler.getOrchestrator();

		const sessions = await orchestrator.getAvailableSessions(
			data.date,
			data.districtCode,
		);

		// Group sessions by venue for a cleaner UI structure
		const venuesMap = new Map<number, UIVenue>();

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
				(f) => f.typeId === session.facilityTypeId,
			);
			if (!facility) {
				facility = {
					typeId: session.facilityTypeId,
					typeName: session.facilityTypeName,
					typeNameEn: session.facilityTypeNameEn,
					code: session.facilityCode,
					vrId: session.facilityVRId,
					sessions: [],
				};
				uiVenue.facilities.push(facility);
			}

			facility.sessions.push({
				id: session.id,
				startTime: session.startTime,
				endTime: session.endTime,
				available: session.available,
				isPeakHour: session.isPeakHour,
				timePeriod: session.timePeriod as "MORNING" | "AFTERNOON" | "EVENING",
			});
		}

		return {
			success: true,
			data: Array.from(venuesMap.values()),
		};
	});

// ============================================
// Get Facility Statistics
// ============================================

export const getFacilityStats = createServerFn({
	method: "GET",
}).handler(async () => {
	const scheduler = getScheduler();
	const orchestrator = scheduler.getOrchestrator();

	const stats = await orchestrator.getFacilityStats();

	return {
		success: true,
		data: stats,
	};
});

// ============================================
// Get Scheduler Status
// ============================================

export const getSchedulerStatus = createServerFn({
	method: "GET",
}).handler(async () => {
	const scheduler = getScheduler();

	return {
		success: true,
		data: {
			isActive: scheduler.isActive(),
			isCrawlRunning: scheduler.isCrawlRunning(),
		},
	};
});

// ============================================
// Start/Stop Scheduler (Admin Functions)
// ============================================

export const startScheduler = createServerFn({
	method: "POST",
}).handler(async () => {
	const scheduler = initScheduler();

	if (scheduler.isActive()) {
		return {
			success: true,
			message: "Scheduler already running",
		};
	}

	scheduler.start();

	return {
		success: true,
		message: "Scheduler started",
	};
});

export const stopScheduler = createServerFn({
	method: "POST",
}).handler(async () => {
	const scheduler = getScheduler();

	if (!scheduler.isActive()) {
		return {
			success: true,
			message: "Scheduler not running",
		};
	}

	scheduler.stop();

	return {
		success: true,
		message: "Scheduler stopped",
	};
});
