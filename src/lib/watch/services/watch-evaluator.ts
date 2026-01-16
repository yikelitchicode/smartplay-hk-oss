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

const logger = createLogger({ module: "watch-evaluator" });

export class WatchEvaluator {
	private notificationService: NotificationService;

	constructor(notificationService: NotificationService) {
		this.notificationService = notificationService;
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

		logger.info(
			{ sessionIds: sessionIds.length },
			"Evaluating watchers for sessions",
		);

		// Find all watchers for the given sessions
		const watchers = await db.watcher.findMany({
			where: {
				targetSessionId: { in: sessionIds },
				status: "ACTIVE",
				expiresAt: { gte: new Date() }, // Not expired
			},
			include: {
				targetSession: {
					select: {
						id: true,
						available: true,
					},
				},
			},
		});

		if (watchers.length === 0) {
			logger.debug("No active watchers found for sessions");
			return [];
		}

		logger.info({ watcherCount: watchers.length }, "Evaluating watchers");

		const results: WatchEvaluationResult[] = [];

		for (const watcher of watchers) {
			const result = await this.evaluateWatcher(watcher);
			if (result) {
				results.push(result);
			}
		}

		logger.info(
			{ evaluated: watchers.length, hits: results.length },
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
		const watcher = await db.watcher.findUnique({
			where: { id: watcherId },
			include: {
				targetSession: {
					select: {
						id: true,
						available: true,
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

		if (watcher.expiresAt < new Date()) {
			logger.debug({ watcherId }, "Watcher expired, skipping");
			return null;
		}

		return this.evaluateWatcher(watcher);
	}

	/**
	 * Evaluate all active watchers
	 *
	 * @returns Array of evaluation results
	 */
	async evaluateActiveWatchers(): Promise<WatchEvaluationResult[]> {
		logger.info("Evaluating all active watchers");

		// Find all active watchers that haven't expired
		const watchers = await db.watcher.findMany({
			where: {
				status: "ACTIVE",
				expiresAt: { gte: new Date() },
			},
			include: {
				targetSession: {
					select: {
						id: true,
						available: true,
					},
				},
			},
			orderBy: {
				createdAt: "asc",
			},
		});

		if (watchers.length === 0) {
			logger.debug("No active watchers to evaluate");
			return [];
		}

		logger.info(
			{ watcherCount: watchers.length },
			"Evaluating all active watchers",
		);

		const results: WatchEvaluationResult[] = [];

		for (const watcher of watchers) {
			const result = await this.evaluateWatcher(watcher);
			if (result) {
				results.push(result);
			}
		}

		logger.info(
			{ evaluated: watchers.length, hits: results.length },
			"Evaluation completed",
		);

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
			include: { targetSession: { select: { id: true; available: true } } };
		}>,
	): Promise<WatchEvaluationResult | null> {
		if (!watcher.targetSession) {
			logger.debug(
				{ watcherId: watcher.id },
				"Target session not found, skipping",
			);
			return null;
		}

		const currentState = watcher.targetSession.available;

		// Get the last hit to determine previous state
		const lastHit = await db.watchHit.findFirst({
			where: { watcherId: watcher.id },
			orderBy: { checkedAt: "desc" },
		});

		const previousState = lastHit !== null ? lastHit.available : !currentState; // Assume previous state was opposite

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
