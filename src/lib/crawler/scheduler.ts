/**
 * Scheduler service for automated crawling with cron jobs
 */

import cron from "node-cron";
import { loadConfig } from "./config";
import { CrawlerOrchestrator } from "./orchestrator";
import type { CrawlerConfig } from "./types";

export class CrawlerScheduler {
	private task: cron.ScheduledTask | null = null;
	private orchestrator: CrawlerOrchestrator;
	private config: CrawlerConfig;
	private isRunning: boolean = false;

	constructor(config: CrawlerConfig) {
		this.config = config;
		this.orchestrator = new CrawlerOrchestrator(config);
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
	 * Internal method to handle the crawl logic safely
	 */
	private async triggerCrawl() {
		if (this.isRunning) {
			console.log("Previous crawl still running, skipping this scheduled run");
			return;
		}

		this.isRunning = true;

		try {
			console.log(`[Scheduled Crawl] Started at ${new Date().toISOString()}`);

			// Crawl the next 7 days sequentially
			const today = new Date();
			const DAYS_TO_CRAWL = 7;

			for (let i = 0; i < DAYS_TO_CRAWL; i++) {
				const targetDate = new Date(today);
				targetDate.setDate(today.getDate() + i);
				const dateString = targetDate.toISOString().split("T")[0];

				console.log(
					`[Scheduled Crawl] Processing Day ${i + 1}/${DAYS_TO_CRAWL}: ${dateString}`,
				);

				// Run crawl for specific date and wait for completion
				await this.orchestrator.runCrawl({ playDate: dateString });

				// Optional: Add a small delay between days to be nice to the API
				if (i < DAYS_TO_CRAWL - 1) {
					await new Promise((resolve) => setTimeout(resolve, 2000));
				}
			}

			console.log(`[Scheduled Crawl] All 7 days completed successfully`);
		} catch (error) {
			console.error("[Scheduled Crawl] Failed:", error);
		} finally {
			this.isRunning = false;
		}
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
		const jobId = await this.orchestrator.runCrawl(params);
		console.log(`Manual crawl completed: ${jobId}`);
		return jobId;
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
