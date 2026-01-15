/**
 * Checkpoint Pruner
 *
 * Scheduled maintenance service for cleaning up old checkpoint data.
 * Prevents database bloat and maintains system performance.
 */

import type { ICheckpointRepository } from "./repositories/interfaces";

/**
 * Checkpoint Pruner
 *
 * Manages cleanup of old scheduled crawl runs and failed checkpoints.
 */
export class CheckpointPruner {
	private checkpointRepo: ICheckpointRepository;
	private pruningInterval: NodeJS.Timeout | null = null;

	/**
	 * Create a new CheckpointPruner
	 *
	 * @param checkpointRepo Checkpoint repository implementation
	 */
	constructor(checkpointRepo: ICheckpointRepository) {
		this.checkpointRepo = checkpointRepo;
	}

	/**
	 * Prune old completed runs
	 *
	 * Deletes scheduled crawl runs that completed more than the specified number of days ago.
	 *
	 * @param olderThanDays Delete runs completed more than this many days ago (default: 30)
	 * @returns Number of runs deleted
	 */
	async pruneOldRuns(olderThanDays: number = 30): Promise<number> {
		const deletedCount = await this.checkpointRepo.deleteOldRuns(olderThanDays);
		return deletedCount;
	}

	/**
	 * Get pruning statistics
	 *
	 * Returns statistics about completed runs for monitoring.
	 *
	 * @returns Object with pruning statistics
	 */
	async getPruningStats(): Promise<{
		totalRuns: number;
		completedRuns: number;
		incompleteRuns: number;
		oldRunsCount: number;
	}> {
		// This would require additional repository methods
		// For now, return a basic implementation
		const staleRun = await this.checkpointRepo.getIncompleteRun(60);

		return {
			totalRuns: 0,
			completedRuns: 0,
			incompleteRuns: staleRun ? 1 : 0,
			oldRunsCount: 0,
		};
	}

	/**
	 * Start scheduled pruning
	 *
	 * Schedules weekly pruning of old checkpoint data.
	 * By default, runs every Sunday at 2 AM.
	 *
	 * @param dayOfWeek Day of week to run (0 = Sunday, 1 = Monday, etc.)
	 * @param hour Hour to run (0-23)
	 * @param olderThanDays Delete runs older than this many days
	 */
	startScheduledPruning(
		dayOfWeek: number = 0, // Sunday
		hour: number = 2, // 2 AM
		olderThanDays: number = 30,
	): void {
		if (this.pruningInterval) {
			console.warn("Pruning scheduler is already running");
			return;
		}

		const scheduleNextRun = async () => {
			const now = new Date();
			const nextRun = new Date();

			// Calculate days until next specified day of week
			const daysUntilNext = (dayOfWeek - now.getDay() + 7) % 7;
			nextRun.setDate(now.getDate() + daysUntilNext);
			nextRun.setHours(hour, 0, 0, 0);

			// If the time has already passed today, schedule for next week
			if (nextRun <= now) {
				nextRun.setDate(nextRun.getDate() + 7);
			}

			const delay = nextRun.getTime() - now.getTime();

			console.log(
				`[CheckpointPruner] Scheduled pruning for ${nextRun.toISOString()} (in ${Math.round(delay / (1000 * 60 * 60))} hours)`,
			);

			this.pruningInterval = setTimeout(async () => {
				try {
					const deleted = await this.pruneOldRuns(olderThanDays);
					console.log(
						`[CheckpointPruner] Pruned ${deleted} old checkpoint runs`,
					);
				} catch (error) {
					console.error("[CheckpointPruner] Pruning failed:", error);
				}

				// Schedule next run
				this.pruningInterval = null;
				scheduleNextRun();
			}, delay);
		};

		scheduleNextRun();
	}

	/**
	 * Stop scheduled pruning
	 */
	stopScheduledPruning(): void {
		if (this.pruningInterval) {
			clearTimeout(this.pruningInterval);
			this.pruningInterval = null;
			console.log("[CheckpointPruner] Scheduled pruning stopped");
		}
	}

	/**
	 * Manual pruning run
	 *
	 * Immediately runs pruning and returns results.
	 *
	 * @param olderThanDays Delete runs older than this many days
	 * @returns Pruning results
	 */
	async manualPrune(olderThanDays: number = 30): Promise<{
		deletedRuns: number;
		timestamp: Date;
	}> {
		console.log(
			`[CheckpointPruner] Manual pruning: deleting runs older than ${olderThanDays} days`,
		);

		const deletedRuns = await this.pruneOldRuns(olderThanDays);

		return {
			deletedRuns,
			timestamp: new Date(),
		};
	}
}

/**
 * Global checkpoint pruner instance
 */
let globalPruner: CheckpointPruner | null = null;

/**
 * Initialize and start scheduled checkpoint pruning
 *
 * @param checkpointRepo Checkpoint repository (uses Prisma if not provided)
 * @param dayOfWeek Day of week to run (0 = Sunday)
 * @param hour Hour to run (0-23)
 * @param olderThanDays Delete runs older than this many days
 */
export function initCheckpointPruning(
	checkpointRepo?: ICheckpointRepository,
	dayOfWeek: number = 0,
	hour: number = 2,
	olderThanDays: number = 30,
): void {
	if (globalPruner) {
		console.warn("Checkpoint pruner already initialized");
		return;
	}

	if (!checkpointRepo) {
		// Import Prisma repository dynamically to avoid circular dependencies
		const {
			PrismaRepositoryFactory,
		} = require("./repositories/prisma-repository");
		const factory = new PrismaRepositoryFactory();
		checkpointRepo = factory.getCheckpointRepository();
	}

	if (!checkpointRepo) {
		throw new Error("Failed to initialize checkpoint repository");
	}

	globalPruner = new CheckpointPruner(checkpointRepo);
	globalPruner.startScheduledPruning(dayOfWeek, hour, olderThanDays);
	console.log("[CheckpointPruner] Initialized with scheduled pruning");
}

/**
 * Stop scheduled checkpoint pruning
 */
export function stopCheckpointPruning(): void {
	if (globalPruner) {
		globalPruner.stopScheduledPruning();
		globalPruner = null;
	}
}

/**
 * Get the global pruner instance
 */
export function getCheckpointPruner(): CheckpointPruner | null {
	return globalPruner;
}
