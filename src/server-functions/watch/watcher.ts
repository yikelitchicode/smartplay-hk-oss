/**
 * Watcher Server Functions
 *
 * TanStack Start server functions for watch management.
 * Provides API endpoints for creating, listing, and updating watchers.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma as db } from "@/db";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/lib/server-utils/error-handler";
import { loadConfig } from "@/lib/watch/config";
import { NotificationService } from "@/lib/watch/services/notification-service";
import { TurnstileVerifier } from "@/lib/watch/services/turnstile-verifier";
import { WatchEvaluator } from "@/lib/watch/services/watch-evaluator";
import { WatchManager } from "@/lib/watch/services/watch-manager";

// ============================================
// Initialize Services
// ============================================

const watchConfig = loadConfig();
const turnstileVerifier = new TurnstileVerifier(watchConfig.turnstile);
const watchManager = new WatchManager(turnstileVerifier);
const notificationService = new NotificationService({
	notifications: watchConfig.notifications,
	webhook: watchConfig.webhook,
});
// Watch evaluator not used in server functions but initialized for future use
const watchEvaluator = new WatchEvaluator(notificationService);
void watchEvaluator;

// ============================================
// Browser Session Management
// ============================================

/**
 * Get or create browser session from HTTP request
 */
async function getOrCreateBrowserSessionId(): Promise<string> {
	// In a real implementation, this would read from HTTP-only cookie
	// For now, create a new session each time
	const session = await db.browserSession.create({
		data: {
			expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
		},
	});

	return session.id;
}

// ============================================
// Create Watcher
// ============================================

export const createWatcher = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			targetSessionId: z.string().min(1),
			turnstileToken: z.string().min(1),
		}),
	)
	.handler(async ({ data }) => {
		try {
			// Fetch facility session details
			const targetSession = await db.session.findUnique({
				where: { id: data.targetSessionId },
			});

			if (!targetSession) {
				return createErrorResponse("Session not found", "SESSION_NOT_FOUND");
			}

			// Get or create browser session
			const browserSessionId = await getOrCreateBrowserSessionId();

			// Create watcher with criteria
			const watcher = await watchManager.createWatcher({
				browserSessionId,
				turnstileToken: data.turnstileToken,
				criteria: {
					targetSessionId: targetSession.id,
					venueId: targetSession.venueId,
					facilityCode: targetSession.facilityCode,
					date: targetSession.date,
					startTime: targetSession.startTime,
					endTime: targetSession.endTime,
				},
			});

			return createSuccessResponse(
				{ watcherId: watcher.id },
				"Watcher created successfully",
			);
		} catch (error) {
			console.error("Error creating watcher:", error);
			return createErrorResponse(
				error instanceof Error ? error.message : "Failed to create watcher",
				"CREATE_WATCHER_ERROR",
			);
		}
	});

// ============================================
// Get Watchers
// ============================================

export const getWatchers = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			status: z.enum(["ACTIVE", "PAUSED", "EXPIRED", "DELETED"]).optional(),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const browserSessionId = await getOrCreateBrowserSessionId();

			const watchers = await watchManager.getWatchers(
				browserSessionId,
				data.status,
			);

			return createSuccessResponse(watchers);
		} catch (error) {
			console.error("Error fetching watchers:", error);
			return createErrorResponse(
				"Failed to fetch watchers",
				"FETCH_WATCHERS_ERROR",
			);
		}
	});

// ============================================
// Update Watcher (Pause/Resume/Delete)
// ============================================

export const updateWatcher = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			watcherId: z.string().min(1),
			action: z.enum(["pause", "resume", "delete"]),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const browserSessionId = await getOrCreateBrowserSessionId();

			switch (data.action) {
				case "pause": {
					const watcher = await watchManager.pauseWatcher(
						data.watcherId,
						browserSessionId,
					);
					return createSuccessResponse(watcher, "Watcher paused successfully");
				}
				case "resume": {
					const watcher = await watchManager.resumeWatcher(
						data.watcherId,
						browserSessionId,
					);
					return createSuccessResponse(watcher, "Watcher resumed successfully");
				}
				case "delete": {
					await watchManager.deleteWatcher(data.watcherId, browserSessionId);
					return createSuccessResponse(null, "Watcher deleted successfully");
				}
			}
		} catch (error) {
			console.error("Error updating watcher:", error);
			return createErrorResponse(
				error instanceof Error ? error.message : "Failed to update watcher",
				"UPDATE_WATCHER_ERROR",
			);
		}
	});

// ============================================
// Get Watcher Hits
// ============================================

export const getWatcherHits = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			watcherId: z.string().min(1),
			limit: z.number().min(1).max(100).optional().default(50),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const browserSessionId = await getOrCreateBrowserSessionId();

			// Verify watcher ownership
			const watcher = await db.watcher.findUnique({
				where: { id: data.watcherId },
			});

			if (!watcher) {
				return createErrorResponse("Watcher not found", "WATCHER_NOT_FOUND");
			}

			if (watcher.browserSessionId !== browserSessionId) {
				return createErrorResponse("Access denied", "ACCESS_DENIED");
			}

			// Fetch hits with pagination
			const hits = await db.watchHit.findMany({
				where: { watcherId: data.watcherId },
				orderBy: { checkedAt: "desc" },
				take: data.limit,
			});

			return createSuccessResponse(hits);
		} catch (error) {
			console.error("Error fetching watcher hits:", error);
			return createErrorResponse(
				"Failed to fetch watcher hits",
				"FETCH_HITS_ERROR",
			);
		}
	});
