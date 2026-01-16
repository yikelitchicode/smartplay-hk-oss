/**
 * Database Health Checker
 *
 * Provides database connectivity validation with caching and monitoring.
 * Performs lightweight connection tests and monitors connection pool status.
 */

import { prisma } from "@/db";
import type { DatabaseHealthStatus, HealthCheckOptions } from "./types";

/**
 * Default health check options
 */
const DEFAULT_OPTIONS: Required<HealthCheckOptions> = {
	timeout: 2000,
	retries: 1,
	cacheTTL: 5000,
};

/**
 * Database Health Checker Class
 *
 * Monitors database connectivity with caching to minimize overhead.
 * Uses lightweight SELECT 1 query for connection validation.
 */
export class DatabaseHealthChecker {
	private cachedStatus: DatabaseHealthStatus | null = null;
	private cacheExpiry: Date | null = null;

	/**
	 * Perform database health check
	 *
	 * Executes a lightweight query to validate database connectivity.
	 * Results are cached for configurable TTL to minimize overhead.
	 *
	 * @param options - Health check configuration options
	 * @returns Database health status with latency and pool information
	 */
	async check(options: HealthCheckOptions = {}): Promise<DatabaseHealthStatus> {
		const config = { ...DEFAULT_OPTIONS, ...options };

		// Return cached status if still valid
		if (
			this.cachedStatus &&
			this.cacheExpiry &&
			new Date() < this.cacheExpiry
		) {
			return this.cachedStatus;
		}

		const startTime = Date.now();
		let attempts = 0;
		let lastError: Error | null = null;

		// Retry logic for transient failures
		while (attempts <= config.retries) {
			try {
				// Lightweight connection test using SELECT 1
				await prisma.$queryRaw`SELECT 1`;

				const latency = Date.now() - startTime;

				// Get pool metrics if available
				const poolStatus = await this.getPoolStatus();

				const status: DatabaseHealthStatus = {
					healthy: true,
					latency,
					poolStatus,
					lastChecked: new Date(),
				};

				// Update cache
				this.cachedStatus = status;
				this.cacheExpiry = new Date(Date.now() + config.cacheTTL);

				return status;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				attempts++;

				// If retries remain, wait before retrying
				if (attempts <= config.retries) {
					await this.delay(500 * attempts); // Exponential backoff
				}
			}
		}

		// All retries exhausted - return unhealthy status
		const unhealthyStatus: DatabaseHealthStatus = {
			healthy: false,
			error: lastError?.message || "Unknown database error",
			lastChecked: new Date(),
		};

		// Cache unhealthy status for shorter duration (1s)
		this.cachedStatus = unhealthyStatus;
		this.cacheExpiry = new Date(Date.now() + 1000);

		return unhealthyStatus;
	}

	/**
	 * Check database health and throw if unhealthy
	 *
	 * Convenience method for pre-flight validation.
	 * Throws an error if database is not healthy.
	 *
	 * @param options - Health check configuration options
	 * @throws Error if database is unhealthy
	 */
	async checkOrThrow(options: HealthCheckOptions = {}): Promise<void> {
		const status = await this.check(options);

		if (!status.healthy) {
			throw new Error(
				`Database health check failed: ${status.error || "Unknown error"}`,
			);
		}
	}

	/**
	 * Get last cached health status
	 *
	 * @returns Cached status or null if no check has been performed
	 */
	getStatus(): DatabaseHealthStatus | null {
		return this.cachedStatus;
	}

	/**
	 * Quick check without cache
	 *
	 * Performs a fresh health check, bypassing the cache.
	 *
	 * @returns true if database is healthy, false otherwise
	 */
	async isHealthy(): Promise<boolean> {
		const status = await this.check({ cacheTTL: 0 });
		return status.healthy;
	}

	/**
	 * Invalidate cached status
	 *
	 * Forces a recheck on the next call to check().
	 */
	invalidateCache(): void {
		this.cachedStatus = null;
		this.cacheExpiry = null;
	}

	/**
	 * Get connection pool status
	 *
	 * Returns pool metrics if available through Prisma inspector.
	 *
	 * @returns Pool status or undefined if not available
	 */
	private async getPoolStatus(): Promise<
		| {
				activeConnections: number;
				idleConnections: number;
				totalConnections: number;
		  }
		| undefined
	> {
		try {
			// Prisma doesn't expose pool metrics directly
			// This is a placeholder for future integration
			// Could use prisma.$inspector or custom monitoring
			return undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * Delay helper for retry logic
	 *
	 * @param ms - Milliseconds to delay
	 * @returns Promise that resolves after delay
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Export singleton instance
export const healthChecker = new DatabaseHealthChecker();
