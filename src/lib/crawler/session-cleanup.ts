import cron, { type ScheduledTask } from "node-cron";
import { prisma } from "../../db";

/**
 * Service to handle cleanup of old sessions
 */
export class SessionCleanupService {
	/**
	 * Delete sessions that are older than the retention period
	 * @param retentionDays Number of days to keep past sessions (default: 0 = delete all past dates)
	 */
	async deleteOverdueSessions(retentionDays = 0): Promise<number> {
		// Calculate cutoff date based on HKT "today"
		// We want to delete sessions where date < (today - retentionDays)
		const now = new Date();
		const formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Hong_Kong",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});

		const todayStr = formatter.format(now); // "2026-01-16"
		const cutoffDate = new Date(todayStr); // 2026-01-16T00:00:00.000Z (UTC representation of HKT date start)

		// Adjust for retention days
		if (retentionDays > 0) {
			cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
		}

		console.log(
			`[Cleanup] Removing sessions before ${cutoffDate.toISOString().split("T")[0]} (Retention: ${retentionDays} days)`,
		);

		// Delete sessions strictly before the cutoff date
		// Since session.date is stored as a Date object representing the day (e.g. 2026-01-15T00:00:00.000Z),
		// we can use the 'lt' (less than) operator.
		const result = await prisma.session.deleteMany({
			where: {
				date: {
					lt: cutoffDate,
				},
			},
		});

		console.log(`[Cleanup] Deleted ${result.count} overdue sessions`);
		return result.count;
	}
}

/**
 * Scheduler for session cleanup
 */
export class CleanupScheduler {
	private task: ScheduledTask | null = null;
	private service: SessionCleanupService;

	constructor() {
		this.service = new SessionCleanupService();
	}

	start() {
		if (this.task) {
			return;
		}

		const enabled = process.env.CLEANUP_ENABLED !== "false";
		if (!enabled) {
			console.log("Session cleanup scheduler is disabled");
			return;
		}

		// Default: Run at 4:00 AM HKT daily
		const cronSchedule = process.env.CLEANUP_CRON || "0 4 * * *";
		const retentionDays = parseInt(
			process.env.CLEANUP_RETENTION_DAYS || "0",
			10,
		);
		const timezone = process.env.CRAWLER_TIMEZONE || "Asia/Hong_Kong";

		console.log(
			`Starting cleanup scheduler with cron: ${cronSchedule} (Retention: ${retentionDays} days)`,
		);

		this.task = cron.schedule(
			cronSchedule,
			async () => {
				try {
					console.log(
						`[Scheduled Cleanup] Started at ${new Date().toISOString()}`,
					);
					const start = Date.now();
					await this.service.deleteOverdueSessions(retentionDays);
					const duration = Date.now() - start;
					console.log(`[Scheduled Cleanup] Completed in ${duration}ms`);
				} catch (error) {
					console.error("[Scheduled Cleanup] Failed:", error);
				}
			},
			{
				timezone: timezone,
			},
		);

		console.log("✅ Cleanup scheduler started");
	}

	stop() {
		if (this.task) {
			this.task.stop();
			this.task = null;
			console.log("⏹️ Cleanup scheduler stopped");
		}
	}
}

// Global instance
let globalCleanupScheduler: CleanupScheduler | null = null;

export function initCleanupScheduler(): CleanupScheduler {
	if (!globalCleanupScheduler) {
		globalCleanupScheduler = new CleanupScheduler();
	}
	return globalCleanupScheduler;
}
