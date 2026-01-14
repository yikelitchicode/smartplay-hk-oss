import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { CrawlerDataProcessor } from "./data-processor";
import { CrawlerDatabaseService } from "./db";
import { SmartPlayHttpClient } from "./http-client";
import type {
	CrawlerConfig,
	FacilityApiResponse,
	ProcessedFacilityData,
} from "./types";

// Export types for use in other modules
export interface CrawlJobSummary {
	id: string;
	status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
	playDate: string;
	startedAt: Date;
	completedAt: Date | null;
	venueCount: number;
	sessionCount: number;
	errorMessage: string | null;
}

export class CrawlerOrchestrator {
	private httpClient: SmartPlayHttpClient;
	private processor: CrawlerDataProcessor;
	private db: CrawlerDatabaseService;
	private config: CrawlerConfig;

	constructor(config: CrawlerConfig) {
		this.config = config;
		this.httpClient = new SmartPlayHttpClient(config);
		this.processor = new CrawlerDataProcessor();
		this.db = new CrawlerDatabaseService();
	}

	/**
	 * Run a crawl job with specified parameters
	 */
	async runCrawl(
		params?: Partial<CrawlerConfig["parameters"]>,
	): Promise<{ jobId: string; success: boolean; failedCodes: string[] }> {
		// Merge config with runtime params
		const distCode = (params?.distCode || this.config.parameters.distCode).join(
			",",
		);
		const faCodes = params?.faCode || this.config.parameters.faCode;
		const playDate = params?.playDate || this.config.parameters.playDate;

		console.log(
			`Starting crawl for ${faCodes.length} facility codes:`,
			faCodes,
		);

		// 1. Create crawl job record
		const crawlJob = await this.db.createJob({
			distCode: params?.distCode || this.config.parameters.distCode,
			faCode: faCodes,
			playDate,
		});

		console.log(`Created crawl job: ${crawlJob.id}`);

		const failedCodes: string[] = [];
		const allProcessedData: ProcessedFacilityData[] = [];
		const allRawResponses: FacilityApiResponse[] = [];

		try {
			for (const faCode of faCodes) {
				try {
					console.log(`[${faCode}] Fetching data...`);
					const response = await this.httpClient.fetchWithRetry({
						distCode,
						faCode: [faCode],
						playDate,
					});
					allRawResponses.push(response);

					const processedData = this.processor.processRawResponse(
						response,
						crawlJob.id,
					);
					allProcessedData.push(...processedData);
					console.log(`[${faCode}] Processed ${processedData.length} sessions`);
				} catch (error) {
					console.error(`[${faCode}] Failed to crawl:`, error);
					failedCodes.push(faCode);
				}
			}

			// 2. Convert to database entities (even if some failed)
			if (allProcessedData.length > 0) {
				const entities = this.processor.toDatabaseEntities(allProcessedData);

				// 3. Save to database
				console.log("Saving data to database...");
				await this.db.saveResults(entities);

				// 4. Update job status
				// If we have some failures but some success, we mark as COMPLETED (with errors)
				// or we could add a PARTIAL status. For now, strict FAILED if anything failed
				// isn't ideal because we want to save the partial data.
				// Let's mark as COMPLETED but with error message if partial,
				// or FAILED if ALL failed.
			}

			const isTotalFailure = failedCodes.length === faCodes.length;
			const isPartialFailure = failedCodes.length > 0 && !isTotalFailure;
			const isSuccess = failedCodes.length === 0;

			const stats = {
				venueCount:
					allProcessedData.length > 0
						? new Set(allProcessedData.map((p) => p.venueId)).size
						: 0,
				sessionCount: allProcessedData.length,
				rawData: allRawResponses as unknown as Prisma.InputJsonValue,
			};

			if (isTotalFailure) {
				const error = new Error(
					`All facilities failed: ${failedCodes.join(", ")}`,
				);
				await this.db.failJob(crawlJob.id, error);
				// We don't throw here, we return success=false
			} else {
				// Success or Partial Success
				await this.db.completeJob(crawlJob.id, stats);

				if (isPartialFailure) {
					// Append failure info to job record (using internal prisma update if needed,
					// or we just rely on return value for immediate retry)
					console.warn(
						`Job ${crawlJob.id} completed with ${failedCodes.length} failures`,
					);
				}
			}

			return {
				jobId: crawlJob.id,
				success: isSuccess,
				failedCodes,
			};
		} catch (error) {
			// Catch unexpected errors outside the loop (e.g. database issues)
			console.error(`Crawl job ${crawlJob.id} failed catastrophically:`, error);
			await this.db.failJob(
				crawlJob.id,
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	/**
	 * Get crawl job history
	 */
	async getCrawlHistory(limit: number = 10): Promise<CrawlJobSummary[]> {
		const jobs = await prisma.crawlJob.findMany({
			take: limit,
			orderBy: { startedAt: "desc" },
			include: {
				results: true,
				_count: {
					select: { sessions: true },
				},
			},
		});

		return jobs.map((job) => ({
			id: job.id,
			status: job.status,
			playDate: job.playDate,
			startedAt: job.startedAt,
			completedAt: job.completedAt,
			venueCount: job.results[0]?.venueCount || 0,
			sessionCount: job.results[0]?.sessionCount || 0,
			errorMessage: job.errorMessage,
		}));
	}

	/**
	 * Get details of a specific crawl job
	 */
	async getCrawlJob(jobId: string) {
		return await prisma.crawlJob.findUnique({
			where: { id: jobId },
			include: {
				results: true,
				sessions: {
					take: 100,
					orderBy: [{ date: "desc" }, { startTime: "asc" }],
					include: {
						venue: true,
					},
				},
			},
		});
	}

	/**
	 * Get available sessions for a specific date
	 */
	async getAvailableSessions(date: string, districtCode?: string) {
		const where: Prisma.SessionWhereInput = {
			date: new Date(date),
			available: true,
			isOpen: true,
		};

		if (districtCode) {
			where.venue = {
				districtCode,
			};
		}

		return await prisma.session.findMany({
			where,
			include: {
				venue: true,
			},
			orderBy: [{ date: "asc" }, { startTime: "asc" }],
		});
	}

	/**
	 * Get facility statistics
	 */
	async getFacilityStats() {
		const [totalFacilities, totalSessions, availableSessions, latestCrawl] =
			await Promise.all([
				prisma.facility.count(),
				prisma.session.count(),
				prisma.session.count({ where: { available: true } }),
				prisma.crawlJob.findFirst({
					where: { status: "COMPLETED" },
					orderBy: { startedAt: "desc" },
				}),
			]);

		return {
			totalFacilities,
			totalSessions,
			availableSessions,
			lastCrawlAt: latestCrawl?.completedAt || null,
		};
	}
}
