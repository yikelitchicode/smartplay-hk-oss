/**
 * Watch Manager
 *
 * CRUD operations for session watchers with Turnstile verification.
 */

import { prisma as db } from "@/db";
import type { Prisma, Watcher } from "@/generated/prisma/client";
import type { WatchStatus } from "@/generated/prisma/enums";
import { createLogger } from "@/lib/logger";
import type { WatchCriteria } from "../types";
import type { TurnstileVerifier } from "./turnstile-verifier";

const logger = createLogger({ module: "watch-manager" });

export class WatchManager {
	private turnstileVerifier: TurnstileVerifier;

	constructor(turnstileVerifier: TurnstileVerifier) {
		this.turnstileVerifier = turnstileVerifier;
	}

	/**
	 * Create new watcher with Turnstile verification
	 *
	 * @param options - Watcher creation options
	 * @returns Created watcher record
	 */
	async createWatcher(options: {
		browserSessionId: string;
		turnstileToken: string;
		criteria: WatchCriteria;
	}): Promise<Watcher> {
		const { browserSessionId, turnstileToken, criteria } = options;

		// Verify Turnstile token
		const verification =
			await this.turnstileVerifier.verifyToken(turnstileToken);

		if (!verification.valid) {
			logger.warn(
				{ error: verification.error, score: verification.score },
				"Turnstile verification failed for watcher creation",
			);
			throw new Error(`Turnstile verification failed: ${verification.error}`);
		}

		// Calculate expiry date (end of the watch date)
		const expiresAt = new Date(criteria.date);
		expiresAt.setHours(23, 59, 59, 999);

		// Create watcher with denormalized criteria
		const watcher = await db.watcher.create({
			data: {
				browserSessionId,
				targetSessionId: criteria.targetSessionId,
				venueId: criteria.venueId,
				facilityCode: criteria.facilityCode,
				date: criteria.date,
				startTime: criteria.startTime,
				endTime: criteria.endTime,
				expiresAt,
				status: "ACTIVE",
			},
		});

		logger.info(
			{ watcherId: watcher.id, browserSessionId },
			"Watcher created successfully",
		);

		return watcher;
	}

	/**
	 * Get all watchers for a browser session
	 *
	 * @param browserSessionId - Browser session ID
	 * @param status - Optional status filter
	 * @returns Array of watchers
	 */
	async getWatchers(
		browserSessionId: string,
		status?: WatchStatus,
	): Promise<
		Prisma.WatcherGetPayload<{
			include: {
				targetSession: {
					select: {
						available: true;
						facilityTypeName: true;
						venue: { select: { name: true } };
					};
				};
			};
		}>[]
	> {
		const where: Prisma.WatcherWhereInput = {
			browserSessionId,
		};

		if (status) {
			where.status = status;
		}

		const watchers = await db.watcher.findMany({
			where,
			include: {
				targetSession: {
					select: {
						available: true,
						facilityTypeName: true,
						venue: {
							select: {
								name: true,
							},
						},
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return watchers;
	}

	/**
	 * Pause watcher (stop notifications but keep watcher)
	 *
	 * @param watcherId - Watcher ID
	 * @param browserSessionId - Browser session ID for ownership verification
	 * @returns Updated watcher
	 */
	async pauseWatcher(
		watcherId: string,
		browserSessionId: string,
	): Promise<Watcher> {
		// Verify ownership
		await this.verifyOwnership(watcherId, browserSessionId);

		const updated = await db.watcher.update({
			where: { id: watcherId },
			data: { status: "PAUSED" },
		});

		logger.info({ watcherId }, "Watcher paused");

		return updated;
	}

	/**
	 * Resume paused watcher
	 *
	 * @param watcherId - Watcher ID
	 * @param browserSessionId - Browser session ID for ownership verification
	 * @returns Updated watcher
	 */
	async resumeWatcher(
		watcherId: string,
		browserSessionId: string,
	): Promise<Watcher> {
		// Verify ownership
		const watcher = await this.verifyOwnership(watcherId, browserSessionId);

		// Check if watcher has expired
		if (watcher.expiresAt < new Date()) {
			await db.watcher.update({
				where: { id: watcherId },
				data: { status: "EXPIRED" },
			});
			throw new Error("Cannot resume expired watcher");
		}

		const updated = await db.watcher.update({
			where: { id: watcherId },
			data: { status: "ACTIVE" },
		});

		logger.info({ watcherId }, "Watcher resumed");

		return updated;
	}

	/**
	 * Delete watcher permanently
	 *
	 * @param watcherId - Watcher ID
	 * @param browserSessionId - Browser session ID for ownership verification
	 */
	async deleteWatcher(
		watcherId: string,
		browserSessionId: string,
	): Promise<void> {
		// Verify ownership
		await this.verifyOwnership(watcherId, browserSessionId);

		await db.watcher.update({
			where: { id: watcherId },
			data: { status: "DELETED" },
		});

		logger.info({ watcherId }, "Watcher marked as deleted");
	}

	/**
	 * Mark expired watchers (cleanup job - run daily)
	 *
	 * @returns Number of watchers marked as expired
	 */
	async markExpiredWatchers(): Promise<number> {
		const now = new Date();

		const result = await db.watcher.updateMany({
			where: {
				status: "ACTIVE",
				expiresAt: { lte: now }, // Expired date has passed
			},
			data: {
				status: "EXPIRED",
				updatedAt: now,
			},
		});

		if (result.count > 0) {
			logger.info({ count: result.count }, "Marked watchers as expired");
		}

		return result.count;
	}

	/**
	 * Verify watcher ownership
	 *
	 * @param watcherId - Watcher ID
	 * @param browserSessionId - Browser session ID
	 * @returns Watcher record
	 * @throws Error if not found or ownership mismatch
	 */
	private async verifyOwnership(
		watcherId: string,
		browserSessionId: string,
	): Promise<Watcher> {
		const watcher = await db.watcher.findUnique({
			where: { id: watcherId },
		});

		if (!watcher) {
			throw new Error("Watcher not found");
		}

		if (watcher.browserSessionId !== browserSessionId) {
			throw new Error("Access denied: watcher belongs to another session");
		}

		return watcher;
	}
}
