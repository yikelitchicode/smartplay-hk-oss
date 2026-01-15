/**
 * Crawler Repositories Module
 *
 * Exports all repository interfaces and implementations.
 * Use this file for importing repository components.
 *
 * @example
 * ```typescript
 * // Import interfaces
 * import { ICrawlJobRepository, ISessionRepository } from '@/lib/crawler/repositories';
 *
 * // Import implementations
 * import { PrismaRepositoryFactory } from '@/lib/crawler/repositories';
 * import { MockRepositoryFactory } from '@/lib/crawler/repositories';
 * ```
 */

// Interfaces
export type {
	CrawlJobSummary,
	CreateJobParams,
	CreateRunParams,
	ICheckpointRepository,
	ICrawlJobRepository,
	IRepositoryFactory,
	ISessionRepository,
	JobStats,
	SessionInsert,
	UpdateJobResult,
} from "./interfaces";
// Mock Implementations
export {
	MockCheckpointRepository,
	MockCrawlJobRepository,
	MockRepositoryFactory,
	MockSessionRepository,
} from "./mock-repository";
// Prisma Implementations
export {
	PrismaCheckpointRepository,
	PrismaCrawlJobRepository,
	PrismaRepositoryFactory,
	PrismaSessionRepository,
} from "./prisma-repository";
