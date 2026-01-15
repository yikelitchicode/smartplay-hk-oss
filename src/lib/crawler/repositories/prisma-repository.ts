/**
 * Prisma-based Repository Implementations
 *
 * Concrete implementations of repository interfaces using Prisma ORM.
 * These provide the production data access layer for the crawler system.
 */

import { prisma } from "../../../db";
import type {
	CrawlJob,
	ScheduledCrawlRun,
	Session,
} from "../../../generated/prisma/client";
import { JobStatus, TimePeriod } from "../../../generated/prisma/enums";
import type {
	CrawlJobSummary,
	CreateJobParams,
	CreateRunParams,
	ICheckpointRepository,
	ICrawlJobRepository,
	IRepositoryFactory,
	ISessionRepository,
	JobStats,
	SessionInsert,
} from "./interfaces";

// ============================================================
// Prisma Crawl Job Repository
// ============================================================

/**
 * Prisma implementation of ICrawlJobRepository
 *
 * Handles database operations for crawl jobs using Prisma Client.
 */
export class PrismaCrawlJobRepository implements ICrawlJobRepository {
	async createJob(params: CreateJobParams): Promise<CrawlJob> {
		return prisma.crawlJob.create({
			data: {
				faCode: params.faCodes.join(","),
				playDate: params.playDate,
				distCode: params.distCode.join(","),
				status: params.status,
			},
		});
	}

	async completeJob(jobId: string, stats: JobStats): Promise<CrawlJob> {
		return prisma.crawlJob.update({
			where: { id: jobId },
			data: {
				status: JobStatus.COMPLETED,
				completedAt: new Date(),
				results: {
					create: {
						venueCount: stats.totalFacilities,
						sessionCount: stats.successCount,
						rawData: {},
					},
				},
			},
		});
	}

	async failJob(jobId: string, error: Error): Promise<CrawlJob> {
		return prisma.crawlJob.update({
			where: { id: jobId },
			data: {
				status: JobStatus.FAILED,
				completedAt: new Date(),
				errorMessage: error.message,
			},
		});
	}

	async findJobById(jobId: string): Promise<CrawlJob | null> {
		return prisma.crawlJob.findUnique({
			where: { id: jobId },
		});
	}

	async findLatestJobs(limit: number): Promise<CrawlJobSummary[]> {
		const jobs = await prisma.crawlJob.findMany({
			orderBy: { startedAt: "desc" },
			take: limit,
			select: {
				id: true,
				faCode: true,
				playDate: true,
				distCode: true,
				status: true,
				startedAt: true,
				completedAt: true,
				errorMessage: true,
				results: {
					take: 1,
					orderBy: { createdAt: "desc" },
				},
			},
		});

		return jobs.map((job) => ({
			...job,
			faCodes: job.faCode.split(","),
			distCode: job.distCode.split(","),
			error: job.errorMessage,
			totalFacilities: job.results?.[0]?.venueCount || 0,
			successCount: job.results?.[0]?.sessionCount || 0,
			failureCount: 0,
		})) as CrawlJobSummary[];
	}
}

// ============================================================
// Prisma Session Repository
// ============================================================

/**
 * Prisma implementation of ISessionRepository
 *
 * Handles bulk operations for venue session data using Prisma Client.
 */
export class PrismaSessionRepository implements ISessionRepository {
	async upsertSessions(sessions: SessionInsert[]): Promise<void> {
		const BATCH_SIZE = 50;

		// Process in batches to avoid overwhelming the database
		for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
			const batch = sessions.slice(i, i + BATCH_SIZE);

			await Promise.all(
				batch.map((session) =>
					prisma.session.upsert({
						where: {
							venueId_facilityCode_date_startTime: {
								venueId: session.venueId || "",
								facilityCode: session.faCode,
								date: new Date(session.playDate),
								startTime: session.startTime,
							},
						},
						update: {
							available: session.availableSessions > 0,
							facilityTypeNameTc: session.facilityTypeNameTc,
							facilityTypeNameSc: session.facilityTypeNameSc,
							createdAt: new Date(),
						},
						create: {
							id:
								session.sessionId ||
								`${session.venueId || ""}-${session.faCode}-${session.playDate}-${session.startTime}`,
							crawlJobId: session.crawlJobId || "manual",
							venueId: session.venueId || "",
							facilityTypeName: session.facilityTypeName || "",
							facilityTypeNameEn: session.facilityTypeNameEn || "",
							facilityTypeNameTc: session.facilityTypeNameTc,
							facilityTypeNameSc: session.facilityTypeNameSc,
							facilityCode: session.faCode,
							facilityVRId: session.facilityVRId || "",
							date: new Date(session.playDate),
							startTime: session.startTime,
							endTime: session.endTime,
							timePeriod:
								(session.timePeriod as TimePeriod) || TimePeriod.MORNING,
							available: session.availableSessions > 0,
							isPeakHour: session.isPeakHour || false,
							isOpen: true,
						},
					}),
				),
			);
		}
	}

	async findSessionsByDateAndFacility(
		date: string,
		facilityCode: string,
	): Promise<Session[]> {
		return prisma.session.findMany({
			where: {
				date: new Date(date),
				facilityCode: facilityCode,
			},
			orderBy: [{ startTime: "asc" }],
		});
	}

	async deleteSessionsByDate(date: string): Promise<void> {
		await prisma.session.deleteMany({
			where: { date: new Date(date) },
		});
	}

	async countSessions(): Promise<number> {
		return prisma.session.count();
	}
}

// ============================================================
// Prisma Checkpoint Repository
// ============================================================

/**
 * Prisma implementation of ICheckpointRepository
 *
 * Manages scheduled crawl run state for recovery using Prisma Client.
 */
export class PrismaCheckpointRepository implements ICheckpointRepository {
	async createRun(params: CreateRunParams): Promise<ScheduledCrawlRun> {
		return prisma.scheduledCrawlRun.create({
			data: {
				daysToProcess: params.daysToProcess,
				totalDays: params.totalDays,
				status: params.status,
			},
		});
	}

	async markDayCompleted(
		runId: string,
		day: string,
		_jobId: string,
	): Promise<void> {
		await prisma.scheduledCrawlRun.update({
			where: { id: runId },
			data: {
				completedDays: {
					push: day,
				},
				// Also track which job processed which day
				// This could be stored in a separate relation if needed
			},
		});
	}

	async getIncompleteRun(
		staleThresholdMinutes: number,
	): Promise<ScheduledCrawlRun | null> {
		const staleThreshold = new Date();
		staleThreshold.setMinutes(
			staleThreshold.getMinutes() - staleThresholdMinutes,
		);

		return prisma.scheduledCrawlRun.findFirst({
			where: {
				status: { in: [JobStatus.PENDING, JobStatus.RUNNING] },
				lastActivityAt: { lt: staleThreshold },
			},
			orderBy: { startedAt: "asc" },
		});
	}

	async getRemainingDays(runId: string): Promise<string[]> {
		const run = await prisma.scheduledCrawlRun.findUnique({
			where: { id: runId },
			select: { daysToProcess: true, completedDays: true },
		});

		if (!run) {
			return [];
		}

		// Return days that haven't been completed yet
		return run.daysToProcess.filter((day) => !run.completedDays.includes(day));
	}

	async markRunCompleted(runId: string): Promise<void> {
		await prisma.scheduledCrawlRun.update({
			where: { id: runId },
			data: {
				status: "COMPLETED",
				completedAt: new Date(),
			},
		});
	}

	async deleteOldRuns(olderThanDays: number): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		const result = await prisma.scheduledCrawlRun.deleteMany({
			where: {
				status: "COMPLETED",
				completedAt: { lt: cutoffDate },
			},
		});

		return result.count;
	}

	async findRunById(runId: string): Promise<ScheduledCrawlRun | null> {
		return prisma.scheduledCrawlRun.findUnique({
			where: { id: runId },
		});
	}
}

// ============================================================
// Repository Factory
// ============================================================

/**
 * Prisma-based Repository Factory
 *
 * Creates and caches repository instances for dependency injection.
 * Implements singleton pattern for each repository type.
 */
export class PrismaRepositoryFactory implements IRepositoryFactory {
	private crawlJobRepo: ICrawlJobRepository | null = null;
	private sessionRepo: ISessionRepository | null = null;
	private checkpointRepo: ICheckpointRepository | null = null;

	getCrawlJobRepository(): ICrawlJobRepository {
		if (!this.crawlJobRepo) {
			this.crawlJobRepo = new PrismaCrawlJobRepository();
		}
		return this.crawlJobRepo;
	}

	getSessionRepository(): ISessionRepository {
		if (!this.sessionRepo) {
			this.sessionRepo = new PrismaSessionRepository();
		}
		return this.sessionRepo;
	}

	getCheckpointRepository(): ICheckpointRepository {
		if (!this.checkpointRepo) {
			this.checkpointRepo = new PrismaCheckpointRepository();
		}
		return this.checkpointRepo;
	}
}
