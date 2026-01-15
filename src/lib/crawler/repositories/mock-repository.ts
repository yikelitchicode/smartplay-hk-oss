/**
 * Mock Repository Implementations for Testing
 *
 * In-memory implementations of repository interfaces for unit testing.
 * These allow testing without database dependencies.
 */

import type {
	CrawlJob,
	ScheduledCrawlRun,
	Session,
} from "../../../generated/prisma/client";
import { JobStatus } from "../../../generated/prisma/enums";
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
// Mock Crawl Job Repository
// ============================================================

/**
 * In-memory implementation of ICrawlJobRepository for testing
 */
export class MockCrawlJobRepository implements ICrawlJobRepository {
	private jobs: Map<string, CrawlJob> = new Map();

	async createJob(params: CreateJobParams): Promise<CrawlJob> {
		const job: CrawlJob = {
			id: `mock-job-${Date.now()}-${Math.random()}`,
			faCode: params.faCodes.join(","),
			playDate: params.playDate,
			distCode: params.distCode.join(","),
			status: params.status,
			startedAt: new Date(),
			completedAt: null,
			errorMessage: null,
			scheduledRunId: null,
		};

		this.jobs.set(job.id, job);
		return job;
	}

	async completeJob(jobId: string, _stats: JobStats): Promise<CrawlJob> {
		const job = this.jobs.get(jobId);
		if (!job) {
			throw new Error(`Job ${jobId} not found`);
		}

		const updated: CrawlJob = {
			...job,
			status: JobStatus.COMPLETED,
			completedAt: new Date(),
		};

		this.jobs.set(jobId, updated);
		return updated;
	}

	async failJob(jobId: string, error: Error): Promise<CrawlJob> {
		const job = this.jobs.get(jobId);
		if (!job) {
			throw new Error(`Job ${jobId} not found`);
		}

		const updated: CrawlJob = {
			...job,
			status: JobStatus.FAILED,
			completedAt: new Date(),
			errorMessage: error.message,
		};

		this.jobs.set(jobId, updated);
		return updated;
	}

	async findJobById(jobId: string): Promise<CrawlJob | null> {
		return this.jobs.get(jobId) || null;
	}

	async findLatestJobs(limit: number): Promise<CrawlJobSummary[]> {
		const allJobs = Array.from(this.jobs.values()).sort(
			(a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
		);

		return allJobs.slice(0, limit).map((job) => ({
			id: job.id,
			faCodes: job.faCode.split(","),
			playDate: job.playDate,
			distCode: job.distCode.split(","),
			status: job.status,
			startedAt: job.startedAt,
			completedAt: job.completedAt,
			totalFacilities: 0,
			successCount: 0,
			failureCount: 0,
			error: job.errorMessage,
		}));
	}

	/**
	 * Helper method for testing: Clear all jobs
	 */
	clear(): void {
		this.jobs.clear();
	}

	/**
	 * Helper method for testing: Get total job count
	 */
	count(): number {
		return this.jobs.size;
	}
}

// ============================================================
// Mock Session Repository
// ============================================================

/**
 * In-memory implementation of ISessionRepository for testing
 */
export class MockSessionRepository implements ISessionRepository {
	private sessions: Map<string, Session> = new Map();

	async upsertSessions(sessions: SessionInsert[]): Promise<void> {
		for (const sessionData of sessions) {
			const key = `${sessionData.venueName}-${sessionData.playDate}-${sessionData.startTime}`;

			const existing = this.sessions.get(key);
			if (existing) {
				// Update existing session
				const updated: Session = {
					...existing,
					available: sessionData.availableSessions > 0,
				};
				this.sessions.set(key, updated);
			} else {
				// Create new session
				const session: Session = {
					id: `mock-session-${Date.now()}-${Math.random()}`,
					crawlJobId: "mock-job",
					venueId: "mock-venue",
					facilityCode: sessionData.faCode,
					facilityTypeName: sessionData.facilityName,
					facilityTypeNameEn: sessionData.facilityName,
					facilityTypeNameTc: null,
					facilityTypeNameSc: null,
					facilityVRId: "mock-vrid",
					date: new Date(sessionData.playDate),
					startTime: sessionData.startTime,
					endTime: sessionData.endTime,
					timePeriod: "MORNING",
					available: sessionData.availableSessions > 0,
					isPeakHour: false,
					isOpen: true,
					createdAt: new Date(),
				};
				this.sessions.set(key, session);
			}
		}
	}

	async findSessionsByDateAndFacility(
		date: string,
		facilityCode: string,
	): Promise<Session[]> {
		return Array.from(this.sessions.values()).filter(
			(s) =>
				s.date.toISOString().split("T")[0] === date &&
				s.facilityCode === facilityCode,
		);
	}

	async deleteSessionsByDate(date: string): Promise<void> {
		for (const [key, session] of this.sessions.entries()) {
			if (session.date.toISOString().split("T")[0] === date) {
				this.sessions.delete(key);
			}
		}
	}

	async countSessions(): Promise<number> {
		return this.sessions.size;
	}

	/**
	 * Helper method for testing: Clear all sessions
	 */
	clear(): void {
		this.sessions.clear();
	}
}

// ============================================================
// Mock Checkpoint Repository
// ============================================================

/**
 * In-memory implementation of ICheckpointRepository for testing
 */
export class MockCheckpointRepository implements ICheckpointRepository {
	private runs: Map<string, ScheduledCrawlRun> = new Map();

	async createRun(params: CreateRunParams): Promise<ScheduledCrawlRun> {
		const run: ScheduledCrawlRun = {
			id: `mock-run-${Date.now()}-${Math.random()}`,
			daysToProcess: params.daysToProcess,
			totalDays: params.totalDays,
			completedDays: [],
			status: params.status,
			startedAt: new Date(),
			completedAt: null,
			failedDays: null,
			currentDay: null,
			lastActivityAt: new Date(),
		};

		this.runs.set(run.id, run);
		return run;
	}

	async markDayCompleted(
		runId: string,
		day: string,
		_jobId: string,
	): Promise<void> {
		const run = this.runs.get(runId);
		if (!run) {
			throw new Error(`Run ${runId} not found`);
		}

		if (!run.completedDays.includes(day)) {
			run.completedDays.push(day);
		}

		run.lastActivityAt = new Date();
	}

	async getIncompleteRun(
		staleThresholdMinutes: number,
	): Promise<ScheduledCrawlRun | null> {
		const staleThreshold = new Date();
		staleThreshold.setMinutes(
			staleThreshold.getMinutes() - staleThresholdMinutes,
		);

		const incompleteRuns = Array.from(this.runs.values()).filter(
			(run) => run.status === "RUNNING" && run.lastActivityAt < staleThreshold,
		);

		// Return oldest incomplete run
		return (
			incompleteRuns.sort(
				(a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
			)[0] || null
		);
	}

	async getRemainingDays(runId: string): Promise<string[]> {
		const run = this.runs.get(runId);
		if (!run) {
			return [];
		}

		return run.daysToProcess.filter(
			(day: string) => !run.completedDays.includes(day),
		);
	}

	async markRunCompleted(runId: string): Promise<void> {
		const run = this.runs.get(runId);
		if (!run) {
			throw new Error(`Run ${runId} not found`);
		}

		run.status = JobStatus.COMPLETED;
		run.completedAt = new Date();
		run.lastActivityAt = new Date();
	}

	async deleteOldRuns(olderThanDays: number): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		let deletedCount = 0;

		for (const [key, run] of this.runs.entries()) {
			if (
				run.status === "COMPLETED" &&
				run.completedAt &&
				run.completedAt < cutoffDate
			) {
				this.runs.delete(key);
				deletedCount++;
			}
		}

		return deletedCount;
	}

	async findRunById(runId: string): Promise<ScheduledCrawlRun | null> {
		return this.runs.get(runId) || null;
	}

	/**
	 * Helper method for testing: Clear all runs
	 */
	clear(): void {
		this.runs.clear();
	}

	/**
	 * Helper method for testing: Get total run count
	 */
	count(): number {
		return this.runs.size;
	}
}

// ============================================================
// Mock Repository Factory
// ============================================================

/**
 * Mock Repository Factory for testing
 *
 * Creates and caches mock repository instances.
 */
export class MockRepositoryFactory implements IRepositoryFactory {
	private crawlJobRepo: ICrawlJobRepository | null = null;
	private sessionRepo: ISessionRepository | null = null;
	private checkpointRepo: ICheckpointRepository | null = null;

	getCrawlJobRepository(): ICrawlJobRepository {
		if (!this.crawlJobRepo) {
			this.crawlJobRepo = new MockCrawlJobRepository();
		}
		return this.crawlJobRepo;
	}

	getSessionRepository(): ISessionRepository {
		if (!this.sessionRepo) {
			this.sessionRepo = new MockSessionRepository();
		}
		return this.sessionRepo;
	}

	getCheckpointRepository(): ICheckpointRepository {
		if (!this.checkpointRepo) {
			this.checkpointRepo = new MockCheckpointRepository();
		}
		return this.checkpointRepo;
	}
}
