import { prisma } from "@/db";
import { JobStatus, type ScheduledCrawlRun } from "@/generated/prisma/client";

export class SchedulerCheckpointService {
	/**
	 * Create a new scheduled run
	 */
	async createRun(daysToProcess: string[]): Promise<ScheduledCrawlRun> {
		if (daysToProcess.length === 0) {
			throw new Error("Cannot create run with no days to process");
		}

		return prisma.scheduledCrawlRun.create({
			data: {
				daysToProcess,
				totalDays: daysToProcess.length,
				status: JobStatus.RUNNING,
				currentDay: daysToProcess[0],
			},
		});
	}

	/**
	 * Mark a day as starting
	 */
	async markDayStarted(runId: string, date: string): Promise<void> {
		await prisma.scheduledCrawlRun.update({
			where: { id: runId },
			data: {
				currentDay: date,
				lastActivityAt: new Date(),
			},
		});
	}

	/**
	 * Mark a day as completed
	 */
	async markDayCompleted(
		runId: string,
		date: string,
		jobId: string,
	): Promise<void> {
		const run = await prisma.scheduledCrawlRun.findUnique({
			where: { id: runId },
			select: { completedDays: true },
		});

		if (!run) throw new Error(`Run ${runId} not found`);

		const completedDays = [...run.completedDays];
		if (!completedDays.includes(date)) {
			completedDays.push(date);
		}

		await prisma.$transaction([
			// Update the run progress
			prisma.scheduledCrawlRun.update({
				where: { id: runId },
				data: {
					completedDays,
					lastActivityAt: new Date(),
				},
			}),
			// Link the job to the run
			prisma.crawlJob.update({
				where: { id: jobId },
				data: {
					scheduledRunId: runId,
				},
			}),
		]);
	}

	/**
	 * Mark a day as failed (with retry tracking)
	 */
	async markDayFailed(
		runId: string,
		date: string,
		error: Error,
		attempt: number,
	): Promise<void> {
		const run = await prisma.scheduledCrawlRun.findUnique({
			where: { id: runId },
			select: { failedDays: true },
		});

		if (!run) throw new Error(`Run ${runId} not found`);

		// Update failed days log
		const failedDays =
			(run.failedDays as { date: string; error: string; attempts: number }[]) ||
			[];

		// Remove existing entry for this date if any (to update it)
		const existingIndex = failedDays.findIndex((item) => item.date === date);
		const errorEntry = {
			date,
			error: error.message,
			attempts: attempt,
			timestamp: new Date().toISOString(),
		};

		const newFailedDays = [...failedDays];
		if (existingIndex >= 0) {
			newFailedDays[existingIndex] = errorEntry;
		} else {
			newFailedDays.push(errorEntry);
		}

		await prisma.scheduledCrawlRun.update({
			where: { id: runId },
			data: {
				failedDays: newFailedDays,
				lastActivityAt: new Date(),
			},
		});
	}

	/**
	 * Get incomplete run (for recovery)
	 * Looks for running jobs updated within the last 24 hours
	 */
	async getIncompleteRun(
		staleThresholdMs = 24 * 60 * 60 * 1000,
	): Promise<ScheduledCrawlRun | null> {
		const cutoff = new Date(Date.now() - staleThresholdMs);

		return prisma.scheduledCrawlRun.findFirst({
			where: {
				status: JobStatus.RUNNING,
				lastActivityAt: {
					gt: cutoff,
				},
			},
			orderBy: {
				lastActivityAt: "desc",
			},
		});
	}

	/**
	 * Get remaining days to process for a run
	 */
	async getRemainingDays(runId: string): Promise<string[]> {
		const run = await prisma.scheduledCrawlRun.findUnique({
			where: { id: runId },
		});

		if (!run) throw new Error(`Run ${runId} not found`);

		// Filter out completed days
		return run.daysToProcess.filter((day) => !run.completedDays.includes(day));
	}

	/**
	 * Complete the entire run
	 */
	async completeRun(runId: string): Promise<void> {
		await prisma.scheduledCrawlRun.update({
			where: { id: runId },
			data: {
				status: JobStatus.COMPLETED,
				completedAt: new Date(),
				currentDay: null,
			},
		});
	}

	/**
	 * Fail the entire run (e.g. on fatal error)
	 */
	async failRun(runId: string, _error: Error): Promise<void> {
		// Log the error as a failed day if we have a current day
		// otherwise just fail the run

		await prisma.scheduledCrawlRun.update({
			where: { id: runId },
			data: {
				status: JobStatus.FAILED,
				completedAt: new Date(),
			},
		});
	}

	/**
	 * Get total processed stats for a run
	 */
	async getRunStats(runId: string) {
		const jobs = await prisma.crawlJob.findMany({
			where: { scheduledRunId: runId },
			include: {
				results: true,
			},
		});

		let totalSessions = 0;
		let totalVenues = 0;

		for (const job of jobs) {
			if (job.results.length > 0) {
				totalSessions += job.results[0].sessionCount;
				totalVenues += job.results[0].venueCount;
			}
		}

		return {
			jobCount: jobs.length,
			totalSessions,
			totalVenues,
		};
	}
}
