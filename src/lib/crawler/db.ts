import { prisma } from "../../db";
import {
	type CrawlJob,
	JobStatus,
	type Prisma,
	type TimePeriod,
} from "../../generated/prisma/client";
import type { FacilityInsert, SessionInsert } from "./types";

export class CrawlerDatabaseService {
	/**
	 * Create a new crawl job record
	 */
	async createJob(params: {
		distCode: string[];
		faCode: string[];
		playDate: string;
	}): Promise<CrawlJob> {
		return prisma.crawlJob.create({
			data: {
				status: JobStatus.RUNNING,
				distCode: params.distCode.join(","),
				faCode: params.faCode.join(","),
				playDate: params.playDate,
				startedAt: new Date(),
			},
		});
	}

	/**
	 * Mark job as completed with summary statistics
	 */
	async completeJob(
		jobId: string,
		stats: {
			venueCount: number;
			sessionCount: number;
			rawData?: unknown;
		},
	): Promise<CrawlJob> {
		// Create a result record
		await prisma.crawlResult.create({
			data: {
				crawlJobId: jobId,
				venueCount: stats.venueCount,
				sessionCount: stats.sessionCount,
				rawData: (stats.rawData as Prisma.InputJsonValue) ?? {},
			},
		});

		// Update job status
		return prisma.crawlJob.update({
			where: { id: jobId },
			data: {
				status: JobStatus.COMPLETED,
				completedAt: new Date(),
			},
		});
	}

	/**
	 * Mark job as failed
	 */
	async failJob(jobId: string, error: Error): Promise<CrawlJob> {
		return prisma.crawlJob.update({
			where: { id: jobId },
			data: {
				status: JobStatus.FAILED,
				errorMessage: error.message,
				completedAt: new Date(),
			},
		});
	}

	/**
	 * Save facilities and sessions to database
	 * Uses transaction to ensure consistency
	 */
	async saveResults(data: {
		facilities: FacilityInsert[];
		sessions: SessionInsert[];
	}): Promise<void> {
		const { facilities, sessions } = data;

		await prisma.$transaction(
			async (tx) => {
				// 1. Upsert Facilities
				// We do this one by one or we could use createMany with skipDuplicates if we didn't need to update lastCrawlAt
				// Since we want to update lastCrawlAt, we'll use upsert locally or just simple loop
				// For better performance with many facilities, we could optimize, but usually facility count is < 100 per run
				for (const facility of facilities) {
					await tx.facility.upsert({
						where: { id: facility.id },
						create: {
							id: facility.id,
							name: facility.name,
							imageUrl: facility.imageUrl,
							districtCode: facility.districtCode,
							districtName: facility.districtName,
							lastCrawlAt: facility.lastCrawlAt,
						},
						update: {
							name: facility.name,
							imageUrl: facility.imageUrl,
							lastCrawlAt: facility.lastCrawlAt,
						},
					});
				}

				// 2. Upsert Sessions
				// Session ID is deterministic based on unique attributes
				for (const session of sessions) {
					await tx.session.upsert({
						where: { id: session.id },
						create: {
							id: session.id,
							crawlJobId: session.crawlJobId,
							venueId: session.venueId,
							facilityTypeId: session.facilityTypeId,
							facilityTypeName: session.facilityTypeName,
							facilityTypeNameEn: session.facilityTypeNameEn,
							facilityCode: session.facilityCode,
							facilityVRId: session.facilityVRId,
							date: session.date,
							startTime: session.startTime,
							endTime: session.endTime,
							timePeriod: session.timePeriod as TimePeriod,
							available: session.available,
							isPeakHour: session.isPeakHour,
							isOpen: session.isOpen,
							createdAt: session.createdAt,
						},
						update: {
							crawlJobId: session.crawlJobId, // Update to latest job that saw this session
							available: session.available,
							isPeakHour: session.isPeakHour,
							isOpen: session.isOpen,
							// We don't update createdAt
						},
					});
				}
			},
			{
				timeout: 20000, // Increase timeout for large transactions
			},
		);
	}
}
