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
			() => {
				console.log(
					`\n⏰ [Scheduler] Cron job triggered at ${new Date().toLocaleTimeString()} (${this.config.schedule.timezone})`,
				);
				this.triggerCrawl();
			},
			{
				timezone: this.config.schedule.timezone,
			},
		);

		console.log("✅ [Scheduler] Service started successfully");
	}

	/**
	 * Internal method to handle the crawl logic safely with recovery
	 */
	private async triggerCrawl() {
		if (this.isRunning) {
			console.log(
				"⚠️ [Scheduler] Previous crawl still running, skipping this scheduled run",
			);
			return;
		}

		this.isRunning = true;

		try {
			console.log(
				`🚀 [Scheduler] Starting crawler job at ${new Date().toISOString()}`,
			);

			let runId: string;
			let datesToProcess: string[];

			// 1. Check for incomplete run to resume if checkpoints enabled
			if (this.config.recovery?.enableCheckpoints) {
				const incompleteRun = await this.checkpoint.getIncompleteRun(
					this.config.recovery.staleRunThresholdMs,
				);

				if (incompleteRun) {
					console.log(
						`🔄 [Scheduler] Resuming incomplete run ${incompleteRun.id} (${incompleteRun.completedDays.length}/${incompleteRun.totalDays} days done)`,
					);
					runId = incompleteRun.id;
					datesToProcess = await this.checkpoint.getRemainingDays(runId);
				} else {
					// Create new run
					datesToProcess = this.generateDatesToProcess();
					const run = await this.checkpoint.createRun(datesToProcess);
					runId = run.id;
					console.log(
						`✨ [Scheduler] Created new run ${runId} for ${datesToProcess.length} days`,
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
					`\n📅 [Crawler] Processing Date: ${dateString} (Day ${i + 1}/${datesToProcess.length})`,
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
				//
				// NOTE: The zh-hk API response already contains BOTH languages:
				// - fatName: Chinese name (中文)
				// - enFatName: English name
				// Therefore, we only need one crawl instead of two.
				const result = await this.orchestrator.runCrawl({
					playDate: date,
					faCode: currentFaCodes,
				});

				if (result.success) {
					if (enableCheckpoints) {
						await this.checkpoint.markDayCompleted(runId, date, result.jobId);
					}

					// Trigger English Metadata Refresh (Best Effort)
					try {
						console.log(`[Day ${date}] Triggering English metadata refresh...`);
						await this.orchestrator.runCrawl({
							playDate: date,
							faCode: currentFaCodes,
							lang: "en",
						});
						console.log(`[Day ${date}] English metadata refresh completed`);
					} catch (enError) {
						console.warn(
							`[Day ${date}] English metadata refresh failed (non-critical):`,
							enError,
						);
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
		const daysToCrawl = this.config.parameters.daysToCrawl || 7;

		// Calculate "today" in the target timezone (HKT)
		// We use Intl.DateTimeFormat to get the correct YYYY-MM-DD for HK
		const formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone: this.config.schedule.timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});

		const now = new Date();
		const todayStr = formatter.format(now); // "2026-01-14"
		const today = new Date(todayStr);

		for (let i = 0; i < daysToCrawl; i++) {
			const targetDate = new Date(today);
			targetDate.setDate(today.getDate() + i);
			dates.push(targetDate.toISOString().split("T")[0]);
		}

		return dates;
	}

	/**
	 * Stop the scheduled crawler immediately
	 * Does not wait for in-progress crawls to complete
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
	 * Gracefully stop the scheduler and wait for in-progress crawls
	 * @param timeout Maximum time to wait for crawls to complete (ms)
	 * @returns Promise that resolves when shutdown is complete
	 */
	async gracefulStop(timeout: number = 30000): Promise<void> {
		console.log("🛑 Initiating graceful scheduler shutdown...");

		// First, stop accepting new scheduled tasks
		if (this.task) {
			this.task.stop();
			this.task = null;
			console.log("✅ Scheduler stopped accepting new tasks");
		}

		// Wait for in-progress crawl to complete (with timeout)
		if (this.isRunning) {
			console.log("⏳ Waiting for in-progress crawl to complete...");
			const startTime = Date.now();

			return new Promise<void>((resolve) => {
				const checkInterval = setInterval(() => {
					const elapsed = Date.now() - startTime;

					if (!this.isRunning) {
						clearInterval(checkInterval);
						console.log("✅ In-progress crawl completed");
						resolve();
						return;
					}

					if (elapsed > timeout) {
						clearInterval(checkInterval);
						const warning = `⏰ Graceful shutdown timeout after ${elapsed}ms. Forcing shutdown.`;
						console.warn(warning);
						this.isRunning = false; // Force stop
						resolve();
						return;
					}

					// Log progress every 5 seconds
					if (elapsed % 5000 < 100) {
						console.log(
							`⏳ Still waiting... (${Math.round(elapsed / 1000)}s elapsed)`,
						);
					}
				}, 100);
			});
		} else {
			console.log("✅ No crawl in progress, scheduler stopped immediately");
		}
	}

	/**
	 * Run crawl immediately (manual trigger)
	 */
	async runNow(params?: Partial<CrawlerConfig["parameters"]>): Promise<string> {
		console.log("Running manual crawl...");
		// NOTE: The zh-hk API response already contains BOTH languages (fatName and enFatName)
		// No need for separate English crawl
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
 * Cleanup scheduler with graceful shutdown
 * Waits for in-progress crawls to complete before stopping
 * @param timeout Maximum time to wait for crawls to complete (ms)
 */
export async function destroyScheduler(timeout: number = 30000): Promise<void> {
	if (globalScheduler) {
		await globalScheduler.gracefulStop(timeout);
		globalScheduler = null;
		console.log("✅ Scheduler destroyed and cleaned up");
	}
}

/**
 * Cleanup scheduler immediately (legacy method for backward compatibility)
 * Does not wait for in-progress crawls to complete
 */
export function destroySchedulerImmediately(): void {
	if (globalScheduler) {
		globalScheduler.stop();
		globalScheduler = null;
		console.log("⏹️ Scheduler destroyed immediately");
	}
}
