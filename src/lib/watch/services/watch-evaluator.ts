/**
 * Watch Evaluator
 *
 * Evaluates watchers for availability changes and triggers notifications.
 */

import { prisma as db } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";
import type { WatchEvaluationResult } from "../types";
import type { NotificationService } from "./notification-service";
import type { RefreshStrategyResolver } from "./refresh-strategy-resolver";

const logger = createLogger({ module: "watch-evaluator" });

/**
 * Check if a session has already passed (end time is in the past)
 *
 * @param date - Session date
 * @param endTime - Session end time (HH:MM format)
 * @param now - Current reference time (default: Date.now())
 * @returns true if session has passed
 */
function hasSessionPassed(
	date: Date,
	endTime: string,
	now: Date = new Date(),
): boolean {
	// Parse end time and combine with date
	const [hours, minutes] = endTime.split(":").map(Number);
	const sessionEndTime = new Date(date);
	sessionEndTime.setHours(hours, minutes, 0, 0);

	return sessionEndTime < now;
}

export class WatchEvaluator {
	private notificationService: NotificationService;
	private strategyResolver: RefreshStrategyResolver;

	constructor(
		notificationService: NotificationService,
		strategyResolver: RefreshStrategyResolver,
	) {
		this.notificationService = notificationService;
		this.strategyResolver = strategyResolver;
	}

	/**
	 * Evaluate watchers for specific session IDs
	 * Called by crawler after data refresh
	 *
	 * @param sessionIds - Session IDs to evaluate
	 * @returns Array of evaluation results
	 */
	async evaluateWatchers(
		sessionIds: string[],
	): Promise<WatchEvaluationResult[]> {
		if (sessionIds.length === 0) {
			return [];
		}

		const now = new Date();
		logger.info(
			{ sessionIds: sessionIds.length },
			"Evaluating watchers for sessions",
		);

		// Find all watchers for the given sessions with session date/time info
		const watchers = await db.watcher.findMany({
			where: {
				targetSessionId: { in: sessionIds },
				status: "ACTIVE",
				expiresAt: { gte: now }, // Not expired
			},
			include: {
				targetSession: {
					select: {
						id: true,
						available: true,
						date: true,
						startTime: true,
						endTime: true,
					},
				},
			},
		});

		if (watchers.length === 0) {
			logger.debug("No active watchers found for sessions");
			return [];
		}

		// Filter out watchers for sessions that have already passed
		const validWatchers = watchers.filter((watcher) => {
			if (!watcher.targetSession) return false;

			const sessionPassed = hasSessionPassed(
				watcher.targetSession.date,
				watcher.targetSession.endTime,
				now,
			);

			if (sessionPassed) {
				logger.debug(
					{
						watcherId: watcher.id,
						sessionId: watcher.targetSession.id,
						sessionDate: watcher.targetSession.date,
						sessionEndTime: watcher.targetSession.endTime,
					},
					"Session already passed, skipping watcher",
				);
				return false;
			}

			return true;
		});

		if (validWatchers.length === 0) {
			logger.debug("No valid watchers found (all sessions passed)");
			return [];
		}

		logger.info(
			{
				watcherCount: validWatchers.length,
				totalBeforeFilter: watchers.length,
			},
			"Evaluating watchers",
		);

		const results: WatchEvaluationResult[] = [];

		for (const watcher of validWatchers) {
			// For forced evaluation (by session ID), we skip strategy check but still update timestamp
			const result = await this.evaluateWatcher(watcher);
			if (result) {
				results.push(result);
			}
		}

		logger.info(
			{ evaluated: validWatchers.length, hits: results.length },
			"Evaluation completed",
		);

		return results;
	}

	/**
	 * Evaluate a single watcher
	 *
	 * @param watcherId - Watcher ID
	 * @returns Evaluation result or null if no change
	 */
	async evaluateWatcherById(
		watcherId: string,
	): Promise<WatchEvaluationResult | null> {
		const now = new Date();
		const watcher = await db.watcher.findUnique({
			where: { id: watcherId },
			include: {
				targetSession: {
					select: {
						id: true,
						available: true,
						date: true,
						startTime: true,
						endTime: true,
					},
				},
			},
		});

		if (!watcher) {
			logger.warn({ watcherId }, "Watcher not found");
			return null;
		}

		if (watcher.status !== "ACTIVE") {
			logger.debug(
				{ watcherId, status: watcher.status },
				"Watcher not active, skipping",
			);
			return null;
		}

		if (watcher.expiresAt < now) {
			logger.debug({ watcherId }, "Watcher expired, skipping");
			return null;
		}

		// Check if session has already passed
		if (watcher.targetSession) {
			const sessionPassed = hasSessionPassed(
				watcher.targetSession.date,
				watcher.targetSession.endTime,
				now,
			);

			if (sessionPassed) {
				logger.debug(
					{
						watcherId,
						sessionId: watcher.targetSession.id,
						sessionDate: watcher.targetSession.date,
						sessionEndTime: watcher.targetSession.endTime,
					},
					"Session already passed, skipping watcher",
				);
				return null;
			}
		}

		return this.evaluateWatcher(watcher);
	}

	/**
	 * Evaluate all active watchers based on refresh strategy
	 * Uses session-grouped evaluation for efficiency when multiple users watch the same session
	 *
	 * @returns Array of evaluation results
	 */
	async evaluateActiveWatchers(): Promise<WatchEvaluationResult[]> {
		const now = new Date();
		logger.info("Checking for watchers due for evaluation");

		// Find all active watchers that haven't expired
		const allWatchers = await db.watcher.findMany({
			where: {
				status: "ACTIVE",
				expiresAt: { gte: now },
			},
			include: {
				targetSession: {
					select: {
						id: true,
						available: true,
						date: true,
						startTime: true,
						endTime: true,
					},
				},
			},
			orderBy: {
				updatedAt: "asc", // Process oldest updates first
			},
		});

		if (allWatchers.length === 0) {
			logger.debug("No active watchers found");
			return [];
		}

		// Filter out watchers for sessions that have already passed
		const validWatchers = allWatchers.filter((watcher) => {
			if (!watcher.targetSession) return false;

			const sessionPassed = hasSessionPassed(
				watcher.targetSession.date,
				watcher.targetSession.endTime,
				now,
			);

			if (sessionPassed) {
				logger.debug(
					{
						watcherId: watcher.id,
						sessionId: watcher.targetSession.id,
						sessionDate: watcher.targetSession.date,
						sessionEndTime: watcher.targetSession.endTime,
					},
					"Session already passed, skipping watcher",
				);
				return false;
			}

			return true;
		});

		if (validWatchers.length === 0) {
			logger.debug("No valid watchers found (all sessions passed)");
			return [];
		}

		// Filter watchers that are due for evaluation based on their tier
		const dueWatchers = validWatchers.filter((watcher) =>
			this.strategyResolver.isDueForEvaluation(watcher, now),
		);

		if (dueWatchers.length === 0) {
			logger.debug("No watchers due for evaluation at this time");
			return [];
		}

		// Group by tier for logging
		const tiers = this.strategyResolver.groupWatchersByTier(
			dueWatchers.map((w) => ({ id: w.id, date: w.date })),
		);

		// Group watchers by targetSessionId for efficient evaluation
		const watchersBySession = new Map<string, typeof dueWatchers>();

		for (const watcher of dueWatchers) {
			if (!watcher.targetSession) continue;

			const sessionId = watcher.targetSession.id;
			if (!watchersBySession.has(sessionId)) {
				watchersBySession.set(sessionId, []);
			}
			watchersBySession.get(sessionId)?.push(watcher);
		}

		logger.info(
			{
				dueCount: dueWatchers.length,
				totalCount: allWatchers.length,
				uniqueSessions: watchersBySession.size,
				breakdown: {
					ACTIVE: tiers.ACTIVE.length,
					PENDING: tiers.PENDING.length,
					DORMANT: tiers.DORMANT.length,
				},
			},
			"Evaluating due watchers (session-grouped)",
		);

		const results: WatchEvaluationResult[] = [];

		// Evaluate each session once, then process all watchers for that session
		for (const [sessionId, sessionWatchers] of watchersBySession) {
			const sessionResults = await this.evaluateSessionWatchers(
				sessionId,
				sessionWatchers,
				now,
			);
			results.push(...sessionResults);
		}

		logger.info(
			{
				evaluated: dueWatchers.length,
				sessions: watchersBySession.size,
				hits: results.length,
			},
			"Evaluation completed",
		);

		return results;
	}

	/**
	 * Evaluate all watchers for a single session (batch operation)
	 * This is more efficient when multiple users watch the same session
	 *
	 * @param sessionId - The session ID being watched
	 * @param watchers - All watchers for this session
	 * @param now - Current timestamp
	 * @returns Array of evaluation results for watchers with availability changes
	 */
	private async evaluateSessionWatchers(
		sessionId: string,
		watchers: Prisma.WatcherGetPayload<{
			include: {
				targetSession: {
					select: {
						id: true;
						available: true;
						date: true;
						startTime: true;
						endTime: true;
					};
				};
			};
		}>[],
		now: Date,
	): Promise<WatchEvaluationResult[]> {
		if (watchers.length === 0) return [];

		// All watchers have the same target session, get current state from first one
		const currentState = watchers[0].targetSession?.available ?? false;

		logger.info(
			{
				sessionId,
				watcherCount: watchers.length,
				currentAvailability: currentState,
			},
			"Evaluating session for multiple watchers",
		);

		// Batch update all watcher timestamps (acts as lastEvaluatedAt)
		const watcherIds = watchers.map((w) => w.id);
		await db.watcher.updateMany({
			where: { id: { in: watcherIds } },
			data: { updatedAt: now },
		});

		// Get the last hit for each watcher to determine previous state
		// We need to check each watcher individually since they might have different histories
		const lastHits = await db.watchHit.findMany({
			where: { watcherId: { in: watcherIds } },
			orderBy: { checkedAt: "desc" },
			distinct: ["watcherId"],
		});

		const lastHitByWatcher = new Map(
			lastHits.map((hit) => [hit.watcherId, hit]),
		);

		// Determine which watchers have availability changes
		const watchersWithChanges: {
			watcher: (typeof watchers)[0];
			previousState: boolean;
			becameAvailable: boolean;
		}[] = [];

		for (const watcher of watchers) {
			const lastHit = lastHitByWatcher.get(watcher.id);
			const previousState =
				lastHit !== null && lastHit !== undefined
					? lastHit.available
					: !currentState; // Assume previous state was opposite if no history

			if (currentState !== previousState) {
				watchersWithChanges.push({
					watcher,
					previousState,
					becameAvailable: currentState === true && previousState === false,
				});
			}
		}

		if (watchersWithChanges.length === 0) {
			logger.debug(
				{ sessionId, watcherCount: watchers.length },
				"No availability changes for session watchers",
			);
			return [];
		}

		logger.info(
			{
				sessionId,
				totalWatchers: watchers.length,
				watchersWithChanges: watchersWithChanges.length,
				currentState,
			},
			"Availability change detected for session",
		);

		// Batch create WatchHit records
		const hitData = watchersWithChanges.map(({ watcher, becameAvailable }) => ({
			watcherId: watcher.id,
			becameAvailable,
			available: currentState,
			checkedAt: now,
		}));

		await db.watchHit.createMany({ data: hitData });

		// Get created hits for notification status updates
		const createdHits = await db.watchHit.findMany({
			where: {
				watcherId: { in: watchersWithChanges.map((w) => w.watcher.id) },
				checkedAt: now,
			},
		});

		const hitByWatcher = new Map(
			createdHits.map((hit) => [hit.watcherId, hit]),
		);

		// Batch update watcher statistics
		await db.watcher.updateMany({
			where: { id: { in: watchersWithChanges.map((w) => w.watcher.id) } },
			data: {
				lastHitAt: now,
			},
		});

		// Increment totalHits individually (updateMany doesn't support increment)
		for (const { watcher } of watchersWithChanges) {
			await db.watcher.update({
				where: { id: watcher.id },
				data: { totalHits: { increment: 1 } },
			});
		}

		// Build results and send notifications
		const results: WatchEvaluationResult[] = [];

		for (const {
			watcher,
			previousState,
			becameAvailable,
		} of watchersWithChanges) {
			const result: WatchEvaluationResult = {
				watcherId: watcher.id,
				sessionId,
				previousState,
				currentState,
				becameAvailable,
			};

			results.push(result);

			// Send notification
			const hit = hitByWatcher.get(watcher.id);
			if (hit) {
				try {
					const notificationSent =
						await this.notificationService.sendNotification(
							watcher.id,
							result,
							watcher.browserSessionId,
						);

					if (notificationSent) {
						await db.watchHit.update({
							where: { id: hit.id },
							data: { notificationSent: true },
						});
					}
				} catch (error) {
					logger.error(
						{ watcherId: watcher.id, error },
						"Failed to send notification",
					);

					await db.watchHit.update({
						where: { id: hit.id },
						data: {
							notificationError:
								error instanceof Error ? error.message : "Unknown error",
						},
					});
				}
			}
		}

		return results;
	}

	/**
	 * Evaluate a single watcher for availability changes
	 *
	 * @param watcher - Watcher with target session
	 * @returns Evaluation result or null if no change
	 */
	private async evaluateWatcher(
		watcher: Prisma.WatcherGetPayload<{
			include: {
				targetSession: {
					select: {
						id: true;
						available: true;
						date: true;
						startTime: true;
						endTime: true;
					};
				};
			};
		}>,
	): Promise<WatchEvaluationResult | null> {
		if (!watcher.targetSession) {
			logger.debug(
				{ watcherId: watcher.id },
				"Target session not found, skipping",
			);
			return null;
		}

		logger.info(
			{
				watcherId: watcher.id,
				targetSessionId: watcher.targetSession.id,
			},
			"Checking session availability for watcher",
		);

		const currentState = watcher.targetSession.available;

		// Get the last hit to determine previous state
		const lastHit = await db.watchHit.findFirst({
			where: { watcherId: watcher.id },
			orderBy: { checkedAt: "desc" },
		});

		const previousState = lastHit !== null ? lastHit.available : !currentState; // Assume previous state was opposite

		// Update watcher timestamp (acts as lastEvaluatedAt)
		// If hit found, totalHits and lastHitAt will also be updated in separate call
		await db.watcher.update({
			where: { id: watcher.id },
			data: { updatedAt: new Date() },
		});

		// Check if state changed
		if (currentState === previousState) {
			return null; // No change
		}

		const becameAvailable = currentState === true && previousState === false;

		logger.info(
			{
				watcherId: watcher.id,
				previousState,
				currentState,
				becameAvailable,
			},
			"Availability change detected",
		);

		// Create watch hit record
		const hit = await db.watchHit.create({
			data: {
				watcherId: watcher.id,
				becameAvailable,
				available: currentState,
				checkedAt: new Date(),
			},
		});

		// Update watcher statistics
		await db.watcher.update({
			where: { id: watcher.id },
			data: {
				totalHits: { increment: 1 },
				lastHitAt: new Date(),
			},
		});

		const result: WatchEvaluationResult = {
			watcherId: watcher.id,
			sessionId: watcher.targetSession.id,
			previousState,
			currentState,
			becameAvailable,
		};

		// Send notification if configured
		try {
			const notificationSent = await this.notificationService.sendNotification(
				watcher.id,
				result,
				watcher.browserSessionId,
			);

			if (notificationSent) {
				// Update hit record with notification status
				await db.watchHit.update({
					where: { id: hit.id },
					data: { notificationSent: true },
				});
			}
		} catch (error) {
			logger.error(
				{ watcherId: watcher.id, error },
				"Failed to send notification",
			);

			// Update hit record with error
			await db.watchHit.update({
				where: { id: hit.id },
				data: {
					notificationError:
						error instanceof Error ? error.message : "Unknown error",
				},
			});
		}

		return result;
	}
}
