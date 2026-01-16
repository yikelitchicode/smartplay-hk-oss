/**
 * Watch Cleanup Scheduler
 *
 * Automated cleanup of expired and stale data.
 * Runs daily at 2 AM Hong Kong time by default.
 */

import type { ScheduledTask } from "node-cron";
import cron from "node-cron";
import { createLogger } from "@/lib/logger";
import { CleanupService } from "../services/cleanup-service";
import type { CleanupConfig } from "../types";

const logger = createLogger({ module: "watch-cleanup-scheduler" });

export class WatchCleanupScheduler {
	private task: ScheduledTask | null = null;
	private cleanupService: CleanupService;
	private config: CleanupConfig;

	constructor(config: CleanupConfig) {
		this.config = config;
		this.cleanupService = new CleanupService(config);
	}

	/**
	 * Start the cleanup scheduler
	 */
	start() {
		if (this.task) {
			logger.warn("Watch cleanup scheduler already running");
			return;
		}

		if (!this.config.enabled) {
			logger.info("Watch cleanup is disabled in config");
			return;
		}

		logger.info(
			`Starting watch cleanup scheduler with cron: ${this.config.interval}`,
		);

		this.task = cron.schedule(
			this.config.interval,
			async () => {
				logger.info(
					`\n🧹 [Watch Cleanup] Starting cleanup job at ${new Date().toISOString()}`,
				);
				await this.runCleanup();
			},
			{
				timezone: "Asia/Hong_Kong",
			},
		);

		logger.info("✅ [Watch Cleanup] Service started successfully");
	}

	/**
	 * Run cleanup job
	 */
	private async runCleanup() {
		const startTime = Date.now();

		try {
			const stats = await this.cleanupService.runFullCleanup();

			logger.info(
				`\n✅ [Watch Cleanup] Completed in ${stats.totalDurationMs}ms:
- Marked ${stats.expiredWatchersMarked} expired watchers
- Deleted ${stats.expiredWatchersDeleted} expired watchers (past retention)
- Deleted ${stats.watchHitsDeleted} old watch hits
- Deleted ${stats.staleBrowserSessionsDeleted} stale sessions
- Deleted ${stats.orphanedSettingsDeleted} orphaned settings`,
			);
		} catch (error) {
			logger.error({ error }, "❌ [Watch Cleanup] Failed");
		} finally {
			const duration = Date.now() - startTime;
			logger.info(`⏱️ [Watch Cleanup] Total duration: ${duration}ms`);
		}
	}

	/**
	 * Stop the cleanup scheduler
	 */
	stop() {
		if (this.task) {
			this.task.stop();
			this.task = null;
			logger.info("⏹️ Watch cleanup scheduler stopped");
		} else {
			logger.warn("Watch cleanup scheduler is not running");
		}
	}

	/**
	 * Check if scheduler is currently running
	 */
	isActive(): boolean {
		return this.task !== null;
	}

	/**
	 * Get cleanup service instance
	 */
	getCleanupService(): CleanupService {
		return this.cleanupService;
	}
}
