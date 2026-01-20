import PQueue from "p-queue";
import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { CrawlerDataProcessor } from "./data-processor";
import { CrawlerDatabaseService } from "./db";
import { DeadLetterQueue } from "./dead-letter-queue";
import { SmartPlayHttpClient } from "./http-client";
import { syncFacilityConfig } from "./metadata-crawler";
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
	private queue: PQueue;
	private dlq: DeadLetterQueue;

	constructor(config: CrawlerConfig) {
		this.config = config;
		this.httpClient = new SmartPlayHttpClient(config);
		this.processor = new CrawlerDataProcessor();
		this.db = new CrawlerDatabaseService();
		this.dlq = new DeadLetterQueue();

		// Configure concurrency for parallel processing
		// Use config values to control load
		this.queue = new PQueue({
			concurrency: config.api.concurrency,
			interval: config.api.minRequestInterval,
			intervalCap: config.api.concurrency, // Request limit per interval
			autoStart: true,
		});
	}

	/**
	 * Run a crawl job with specified parameters
	 */
	async runCrawl(
		params?: Partial<CrawlerConfig["parameters"]> & { lang?: string },
	): Promise<{ jobId: string; success: boolean; failedCodes: string[] }> {
		// 0. Ensure metadata is synchronized
		// We sync if no facility types exist in DB or if explicitly requested
		const typeCount = await prisma.facilityType.count();
		if (typeCount === 0) {
			console.log("Database is empty. Synchronizing facility metadata...");
			await syncFacilityConfig();
		}

		// Merge config with runtime params
		const distCode = (params?.distCode || this.config.parameters.distCode).join(
			",",
		);
		const playDate = params?.playDate || this.config.parameters.playDate;
		let faCodes = params?.faCode || this.config.parameters.faCode;

		// If no codes provided, fetch all active codes from database
		if (faCodes.length === 0) {
			console.log(
				"No facility codes provided. Fetching active codes from database...",
			);
			const activeTypes = await prisma.facilityType.findMany({
				where: { isVisible: true },
				select: { code: true },
			});
			faCodes = activeTypes.map((t) => t.code);

			if (faCodes.length === 0) {
				console.warn(
					"No active facility types found in database. Using fallback config.",
				);
				faCodes = [...this.config.parameters.faCode];
			}
		}

		console.log(
			`Starting crawl for ${faCodes.length} facility codes on ${playDate}`,
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
			console.log(
				`Processing ${faCodes.length} facility codes with concurrency ${this.config.api.concurrency}...`,
			);

			// Process facilities in parallel with controlled concurrency
			const results = await Promise.allSettled(
				faCodes.map((faCode) =>
					this.queue.add(() =>
						this.fetchAndProcessFacility(
							faCode,
							distCode,
							playDate,
							crawlJob.id,
							params?.lang,
						),
					),
				),
			);

			// Process results and handle DLQ
			for (const [index, result] of results.entries()) {
				const faCode = faCodes[index];
				if (result.status === "fulfilled") {
					const { response, processedData } = result.value;
					allRawResponses.push(response);
					allProcessedData.push(...processedData);

					// Success: clear from DLQ if exists
					try {
						await this.dlq.markResolved(faCode, playDate, distCode);
					} catch (dlqError) {
						console.error(
							`[${faCode}] Failed to mark DLQ as resolved:`,
							dlqError,
						);
					}
				} else {
					console.error(`[${faCode}] Failed to crawl:`, result.reason);
					failedCodes.push(faCode);

					// Failure: add to DLQ
					const error =
						result.reason instanceof Error
							? result.reason
							: new Error(String(result.reason));
					try {
						await this.dlq.addFailure({
							faCode,
							date: playDate,
							distCode,
							error,
							jobId: crawlJob.id,
						});
					} catch (dlqError) {
						console.error(`[${faCode}] Failed to add to DLQ:`, dlqError);
					}
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

	/**
	 * Fetch and process a single facility code
	 * Helper method for parallel processing
	 */
	private async fetchAndProcessFacility(
		faCode: string,
		distCode: string,
		playDate: string,
		jobId: string,
		lang?: string,
	): Promise<{
		response: FacilityApiResponse;
		processedData: ProcessedFacilityData[];
	}> {
		console.log(`[${faCode}] Fetching data...`);
		const response = await this.httpClient.fetchWithRetry({
			distCode,
			faCode: [faCode],
			playDate,
			lang,
		});

		const processedData = this.processor.processRawResponse(
			response,
			jobId,
			lang,
		);
		console.log(`[${faCode}] Processed ${processedData.length} sessions`);

		return { response, processedData };
	}
}
