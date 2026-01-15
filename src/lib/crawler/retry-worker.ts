/**
 * Retry Worker for Dead Letter Queue
 *
 * Scheduled worker that automatically retries failed facilities
 * when they become eligible for retry (nextRetryAt <= now).
 */

import { DLQStatus } from "@/generated/prisma/enums";
import { crawlerLogger } from "@/lib/logger";
import { DeadLetterQueue } from "./dead-letter-queue";
import type { CrawlerOrchestrator } from "./orchestrator";

/**
 * Retry Worker
 *
 * Periodically checks for retryable failures and attempts to re-crawl them.
 * Implements exponential backoff with jitter to prevent overwhelming the API.
 */
export class RetryWorker {
	private dlq: DeadLetterQueue;
	private orchestrator: CrawlerOrchestrator;
	private isRunning: boolean = false;
	private intervalId: NodeJS.Timeout | null = null;

	constructor(orchestrator: CrawlerOrchestrator) {
		this.dlq = new DeadLetterQueue();
		this.orchestrator = orchestrator;
	}

	/**
	 * Start the retry worker
	 *
	 * @param intervalMs - Check interval in milliseconds (default: 60000 = 1 minute)
	 */
	async start(intervalMs: number = 60000): Promise<void> {
		if (this.isRunning) {
			crawlerLogger.warn("Retry worker is already running");
			return;
		}

		this.isRunning = true;
		crawlerLogger.info({ intervalMs }, "Starting DLQ retry worker");

		// Process once immediately on start
		await this.processRetryQueue();

		// Then schedule periodic runs
		this.intervalId = setInterval(async () => {
			if (this.isRunning) {
				try {
					await this.processRetryQueue();
				} catch (error) {
					crawlerLogger.error(
						{
							error: error instanceof Error ? error.message : String(error),
						},
						"Retry worker error",
					);
				}
			}
		}, intervalMs);
	}

	/**
	 * Stop the retry worker
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			crawlerLogger.warn("Retry worker is not running");
			return;
		}

		this.isRunning = false;

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		crawlerLogger.info("Stopped DLQ retry worker");
	}

	/**
	 * Check if worker is currently running
	 */
	isActive(): boolean {
		return this.isRunning;
	}

	/**
	 * Process the retry queue
	 *
	 * Gets facilities ready for retry and attempts to re-crawl them.
	 */
	private async processRetryQueue(): Promise<void> {
		try {
			// Get facilities ready for retry
			const retryable = await this.dlq.getRetryableFailures(10);

			if (retryable.length === 0) {
				return; // Nothing to retry
			}

			crawlerLogger.info(
				{
					count: retryable.length,
				},
				"Retrying failed facilities",
			);

			// Group by date for efficient retry
			const groupedByDate = this.groupByDate(retryable);

			for (const [_date, entries] of Object.entries(groupedByDate)) {
				// Set status to RETRYING for all entries in this batch
				await Promise.all(
					entries.map((entry) =>
						this.dlq.updateStatus(entry.id, DLQStatus.RETRYING),
					),
				);

				// Attempt retry for each facility
				for (const entry of entries) {
					try {
						// Run crawl for this single facility
						const result = await this.orchestrator.runCrawl({
							faCode: [entry.faCode],
							playDate: entry.date.toISOString().split("T")[0],
							distCode: [entry.distCode],
						});

						if (result.success) {
							// Success: markResolved will be called by orchestrator
							crawlerLogger.info(
								{
									entryId: entry.id,
									faCode: entry.faCode,
									date: entry.date,
									attempts: entry.attempts,
								},
								"Retry succeeded",
							);
						} else {
							// Retry failed: update failure (increment attempts)
							const dateStr = entry.date.toISOString().split("T")[0];
							const error = new Error(
								`Retry failed for facility ${entry.faCode} on ${dateStr}`,
							);
							await this.dlq.addFailure({
								faCode: entry.faCode,
								date: dateStr,
								distCode: entry.distCode,
								error,
								jobId: entry.jobId || undefined,
							});

							crawlerLogger.warn(
								{
									entryId: entry.id,
									faCode: entry.faCode,
									date: entry.date,
									attempts: entry.attempts + 1,
								},
								"Retry failed",
							);
						}
					} catch (error) {
						// Unexpected error during retry
						crawlerLogger.error(
							{
								entryId: entry.id,
								faCode: entry.faCode,
								date: entry.date,
								error: error instanceof Error ? error.message : String(error),
							},
							"Unexpected retry error",
						);

						// Add failure to DLQ to increment attempts
						await this.dlq.addFailure({
							faCode: entry.faCode,
							date: entry.date.toISOString().split("T")[0],
							distCode: entry.distCode,
							error: error instanceof Error ? error : new Error(String(error)),
							jobId: entry.jobId || undefined,
						});
					}
				}
			}
		} catch (error) {
			crawlerLogger.error(
				{
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to process retry queue",
			);
			throw error;
		}
	}

	/**
	 * Group entries by date for efficient batch processing
	 *
	 * @param entries - Array of DeadLetterEntry
	 * @returns Object mapping date to array of entries
	 */
	private groupByDate(
		entries: import("./dead-letter-queue").DeadLetterEntry[],
	): Record<string, import("./dead-letter-queue").DeadLetterEntry[]> {
		return entries.reduce(
			(acc, entry) => {
				const dateKey =
					entry.date instanceof Date
						? entry.date.toISOString().split("T")[0]
						: String(entry.date);
				if (!acc[dateKey]) {
					acc[dateKey] = [];
				}
				acc[dateKey].push(entry);
				return acc;
			},
			{} as Record<string, import("./dead-letter-queue").DeadLetterEntry[]>,
		);
	}
}

/**
 * Singleton instance for global access
 */
let retryWorkerInstance: RetryWorker | null = null;

/**
 * Get or create the singleton retry worker instance
 *
 * @param orchestrator - CrawlerOrchestrator instance
 * @returns RetryWorker instance
 */
export function getRetryWorker(orchestrator: CrawlerOrchestrator): RetryWorker {
	if (!retryWorkerInstance) {
		retryWorkerInstance = new RetryWorker(orchestrator);
	}
	return retryWorkerInstance;
}

/**
 * Start the retry worker if not already running
 *
 * @param orchestrator - CrawlerOrchestrator instance
 * @param intervalMs - Check interval in milliseconds
 */
export async function startRetryWorker(
	orchestrator: CrawlerOrchestrator,
	intervalMs: number = 60000,
): Promise<void> {
	const worker = getRetryWorker(orchestrator);
	if (!worker.isActive()) {
		await worker.start(intervalMs);
	}
}

/**
 * Stop the retry worker
 */
export async function stopRetryWorker(): Promise<void> {
	if (retryWorkerInstance) {
		await retryWorkerInstance.stop();
	}
}
