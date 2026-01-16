/**
 * Cleanup Service
 *
 * Automated cleanup of expired and stale data with 5-step cleanup logic.
 */

import { prisma as db } from "@/db";
import { createLogger } from "@/lib/logger";
import type { CleanupConfig, CleanupStats } from "../types";

const logger = createLogger({ module: "cleanup-service" });

export class CleanupService {
	private config: CleanupConfig;

	constructor(config: CleanupConfig) {
		this.config = config;
	}

	/**
	 * Run full cleanup (called by cron job)
	 *
	 * @returns Cleanup statistics
	 */
	async runFullCleanup(): Promise<CleanupStats> {
		const startTime = Date.now();
		logger.info("Starting full cleanup job");

		const stats: CleanupStats = {
			expiredWatchersMarked: 0,
			expiredWatchersDeleted: 0,
			watchHitsDeleted: 0,
			staleBrowserSessionsDeleted: 0,
			orphanedSettingsDeleted: 0,
			totalDurationMs: 0,
		};

		try {
			// Step 1: Mark expired watchers (change status to EXPIRED)
			stats.expiredWatchersMarked = await this.markExpiredWatchers();

			// Step 2: Delete expired watchers past retention period
			stats.expiredWatchersDeleted = await this.deleteExpiredWatchers(
				this.config.expiredWatcherRetentionDays,
			);

			// Step 3: Delete old watch hits
			stats.watchHitsDeleted = await this.deleteOldWatchHits(
				this.config.watchHitRetentionDays,
			);

			// Step 4: Delete stale browser sessions (with cascading deletes)
			stats.staleBrowserSessionsDeleted = await this.deleteStaleBrowserSessions(
				this.config.staleSessionRetentionDays,
			);

			// Step 5: Delete orphaned settings
			stats.orphanedSettingsDeleted = await this.deleteOrphanedSettings();

			stats.totalDurationMs = Date.now() - startTime;

			logger.info(
				{
					...stats,
					duration: `${stats.totalDurationMs}ms`,
				},
				"Cleanup completed successfully",
			);

			return stats;
		} catch (error) {
			stats.totalDurationMs = Date.now() - startTime;
			logger.error({ error, stats }, "Cleanup failed");

			throw error;
		}
	}

	/**
	 * Mark expired watchers (change status to EXPIRED)
	 * Keep them for retention period before deletion
	 *
	 * @returns Number of watchers marked
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
	 * Delete expired watchers past retention period
	 *
	 * @param retentionDays - Retention period in days
	 * @returns Number of watchers deleted
	 */
	async deleteExpiredWatchers(retentionDays: number): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

		const result = await db.watcher.deleteMany({
			where: {
				status: "EXPIRED",
				expiresAt: { lte: cutoffDate },
			},
		});

		if (result.count > 0) {
			logger.info(
				{ count: result.count, retentionDays },
				"Deleted expired watchers past retention period",
			);
		}

		return result.count;
	}

	/**
	 * Delete old watch hits past retention period
	 *
	 * @param retentionDays - Retention period in days
	 * @returns Number of hits deleted
	 */
	async deleteOldWatchHits(retentionDays: number): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

		const result = await db.watchHit.deleteMany({
			where: {
				checkedAt: { lte: cutoffDate },
			},
		});

		if (result.count > 0) {
			logger.info(
				{ count: result.count, retentionDays },
				"Deleted old watch hits",
			);
		}

		return result.count;
	}

	/**
	 * Delete stale browser sessions (no activity in N days)
	 * Cascade deletes UserSettings, Watchers, WatchHits
	 *
	 * @param inactiveDays - Inactivity period in days
	 * @returns Number of sessions deleted
	 */
	async deleteStaleBrowserSessions(inactiveDays: number): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

		// Find browser sessions with no active watchers and no recent activity
		const staleSessions = await db.browserSession.findMany({
			where: {
				watchers: {
					none: {}, // No watchers associated
				},
				updatedAt: { lte: cutoffDate }, // No recent updates
			},
			select: { id: true },
		});

		if (staleSessions.length === 0) {
			logger.debug("No stale browser sessions found");
			return 0;
		}

		const sessionIds = staleSessions.map((s) => s.id);

		// Delete browser sessions (cascades to UserSettings, Watchers, WatchHits)
		const result = await db.browserSession.deleteMany({
			where: {
				id: { in: sessionIds },
			},
		});

		if (result.count > 0) {
			logger.info(
				{ count: result.count, inactiveDays },
				"Deleted stale browser sessions",
			);
		}

		return result.count;
	}

	/**
	 * Delete orphaned user settings (no corresponding watchers)
	 * This is a safety net - cascade delete should handle this
	 *
	 * @returns Number of settings deleted
	 */
	async deleteOrphanedSettings(): Promise<number> {
		// Delete settings where browserSession has no corresponding watchers
		const result = await db.userSettings.deleteMany({
			where: {
				browserSession: {
					watchers: {
						none: {},
					},
				},
			},
		});

		if (result.count > 0) {
			logger.info({ count: result.count }, "Deleted orphaned user settings");
		}

		return result.count;
	}
}
