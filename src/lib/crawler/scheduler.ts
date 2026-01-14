/**
 * Scheduler service for automated crawling with cron jobs
 */

import cron, { type ScheduledTask } from "node-cron";
import { SchedulerCheckpointService } from "./checkpoint";
import { loadConfig } from "./config";
import { CrawlerOrchestrator } from "./orchestrator";
import type { CrawlerConfig } from "./types";

export class CrawlerScheduler {
	private task: ScheduledTask | null = null;
	private orchestrator: CrawlerOrchestrator;
	private checkpoint: SchedulerCheckpointService;
	private config: CrawlerConfig;
	private isRunning: boolean = false;

	constructor(config: CrawlerConfig) {
		this.config = config;
		this.orchestrator = new CrawlerOrchestrator(config);
		this.checkpoint = new SchedulerCheckpointService();
	}

	/**
	 * Start the scheduled crawler
	 */
	start(options: { runImmediate?: boolean } = { runImmediate: true }) {
		if (this.task) {
			console.warn("Scheduler already running");
			return;
		}

		if (!this.config.schedule.enabled) {
			console.log("Scheduler is disabled in config");
			return;
		}

		console.log(
			`Starting scheduler with cron: ${this.config.schedule.interval}`,
		);
		console.log(`Timezone: ${this.config.schedule.timezone}`);

		if (options.runImmediate) {
			console.log("Triggering immediate initial crawl...");
			this.triggerCrawl();
		}

		this.task = cron.schedule(
			this.config.schedule.interval,
			() => this.triggerCrawl(),
			{
				timezone: this.config.schedule.timezone,
			},
		);

		console.log("✅ Scheduler started successfully");
	}

	/**
	 * Internal method to handle the crawl logic safely with recovery
	 */
	private async triggerCrawl() {
		if (this.isRunning) {
			console.log("Previous crawl still running, skipping this scheduled run");
			return;
		}

		this.isRunning = true;

		try {
			console.log(`[Scheduled Crawl] Started at ${new Date().toISOString()}`);

			let runId: string;
			let datesToProcess: string[];

			// 1. Check for incomplete run to resume if checkpoints enabled
			if (this.config.recovery?.enableCheckpoints) {
				const incompleteRun = await this.checkpoint.getIncompleteRun(
					this.config.recovery.staleRunThresholdMs,
				);

				if (incompleteRun) {
					console.log(
						`[Recovery] Resuming run ${incompleteRun.id} with ${incompleteRun.completedDays.length}/${incompleteRun.totalDays} days complete`,
					);
					runId = incompleteRun.id;
					datesToProcess = await this.checkpoint.getRemainingDays(runId);
				} else {
					// Create new run
					datesToProcess = this.generateDatesToProcess();
					const run = await this.checkpoint.createRun(datesToProcess);
					runId = run.id;
					console.log(
						`[Scheduled Crawl] Created new run ${runId} for ${datesToProcess.length} days`,
					);
				}
			} else {
				// No checkpointing, just generate dates (legacy mode)
				datesToProcess = this.generateDatesToProcess();
				runId = `legacy-run-${Date.now()}`; // Dummy ID
			}

			// 2. Process each day
			for (let i = 0; i < datesToProcess.length; i++) {
				const dateString = datesToProcess[i];
				console.log(
					`[Scheduled Crawl] Processing Day ${dateString} (${i + 1}/${datesToProcess.length})`,
				);

				// Process day with retry
				await this.processDayWithRetry(runId, dateString);

				// Optional delay between days
				if (i < datesToProcess.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 2000));
				}
			}

			// 3. Complete the run if checkpoints enabled
			if (
				this.config.recovery?.enableCheckpoints &&
				!runId.startsWith("legacy")
			) {
				await this.checkpoint.completeRun(runId);
			}

			console.log(`[Scheduled Crawl] All days completed successfully`);
		} catch (error) {
			console.error("[Scheduled Crawl] Failed:", error);
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Process a single day with retry logic
	 */
	private async processDayWithRetry(runId: string, date: string) {
		const maxRetries = this.config.recovery?.maxRetryAttemptsPerDay || 3;
		const retryDelay = this.config.recovery?.retryDelayBase || 2000;
		const enableCheckpoints =
			this.config.recovery?.enableCheckpoints && !runId.startsWith("legacy");

		let currentFaCodes: string[] | undefined; // Undefined means all

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				if (enableCheckpoints) {
					await this.checkpoint.markDayStarted(runId, date);
				}

				// Run the actual crawl
				// We pass currentFaCodes if set (for retries), otherwise it uses default from config
				const result = await this.orchestrator.runCrawl({
					playDate: date,
					faCode: currentFaCodes,
				});

				if (result.success) {
					if (enableCheckpoints) {
						await this.checkpoint.markDayCompleted(runId, date, result.jobId);
					}
					return; // Full success
				}

				// Partial or total failure
				console.warn(
					`[Day ${date}] Attempt ${attempt}/${maxRetries} finished with failures: ${result.failedCodes.join(", ")}`,
				);

				// Prepare for next retry
				currentFaCodes = result.failedCodes;

				if (enableCheckpoints) {
					await this.checkpoint.markDayFailed(
						runId,
						date,
						new Error(`Failed codes: ${currentFaCodes.join(", ")}`),
						attempt,
					);
				}

				if (attempt < maxRetries) {
					const delay = 2 ** attempt * retryDelay; // Exponential backoff
					console.warn(
						`[Day ${date}] Retrying ${currentFaCodes.length} facilities in ${Math.round(delay / 1000)}s...`,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				} else {
					console.error(
						`[Day ${date}] All ${maxRetries} attempts failed for codes: ${currentFaCodes.join(", ")}. Continuing to next day.`,
					);
				}
			} catch (error) {
				// Catastrophic failure (e.g. database down, not just facility fetch error)
				console.error(
					`[Day ${date}] Attempt ${attempt}/${maxRetries} failed with system error:`,
					error,
				);

				if (attempt < maxRetries) {
					const delay = 2 ** attempt * retryDelay;
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}
	}

	/**
	 * Generate list of dates to crawl (e.g. today + next 6 days)
	 */
	private generateDatesToProcess(): string[] {
		const dates: string[] = [];
		const today = new Date();
		const DAYS_TO_CRAWL = 7;

		for (let i = 0; i < DAYS_TO_CRAWL; i++) {
			const targetDate = new Date(today);
			targetDate.setDate(today.getDate() + i);
			dates.push(targetDate.toISOString().split("T")[0]);
		}

		return dates;
	}

	/**
	 * Stop the scheduled crawler
	 */
	stop() {
		if (this.task) {
			this.task.stop();
			this.task = null;
			this.isRunning = false;
			console.log("⏹️ Scheduler stopped");
		} else {
			console.warn("Scheduler is not running");
		}
	}

	/**
	 * Run crawl immediately (manual trigger)
	 */
	async runNow(params?: Partial<CrawlerConfig["parameters"]>): Promise<string> {
		console.log("Running manual crawl...");
		const result = await this.orchestrator.runCrawl(params);
		console.log(`Manual crawl completed: ${result.jobId}`);
		return result.jobId;
	}

	/**
	 * Get orchestrator instance for direct access
	 */
	getOrchestrator(): CrawlerOrchestrator {
		return this.orchestrator;
	}

	/**
	 * Check if scheduler is currently running
	 */
	isActive(): boolean {
		return this.task !== null;
	}

	/**
	 * Check if a crawl is currently in progress
	 */
	isCrawlRunning(): boolean {
		return this.isRunning;
	}
}

// Global scheduler instance
let globalScheduler: CrawlerScheduler | null = null;

/**
 * Initialize or get the global scheduler instance
 */
export function initScheduler(config?: CrawlerConfig): CrawlerScheduler {
	if (!globalScheduler) {
		const crawlerConfig = config || loadConfig();
		globalScheduler = new CrawlerScheduler(crawlerConfig);
	}
	return globalScheduler;
}

/**
 * Get the global scheduler instance (must be initialized first)
 */
export function getScheduler(): CrawlerScheduler {
	if (!globalScheduler) {
		throw new Error("Scheduler not initialized. Call initScheduler() first.");
	}
	return globalScheduler;
}

/**
 * Cleanup scheduler (useful for testing or graceful shutdown)
 */
export function destroyScheduler() {
	if (globalScheduler) {
		globalScheduler.stop();
		globalScheduler = null;
	}
}
