/**
 * Watch Evaluation Scheduler
 *
 * Periodic evaluation of watchers for availability changes.
 * Runs on a cron schedule (default: every 5 minutes).
 */

import type { ScheduledTask } from "node-cron";
import cron from "node-cron";
import { createLogger } from "@/lib/logger";
import type { WatchEvaluator } from "../services/watch-evaluator";
import type { EvaluationConfig, ScheduleConfig } from "../types";

const logger = createLogger({ module: "watch-evaluation-scheduler" });

export class WatchEvaluationScheduler {
	private task: ScheduledTask | null = null;
	private watchEvaluator: WatchEvaluator;
	private scheduleConfig: ScheduleConfig;
	private isRunning: boolean = false;

	constructor(
		watchEvaluator: WatchEvaluator,
		scheduleConfig: ScheduleConfig,
		_evaluationConfig: EvaluationConfig,
	) {
		this.watchEvaluator = watchEvaluator;
		this.scheduleConfig = scheduleConfig;
		// Evaluation config not used currently but kept for future enhancements
		void _evaluationConfig;
	}

	/**
	 * Start the evaluation scheduler
	 *
	 * @param options - Optional configuration
	 */
	start(options: { runImmediate?: boolean } = { runImmediate: true }) {
		if (this.task) {
			logger.warn("Watch evaluation scheduler already running");
			return;
		}

		if (!this.scheduleConfig.enabled) {
			logger.info("Watch evaluation scheduler is disabled in config");
			return;
		}

		logger.info(
			`Starting watch evaluation scheduler with cron: ${this.scheduleConfig.interval}`,
		);
		logger.info(`Timezone: ${this.scheduleConfig.timezone}`);

		if (options.runImmediate) {
			logger.info("Triggering immediate initial watch evaluation...");
			this.triggerEvaluation();
		}

		this.task = cron.schedule(
			this.scheduleConfig.interval,
			() => {
				logger.info(
					`\n⏰ [Watch Evaluation] Cron job triggered at ${new Date().toLocaleTimeString()} (${this.scheduleConfig.timezone})`,
				);
				this.triggerEvaluation();
			},
			{
				timezone: this.scheduleConfig.timezone,
			},
		);

		logger.info("✅ [Watch Evaluation] Scheduler started successfully");
	}

	/**
	 * Internal method to handle evaluation logic safely
	 */
	private async triggerEvaluation() {
		if (this.isRunning) {
			logger.info(
				"⚠️ [Watch Evaluation] Previous evaluation still running, skipping this scheduled run",
			);
			return;
		}

		this.isRunning = true;

		try {
			logger.info(
				`🚀 [Watch Evaluation] Starting evaluation job at ${new Date().toISOString()}`,
			);

			const startTime = Date.now();

			// 1. Evaluate all active watchers
			const results = await this.watchEvaluator.evaluateActiveWatchers();

			const duration = Date.now() - startTime;

			logger.info(
				{
					watchersEvaluated: results.length,
					duration: `${duration}ms`,
				},
				"Watch evaluation completed",
			);

			if (results.length > 0) {
				logger.info(
					{ hitCount: results.length },
					"Found availability changes, notifications sent",
				);
			}
		} catch (error) {
			logger.error({ error }, "[Watch Evaluation] Failed");
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Stop the evaluation scheduler
	 */
	stop() {
		if (this.task) {
			this.task.stop();
			this.task = null;
			this.isRunning = false;
			logger.info("⏹️ Watch evaluation scheduler stopped");
		} else {
			logger.warn("Watch evaluation scheduler is not running");
		}
	}

	/**
	 * Check if scheduler is currently running
	 */
	isActive(): boolean {
		return this.task !== null;
	}

	/**
	 * Check if evaluation is currently in progress
	 */
	isEvaluationRunning(): boolean {
		return this.isRunning;
	}
}
