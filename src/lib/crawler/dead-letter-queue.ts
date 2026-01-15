/**
 * Dead Letter Queue Service
 *
 * Tracks and manages facility crawling failures with persistent storage,
 * intelligent retry mechanisms, and operational visibility.
 */

import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { DLQStatus } from "@/generated/prisma/enums";
import { crawlerLogger } from "@/lib/logger";

/**
 * Type guard for errors with HTTP status codes
 */
interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

function isErrorWithStatusCode(error: Error): error is ErrorWithStatusCode {
	return (
		"statusCode" in error &&
		typeof (error as ErrorWithStatusCode).statusCode === "number"
	);
}

// Local DLQStatus removed in favor of Prisma generated one

export interface DeadLetterEntry {
	id: string;
	faCode: string;
	date: Date;
	distCode: string;
	error: string;
	errorType?: string;
	statusCode?: number;
	attempts: number;
	maxAttempts: number;
	firstFailedAt: Date;
	lastFailedAt: Date;
	nextRetryAt?: Date | null;
	resolvedAt?: Date | null;
	status: DLQStatus;
	jobId?: string | null;
	metadata?: Record<string, unknown>;
}

export interface DLQAddFailureParams {
	faCode: string;
	date: string;
	distCode: string;
	error: Error;
	errorType?: string;
	maxAttempts?: number;
	statusCode?: number;
	jobId?: string;
	metadata?: Record<string, unknown>;
}

export interface FailedFacility {
	faCode: string;
	date: string;
	distCode: string;
	attempts: number;
	lastError: string;
	canRetry: boolean;
	nextRetryAt?: Date;
}

/**
 * Error type classification for intelligent retry policies
 */
export enum ErrorType {
	TIMEOUT = "TIMEOUT",
	CONNECTION_ERROR = "CONNECTION_ERROR",
	SERVER_ERROR = "SERVER_ERROR",
	NOT_FOUND = "NOT_FOUND",
	CLIENT_ERROR = "CLIENT_ERROR",
	PARSE_ERROR = "PARSE_ERROR",
	UNKNOWN = "UNKNOWN",
}

/**
 * Retry policy configuration per error type
 */
interface RetryPolicy {
	shouldRetry: boolean;
	maxAttempts: number;
	backoffMs: number;
}

const RETRY_POLICIES: Record<ErrorType, RetryPolicy> = {
	[ErrorType.TIMEOUT]: { shouldRetry: true, maxAttempts: 3, backoffMs: 120000 }, // 2 min
	[ErrorType.CONNECTION_ERROR]: {
		shouldRetry: true,
		maxAttempts: 5,
		backoffMs: 180000,
	}, // 3 min
	[ErrorType.SERVER_ERROR]: {
		shouldRetry: true,
		maxAttempts: 3,
		backoffMs: 300000,
	}, // 5 min
	[ErrorType.NOT_FOUND]: { shouldRetry: false, maxAttempts: 1, backoffMs: 0 },
	[ErrorType.CLIENT_ERROR]: {
		shouldRetry: false,
		maxAttempts: 1,
		backoffMs: 0,
	},
	[ErrorType.PARSE_ERROR]: {
		shouldRetry: true,
		maxAttempts: 3,
		backoffMs: 60000,
	}, // 1 min
	[ErrorType.UNKNOWN]: { shouldRetry: true, maxAttempts: 2, backoffMs: 60000 }, // 1 min
};

/**
 * Calculate next retry time with exponential backoff and jitter
 *
 * @param attempt - Current attempt number (1-indexed)
 * @returns Date when next retry should occur
 */
function calculateNextRetry(attempt: number): Date {
	// Exponential backoff: 2^n minutes
	const baseDelay = 2 ** attempt; // 2, 4, 8, 16, 32 minutes
	const jitter = Math.random() * 60 * 1000; // Add 0-60s jitter to prevent thundering herd

	return new Date(Date.now() + baseDelay * 60 * 1000 + jitter);
}

/**
 * Classify error from Error object into ErrorType
 *
 * @param error - Error object from failed operation
 * @returns ErrorType enum value
 */
export function classifyError(error: Error): ErrorType {
	if (error.name === "AbortError" || error.name === "TimeoutError") {
		return ErrorType.TIMEOUT;
	}

	// Check for HTTP status codes
	if (isErrorWithStatusCode(error)) {
		const statusCode = error.statusCode;
		if (statusCode >= 500) return ErrorType.SERVER_ERROR;
		if (statusCode === 404) return ErrorType.NOT_FOUND;
		if (statusCode >= 400) return ErrorType.CLIENT_ERROR;
	}

	// Check for connection errors
	if (
		error.message.includes("ECONNREFUSED") ||
		error.message.includes("ENOTFOUND") ||
		error.message.includes("ECONNRESET")
	) {
		return ErrorType.CONNECTION_ERROR;
	}

	// Check for parse errors
	if (
		error.message.includes("JSON") ||
		error.message.includes("parse") ||
		error.message.includes("invalid")
	) {
		return ErrorType.PARSE_ERROR;
	}

	return ErrorType.UNKNOWN;
}

/**
 * Get retry policy for an error type
 *
 * @param errorType - ErrorType enum value
 * @returns RetryPolicy configuration
 */
export function getRetryPolicy(errorType: ErrorType): RetryPolicy {
	return RETRY_POLICIES[errorType] || RETRY_POLICIES.UNKNOWN;
}

/**
 * Dead Letter Queue Service
 *
 * Manages failed facility crawl operations with persistent tracking,
 * intelligent retry scheduling, and operational visibility.
 */
export class DeadLetterQueue {
	/**
	 * Add or update a failed facility entry
	 *
	 * Creates new entry if first failure, otherwise increments attempts
	 * and updates timestamp. Sets status to PERMANENT if max attempts reached.
	 *
	 * @param params - Failure details
	 * @returns Created or updated DeadLetterEntry
	 */
	async addFailure(params: DLQAddFailureParams): Promise<DeadLetterEntry> {
		const { faCode, date, distCode, error, jobId, metadata } = params;
		const errorType = params.errorType || classifyError(error);
		const statusCode =
			params.statusCode ||
			(isErrorWithStatusCode(error) ? error.statusCode : undefined);

		// Check for existing entry
		const existing = await prisma.deadLetterEntry.findUnique({
			where: {
				faCode_date_distCode: {
					faCode,
					date: new Date(date),
					distCode,
				},
			},
		});

		if (existing) {
			// Update existing entry
			const newAttempts = existing.attempts + 1;
			const retryPolicy = getRetryPolicy(errorType as ErrorType);
			const maxAttempts = params.maxAttempts || retryPolicy.maxAttempts;

			let nextRetryAt: Date | undefined;
			let newStatus: DLQStatus = existing.status;

			if (newAttempts >= maxAttempts || !retryPolicy.shouldRetry) {
				// Mark as permanent if max attempts reached or no retry
				newStatus = DLQStatus.PERMANENT;
				crawlerLogger.error(
					{
						faCode,
						date,
						distCode,
						attempts: newAttempts,
						maxAttempts,
						errorType,
					},
					"Facility marked as permanent failure",
				);
			} else {
				// Calculate next retry time
				nextRetryAt = calculateNextRetry(newAttempts);
				newStatus = DLQStatus.PENDING;
			}

			const updated = await prisma.deadLetterEntry.update({
				where: { id: existing.id },
				data: {
					attempts: newAttempts,
					lastFailedAt: new Date(),
					error: error.message,
					errorType,
					statusCode,
					nextRetryAt,
					status: newStatus,
					metadata: (metadata
						? {
								...(typeof existing.metadata === "object" &&
								existing.metadata !== null
									? (existing.metadata as Record<string, unknown>)
									: {}),
								...metadata,
							}
						: existing.metadata || undefined) as Prisma.InputJsonValue,
				},
			});

			crawlerLogger.warn(
				{
					entryId: updated.id,
					faCode,
					date,
					distCode,
					attempts: newAttempts,
					errorType,
					status: newStatus,
				},
				"Facility added to DLQ (updated)",
			);

			return updated as DeadLetterEntry;
		} else {
			// Create new entry
			const retryPolicy = getRetryPolicy(errorType as ErrorType);
			const maxAttempts = params.maxAttempts || retryPolicy.maxAttempts;

			let nextRetryAt: Date | undefined;
			let status: DLQStatus = DLQStatus.PENDING;

			if (!retryPolicy.shouldRetry) {
				// No retry for this error type (e.g., 404)
				status = DLQStatus.PERMANENT;
			} else {
				nextRetryAt = calculateNextRetry(1);
			}

			const created = await prisma.deadLetterEntry.create({
				data: {
					faCode,
					date: new Date(date),
					distCode,
					error: error.message,
					errorType,
					statusCode,
					attempts: 1,
					maxAttempts,
					nextRetryAt,
					status,
					jobId,
					metadata: metadata as Prisma.InputJsonValue,
				},
			});

			crawlerLogger.warn(
				{
					entryId: created.id,
					faCode,
					date,
					distCode,
					errorType,
					status,
				},
				"Facility added to DLQ (new entry)",
			);

			return created as DeadLetterEntry;
		}
	}

	/**
	 * Get all failures for a specific date
	 *
	 * @param date - Date string (YYYY-MM-DD)
	 * @param status - Optional filter by DLQStatus
	 * @returns Array of DeadLetterEntry
	 */
	async getFailures(
		date: string,
		status?: DLQStatus,
	): Promise<DeadLetterEntry[]> {
		const where: { date: Date; status?: DLQStatus } = { date: new Date(date) };
		if (status) {
			where.status = status;
		}

		const entries = await prisma.deadLetterEntry.findMany({
			where,
			orderBy: { attempts: "desc" },
		});

		return entries as DeadLetterEntry[];
	}

	/**
	 * Get failures ready for retry (nextRetryAt <= now)
	 *
	 * @param limit - Maximum number of entries to return
	 * @returns Array of retryable DeadLetterEntry
	 */
	async getRetryableFailures(limit: number = 10): Promise<DeadLetterEntry[]> {
		const entries = await prisma.deadLetterEntry.findMany({
			where: {
				status: DLQStatus.PENDING,
				nextRetryAt: { lte: new Date() },
			},
			orderBy: { nextRetryAt: "asc" },
			take: limit,
		});

		return entries as DeadLetterEntry[];
	}

	/**
	 * Mark a failure as resolved (after successful crawl)
	 *
	 * Sets status to RESOLVED and records resolvedAt timestamp.
	 *
	 * @param faCode - Facility code
	 * @param date - Date string (YYYY-MM-DD)
	 * @param distCode - District code
	 */
	async markResolved(
		faCode: string,
		date: string,
		distCode: string,
	): Promise<void> {
		const existing = await prisma.deadLetterEntry.findUnique({
			where: {
				faCode_date_distCode: {
					faCode,
					date: new Date(date),
					distCode,
				},
			},
		});

		if (existing) {
			await prisma.deadLetterEntry.update({
				where: { id: existing.id },
				data: {
					status: DLQStatus.RESOLVED,
					resolvedAt: new Date(),
				},
			});

			crawlerLogger.info(
				{
					entryId: existing.id,
					faCode,
					date,
					distCode,
					attempts: existing.attempts,
				},
				"Facility marked as resolved",
			);
		}
	}

	/**
	 * Get failed facilities formatted for retry UI
	 *
	 * @param date - Optional date filter (YYYY-MM-DD)
	 * @param limit - Maximum number of entries to return
	 * @returns Array of FailedFacility
	 */
	async getFailedFacilitiesForRetry(
		date?: string,
		limit: number = 50,
	): Promise<FailedFacility[]> {
		const where: {
			status?: { in: DLQStatus[] };
			date?: Date;
		} = {
			status: { in: [DLQStatus.PENDING, DLQStatus.RETRYING] },
		};
		if (date) {
			where.date = new Date(date);
		}

		const entries = await prisma.deadLetterEntry.findMany({
			where,
			orderBy: { lastFailedAt: "desc" },
			take: limit,
		});

		return entries.map((entry) => ({
			faCode: entry.faCode,
			date: entry.date.toISOString().split("T")[0],
			distCode: entry.distCode,
			attempts: entry.attempts,
			lastError: entry.error,
			canRetry:
				entry.attempts < entry.maxAttempts &&
				entry.status !== DLQStatus.PERMANENT,
			nextRetryAt: entry.nextRetryAt || undefined,
		}));
	}

	/**
	 * Get permanent failures (max attempts exceeded)
	 *
	 * @param limit - Maximum number of entries to return
	 * @returns Array of DeadLetterEntry with PERMANENT status
	 */
	async getPermanentFailures(limit: number = 50): Promise<DeadLetterEntry[]> {
		const entries = await prisma.deadLetterEntry.findMany({
			where: { status: DLQStatus.PERMANENT },
			orderBy: { lastFailedAt: "desc" },
			take: limit,
		});

		return entries as DeadLetterEntry[];
	}

	/**
	 * Delete old resolved entries (cleanup job)
	 *
	 * @param olderThanDays - Delete entries resolved more than this many days ago
	 * @returns Number of entries deleted
	 */
	async cleanupResolvedEntries(olderThanDays: number = 7): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		const result = await prisma.deadLetterEntry.deleteMany({
			where: {
				status: DLQStatus.RESOLVED,
				resolvedAt: { lt: cutoffDate },
			},
		});

		crawlerLogger.info(
			{
				deletedCount: result.count,
				olderThanDays,
				cutoffDate,
			},
			"DLQ cleanup completed",
		);

		return result.count;
	}

	/**
	 * Reset a permanent failure to PENDING (manual intervention)
	 *
	 * Allows operators to retry after fixing issues.
	 *
	 * @param entryId - ID of entry to reset
	 * @returns Updated DeadLetterEntry
	 */
	async resetToPending(entryId: string): Promise<DeadLetterEntry> {
		const updated = await prisma.deadLetterEntry.update({
			where: { id: entryId },
			data: {
				status: DLQStatus.PENDING,
				attempts: 0,
				nextRetryAt: new Date(), // Retry immediately
				resolvedAt: null,
			},
		});

		crawlerLogger.info(
			{
				entryId,
				faCode: updated.faCode,
				date: updated.date,
				distCode: updated.distCode,
			},
			"DLQ entry reset to PENDING",
		);

		return updated as DeadLetterEntry;
	}

	/**
	 * Update status of a DLQ entry
	 *
	 * @param entryId - ID of entry to update
	 * @param status - New status
	 */
	async updateStatus(entryId: string, status: DLQStatus): Promise<void> {
		await prisma.deadLetterEntry.update({
			where: { id: entryId },
			data: { status },
		});
	}

	/**
	 * Get DLQ metrics for dashboard
	 *
	 * @returns Object with DLQ statistics
	 */
	async getMetrics(): Promise<{
		totalEntries: number;
		pendingCount: number;
		retryingCount: number;
		resolvedCount: number;
		permanentCount: number;
		byErrorType: Record<string, number>;
		byFacility: Record<string, number>;
	}> {
		const [
			total,
			pending,
			retrying,
			resolved,
			permanent,
			byErrorType,
			byFacility,
		] = await Promise.all([
			prisma.deadLetterEntry.count(),
			prisma.deadLetterEntry.count({ where: { status: DLQStatus.PENDING } }),
			prisma.deadLetterEntry.count({ where: { status: DLQStatus.RETRYING } }),
			prisma.deadLetterEntry.count({ where: { status: DLQStatus.RESOLVED } }),
			prisma.deadLetterEntry.count({ where: { status: DLQStatus.PERMANENT } }),
			prisma.deadLetterEntry.groupBy({
				by: ["errorType"],
				_count: true,
			}),
			prisma.deadLetterEntry.groupBy({
				by: ["faCode"],
				_count: true,
				orderBy: { _count: { faCode: "desc" } },
				take: 10,
			}),
		]);

		return {
			totalEntries: total,
			pendingCount: pending,
			retryingCount: retrying,
			resolvedCount: resolved,
			permanentCount: permanent,
			byErrorType: Object.fromEntries(
				byErrorType.map((item) => [item.errorType || "UNKNOWN", item._count]),
			),
			byFacility: Object.fromEntries(
				byFacility.map((item) => [item.faCode, item._count]),
			),
		};
	}
}
