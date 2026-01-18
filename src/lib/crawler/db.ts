/**
 * Crawler Database Service
 *
 * Business logic layer for database operations.
 * Uses repository pattern for testability and flexibility.
 *
 * This service provides backward compatibility while transitioning
 * to direct repository usage. New code should use repositories directly.
 */

import { formatDateToYYYYMMDD } from "@/lib/server-utils/formatting";
import { prisma } from "../../db";
import { type CrawlJob, Prisma } from "../../generated/prisma/client";
import type {
	ICrawlJobRepository,
	ISessionRepository,
} from "./repositories/interfaces";
import { PrismaRepositoryFactory } from "./repositories/prisma-repository";
import { calculateAndUpsertStats } from "./stats-calculator";
import type {
	DistrictInsert,
	FacilityInsert,
	FacilityTypeInsert,
	SessionInsert,
} from "./types";

export class CrawlerDatabaseService {
	private crawlJobRepo: ICrawlJobRepository;

	constructor(
		crawlJobRepo?: ICrawlJobRepository,
		sessionRepo?: ISessionRepository,
	) {
		const factory = new PrismaRepositoryFactory();
		this.crawlJobRepo = crawlJobRepo || factory.getCrawlJobRepository();
		sessionRepo || factory.getSessionRepository(); // Initialize if provided
	}

	/**
	 * Create a new crawl job record
	 */
	async createJob(params: {
		distCode: string[];
		faCode: string[];
		playDate: string;
	}): Promise<CrawlJob> {
		return this.crawlJobRepo.createJob({
			faCodes: params.faCode,
			playDate: params.playDate,
			distCode: params.distCode,
			status: "RUNNING",
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
		await prisma.crawlResult.create({
			data: {
				crawlJobId: jobId,
				venueCount: stats.venueCount,
				sessionCount: stats.sessionCount,
				rawData: (stats.rawData as Prisma.InputJsonValue) ?? {},
			},
		});

		return this.crawlJobRepo.completeJob(jobId, {
			totalFacilities: stats.venueCount,
			successCount: stats.venueCount,
			failureCount: 0,
		});
	}

	/**
	 * Mark job as failed
	 */
	async failJob(jobId: string, error: Error): Promise<CrawlJob> {
		return this.crawlJobRepo.failJob(jobId, error);
	}

	/**
	 * Save facilities and sessions to database
	 * Uses optimized bulk operations and transaction management
	 */
	async saveResults(data: {
		facilities: FacilityInsert[];
		sessions: SessionInsert[];
		districts: DistrictInsert[];
		facilityTypes: FacilityTypeInsert[];
	}): Promise<void> {
		const { facilities, sessions, districts, facilityTypes } = data;

		// Phase 0: Upsert meta-entities (Districts, FacilityTypes)
		await prisma.$transaction(
			async (tx) => {
				await this.bulkUpsertDistricts(tx, districts);
				await this.bulkUpsertFacilityTypes(tx, facilityTypes);
			},
			{ timeout: 30000 },
		);

		// Phase 1: Upsert facilities (smaller transaction)
		// We use a shorter timeout since this should be fast
		await prisma.$transaction(
			async (tx) => {
				await this.bulkUpsertFacilities(tx, facilities);
			},
			{ timeout: 30000 },
		);

		// Phase 2: Upsert sessions in chunks (separate transactions to avoid long-running locks)
		const SESSION_CHUNK = 2000;
		for (let i = 0; i < sessions.length; i += SESSION_CHUNK) {
			const chunk = sessions.slice(i, i + SESSION_CHUNK);
			// Each chunk gets its own transaction
			await prisma.$transaction(
				async (tx) => {
					await this.bulkUpsertSessions(tx, chunk, 1000);
				},
				{ timeout: 60000 }, // 60s per chunk
			);
		}

		// Phase 3: Update pre-computed availability stats
		// We can do this asynchronously/background or await it depending on criticality
		// Since UI depends on it, we should await it
		if (sessions.length > 0) {
			// Fix: Format dates to strings BEFORE Set deduplication (Set compares Date objects by reference)
			const uniqueDateStrings = [
				...new Set(sessions.map((s) => formatDateToYYYYMMDD(s.date))),
			];
			// Process stats for all affected dates in a single batch call
			try {
				await calculateAndUpsertStats(uniqueDateStrings);
			} catch (error) {
				console.error("Failed to update stats:", error);
				// Recoverable error, don't fail the whole job
			}
		}
	}

	/**
	 * Bulk upsert facilities using raw SQL
	 */
	private async bulkUpsertFacilities(
		tx: Prisma.TransactionClient,
		facilities: FacilityInsert[],
	): Promise<void> {
		if (facilities.length === 0) return;

		const values = facilities.map((f) => ({
			id: f.id,
			name: f.name,
			nameEn: f.nameEn || null,
			nameTc: f.nameTc || null,
			nameSc: f.nameSc || null,
			imageUrl: f.imageUrl,
			districtCode: f.districtCode,
			districtName: f.districtName,
			districtNameEn: f.districtNameEn || null,
			districtNameTc: f.districtNameTc || null,
			districtNameSc: f.districtNameSc || null,
			lastCrawlAt: f.lastCrawlAt,
		}));

		// Use Prisma.join/sql for safety
		await tx.$executeRaw`
			INSERT INTO "Facility" ("id", "name", "nameEn", "nameTc", "nameSc", "imageUrl", "districtCode", "districtName", "districtNameEn", "districtNameTc", "districtNameSc", "lastCrawlAt")
			SELECT * FROM ${Prisma.sql`(VALUES ${Prisma.join(
				values.map(
					(v) =>
						Prisma.sql`(${v.id}, ${v.name}, ${v.nameEn}, ${v.nameTc}, ${v.nameSc}, ${v.imageUrl}, ${v.districtCode}, ${v.districtName}, ${v.districtNameEn}, ${v.districtNameTc}, ${v.districtNameSc}, ${v.lastCrawlAt}::timestamp)`,
				),
			)})`} AS t("id", "name", "nameEn", "nameTc", "nameSc", "imageUrl", "districtCode", "districtName", "districtNameEn", "districtNameTc", "districtNameSc", "lastCrawlAt")
			ON CONFLICT ("id") DO UPDATE SET
				"name" = CASE WHEN EXCLUDED."name" ~ '[\\u4e00-\\u9fff]' THEN EXCLUDED."name" ELSE "Facility"."name" END,
				"nameEn" = COALESCE(EXCLUDED."nameEn", "Facility"."nameEn"),
				"nameTc" = COALESCE(EXCLUDED."nameTc", "Facility"."nameTc"),
				"nameSc" = COALESCE(EXCLUDED."nameSc", "Facility"."nameSc"),
				"imageUrl" = EXCLUDED."imageUrl",
				"districtName" = CASE WHEN EXCLUDED."districtName" ~ '[\\u4e00-\\u9fff]' THEN EXCLUDED."districtName" ELSE "Facility"."districtName" END,
				"districtNameEn" = COALESCE(EXCLUDED."districtNameEn", "Facility"."districtNameEn"),
				"districtNameTc" = COALESCE(EXCLUDED."districtNameTc", "Facility"."districtNameTc"),
				"districtNameSc" = COALESCE(EXCLUDED."districtNameSc", "Facility"."districtNameSc"),
				"lastCrawlAt" = EXCLUDED."lastCrawlAt"
		`;
	}

	/**
	 * Bulk upsert sessions using raw SQL in logical sub-chunks
	 */
	private async bulkUpsertSessions(
		tx: Prisma.TransactionClient,
		sessions: SessionInsert[],
		chunkSize: number = 1000,
	): Promise<void> {
		for (let i = 0; i < sessions.length; i += chunkSize) {
			const chunk = sessions.slice(i, i + chunkSize);
			await this.insertSessionChunk(tx, chunk);
		}
	}

	/**
	 * Insert a single chunk of sessions using bulk raw SQL
	 * Uses VALUES clause + ON CONFLICT for efficient upsert
	 */
	private async insertSessionChunk(
		tx: Prisma.TransactionClient,
		sessions: SessionInsert[],
	): Promise<void> {
		if (sessions.length === 0) return;

		const values = sessions.map((s) => ({
			id: s.id,
			crawlJobId: s.crawlJobId,
			venueId: s.venueId,
			facilityCode: s.facilityCode,
			facilityTypeName: s.facilityTypeName,
			facilityTypeNameEn: s.facilityTypeNameEn,
			facilityTypeNameTc: s.facilityTypeNameTc || null,
			facilityTypeNameSc: s.facilityTypeNameSc || null,
			facilityVRId: s.facilityVRId,
			date: s.date,
			startTime: s.startTime,
			endTime: s.endTime,
			timePeriod: s.timePeriod,
			available: s.available,
			isPeakHour: s.isPeakHour,
			isOpen: s.isOpen,
			createdAt: s.createdAt,
		}));

		await tx.$executeRaw`
			INSERT INTO "Session" (
				"id", "crawlJobId", "venueId", "facilityCode",
				"facilityTypeName", "facilityTypeNameEn", "facilityTypeNameTc", "facilityTypeNameSc",
				"facilityVRId", "date", "startTime", "endTime",
				"timePeriod", "available", "isPeakHour", "isOpen", "createdAt"
			)
			SELECT * FROM ${Prisma.sql`(VALUES ${Prisma.join(
				values.map(
					(v) =>
						Prisma.sql`(
							${v.id}, ${v.crawlJobId}, ${v.venueId}, ${v.facilityCode},
							${v.facilityTypeName}, ${v.facilityTypeNameEn}, ${v.facilityTypeNameTc}, ${v.facilityTypeNameSc},
							${v.facilityVRId}, ${v.date}::timestamp, ${v.startTime}, ${v.endTime},
							${v.timePeriod}::"TimePeriod", ${v.available}::boolean, ${v.isPeakHour}::boolean, ${v.isOpen}::boolean, ${v.createdAt}::timestamp
						)`,
				),
			)})`} AS t(
				"id", "crawlJobId", "venueId", "facilityCode",
				"facilityTypeName", "facilityTypeNameEn", "facilityTypeNameTc", "facilityTypeNameSc",
				"facilityVRId", "date", "startTime", "endTime",
				"timePeriod", "available", "isPeakHour", "isOpen", "createdAt"
			)
			ON CONFLICT ("venueId", "facilityCode", "date", "startTime") DO UPDATE SET
				"id" = EXCLUDED."id",
				"crawlJobId" = EXCLUDED."crawlJobId",
				"facilityTypeName" = EXCLUDED."facilityTypeName",
				"facilityTypeNameEn" = EXCLUDED."facilityTypeNameEn",
				"facilityTypeNameTc" = COALESCE(EXCLUDED."facilityTypeNameTc", "Session"."facilityTypeNameTc"),
				"facilityTypeNameSc" = COALESCE(EXCLUDED."facilityTypeNameSc", "Session"."facilityTypeNameSc"),
				"available" = EXCLUDED."available",
				"isPeakHour" = EXCLUDED."isPeakHour",
				"isOpen" = EXCLUDED."isOpen"
		`;
	}

	/**
	 * Bulk upsert districts
	 */
	private async bulkUpsertDistricts(
		tx: Prisma.TransactionClient,
		districts: DistrictInsert[],
	): Promise<void> {
		if (districts.length === 0) return;

		const values = districts.map((d) => ({
			code: d.code,
			name: d.name,
			nameEn: d.nameEn || null,
			nameTc: d.nameTc || null,
			nameSc: d.nameSc || null,
			region: d.region || null,
		}));

		await tx.$executeRaw`
			INSERT INTO "District" ("code", "name", "nameEn", "nameTc", "nameSc", "region", "updatedAt")
			SELECT * FROM ${Prisma.sql`(VALUES ${Prisma.join(
				values.map(
					(v) =>
						Prisma.sql`(${v.code}, ${v.name}, ${v.nameEn}, ${v.nameTc}, ${v.nameSc}, ${v.region}, NOW())`,
				),
			)})`} AS t("code", "name", "nameEn", "nameTc", "nameSc", "region", "updatedAt")
			ON CONFLICT ("code") DO UPDATE SET
				"name" = CASE WHEN EXCLUDED."name" ~ '[\\u4e00-\\u9fff]' THEN EXCLUDED."name" ELSE "District"."name" END,
				"nameEn" = COALESCE(EXCLUDED."nameEn", "District"."nameEn"),
				"nameTc" = COALESCE(EXCLUDED."nameTc", "District"."nameTc"),
				"nameSc" = COALESCE(EXCLUDED."nameSc", "District"."nameSc"),
				"region" = EXCLUDED."region",
				"updatedAt" = NOW()
		`;
	}

	/**
	 * Bulk upsert facility types
	 */
	private async bulkUpsertFacilityTypes(
		tx: Prisma.TransactionClient,
		types: FacilityTypeInsert[],
	): Promise<void> {
		if (types.length === 0) return;

		const values = types.map((t) => ({
			code: t.code,
			name: t.name,
			nameEn: t.nameEn || null,
			nameTc: t.nameTc || null,
			nameSc: t.nameSc || null,
		}));

		await tx.$executeRaw`
			INSERT INTO "FacilityType" ("code", "name", "nameEn", "nameTc", "nameSc", "updatedAt")
			SELECT "code", "name", "nameEn", "nameTc", "nameSc", "updatedAt"::timestamp FROM ${Prisma.sql`(VALUES ${Prisma.join(
				values.map(
					(v) =>
						Prisma.sql`(${v.code}, ${v.name}, ${v.nameEn}, ${v.nameTc}, ${v.nameSc}, NOW())`,
				),
			)})`} AS t("code", "name", "nameEn", "nameTc", "nameSc", "updatedAt")
			ON CONFLICT ("code") DO UPDATE SET
				"name" = CASE WHEN EXCLUDED."name" ~ '[\\u4e00-\\u9fff]' THEN EXCLUDED."name" ELSE "FacilityType"."name" END,
				"nameEn" = COALESCE(EXCLUDED."nameEn", "FacilityType"."nameEn"),
				"nameTc" = COALESCE(EXCLUDED."nameTc", "FacilityType"."nameTc"),
				"nameSc" = COALESCE(EXCLUDED."nameSc", "FacilityType"."nameSc"),
				"updatedAt" = NOW()
		`;
	}
}
