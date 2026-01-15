/**
 * Repository Interfaces for Crawler Data Access Layer
 *
 * These interfaces define the contract between the business logic and data access layers.
 * Using dependency injection with these interfaces allows for:
 * - Easy testing with mock implementations
 * - Swapping data access implementations (Prisma → TypeORM → Drizzle)
 * - Clear separation of concerns
 */

import type {
	CrawlJob,
	JobStatus,
	ScheduledCrawlRun,
	Session,
} from "@/generated/prisma/client";

// ============================================================
// Types for Repository Operations
// ============================================================

export type CreateJobParams = {
	faCodes: string[];
	playDate: string;
	distCode: string[];
	status: JobStatus;
};

export type JobStats = {
	totalFacilities: number;
	successCount: number;
	failureCount: number;
};

export type CrawlJobSummary = {
	id: string;
	faCodes: string[];
	playDate: string;
	distCode: string[];
	status: JobStatus;
	startedAt: Date;
	completedAt: Date | null;
	totalFacilities: number | null;
	successCount: number | null;
	failureCount: number | null;
	error: string | null;
};

export type SessionInsert = {
	faCode: string;
	playDate: string;
	distCode: string;
	venueName: string;
	facilityName: string;
	sessionId?: string;
	startTime: string;
	endTime: string;
	availableSessions: number;
	totalSessions: number;
	priceType: string;
	updatedAt: Date;
	// Additional fields for Prisma upsert
	venueId?: string;
	facilityTypeName?: string;
	facilityTypeNameEn?: string;
	facilityTypeNameTc?: string;
	facilityTypeNameSc?: string;
	facilityVRId?: string;
	timePeriod?: string;
	isPeakHour?: boolean;
	crawlJobId?: string;
};

export type CreateRunParams = {
	daysToProcess: string[];
	totalDays: number;
	status: JobStatus;
};

export type UpdateJobResult = {
	jobId: string;
	runId: string;
	day: string;
	totalFacilities: number;
	successCount: number;
	failureCount: number;
};

// ============================================================
// Repository Interfaces
// ============================================================

/**
 * Crawl Job Repository Interface
 *
 * Manages CRUD operations for crawl jobs.
 */
export interface ICrawlJobRepository {
	/**
	 * Create a new crawl job
	 * @param params Job creation parameters
	 * @returns Created job record
	 */
	createJob(params: CreateJobParams): Promise<CrawlJob>;

	/**
	 * Mark a job as completed with statistics
	 * @param jobId Job ID
	 * @param stats Job completion statistics
	 * @returns Updated job record
	 */
	completeJob(jobId: string, stats: JobStats): Promise<CrawlJob>;

	/**
	 * Mark a job as failed
	 * @param jobId Job ID
	 * @param error Error that caused failure
	 * @returns Updated job record
	 */
	failJob(jobId: string, error: Error): Promise<CrawlJob>;

	/**
	 * Find a job by ID
	 * @param jobId Job ID
	 * @returns Job record or null if not found
	 */
	findJobById(jobId: string): Promise<CrawlJob | null>;

	/**
	 * Get latest jobs with pagination
	 * @param limit Maximum number of jobs to return
	 * @returns Array of job summaries
	 */
	findLatestJobs(limit: number): Promise<CrawlJobSummary[]>;
}

/**
 * Session Repository Interface
 *
 * Manages bulk operations for venue session data.
 */
export interface ISessionRepository {
	/**
	 * Bulk upsert session data
	 * Uses upsert to handle both new and existing sessions.
	 * @param sessions Array of session records to upsert
	 */
	upsertSessions(sessions: SessionInsert[]): Promise<void>;

	/**
	 * Find sessions by date and facility
	 * @param date Play date (YYYY-MM-DD format)
	 * @param facilityCode Facility code (e.g., "BASC")
	 * @returns Array of session records
	 */
	findSessionsByDateAndFacility(
		date: string,
		facilityCode: string,
	): Promise<Session[]>;

	/**
	 * Delete all sessions for a specific date
	 * Used for data cleanup before re-crawling.
	 * @param date Play date (YYYY-MM-DD format)
	 */
	deleteSessionsByDate(date: string): Promise<void>;

	/**
	 * Count total sessions in database
	 * Used for monitoring and statistics.
	 * @returns Total number of session records
	 */
	countSessions(): Promise<number>;
}

/**
 * Checkpoint Repository Interface
 *
 * Manages scheduled crawl run state for recovery.
 */
export interface ICheckpointRepository {
	/**
	 * Create a new scheduled crawl run
	 * @param params Run creation parameters
	 * @returns Created run record
	 */
	createRun(params: CreateRunParams): Promise<ScheduledCrawlRun>;

	/**
	 * Mark a specific day as completed in a run
	 * @param runId Run ID
	 * @param day Date string (YYYY-MM-DD format)
	 * @param jobId Job ID that processed this day
	 */
	markDayCompleted(runId: string, day: string, jobId: string): Promise<void>;

	/**
	 * Get an incomplete run that has become stale
	 * Used for recovery detection.
	 * @param staleThresholdMinutes Minutes since last update before considered stale
	 * @returns Stale run record or null if none found
	 */
	getIncompleteRun(
		staleThresholdMinutes: number,
	): Promise<ScheduledCrawlRun | null>;

	/**
	 * Get remaining days to process for a run
	 * @param runId Run ID
	 * @returns Array of date strings (YYYY-MM-DD format) not yet completed
	 */
	getRemainingDays(runId: string): Promise<string[]>;

	/**
	 * Mark a run as completed
	 * @param runId Run ID
	 */
	markRunCompleted(runId: string): Promise<void>;

	/**
	 * Delete old completed runs
	 * Used for maintenance and cleanup.
	 * @param olderThanDays Delete runs completed more than this many days ago
	 * @returns Number of runs deleted
	 */
	deleteOldRuns(olderThanDays: number): Promise<number>;

	/**
	 * Find a run by ID
	 * @param runId Run ID
	 * @returns Run record or null if not found
	 */
	findRunById(runId: string): Promise<ScheduledCrawlRun | null>;
}

/**
 * Repository Factory Interface
 *
 * Creates repository instances for dependency injection.
 */
export interface IRepositoryFactory {
	/**
	 * Get or create crawl job repository
	 */
	getCrawlJobRepository(): ICrawlJobRepository;

	/**
	 * Get or create session repository
	 */
	getSessionRepository(): ISessionRepository;

	/**
	 * Get or create checkpoint repository
	 */
	getCheckpointRepository(): ICheckpointRepository;
}
