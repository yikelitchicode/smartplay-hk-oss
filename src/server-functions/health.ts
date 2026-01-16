/**
 * Health Check Server Functions
 *
 * Exposes database health status endpoints for monitoring tools.
 * Provides basic and detailed health information.
 */

import { circuitBreaker, healthChecker, poolMonitor } from "@/lib/health";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/lib/server-utils/error-handler";

/**
 * Basic health check endpoint
 *
 * Returns simple health status for uptime monitoring.
 * Suitable for ping-based monitoring (Pingdom, UptimeRobot, etc.)
 */
export async function healthCheckFn() {
	try {
		const status = await healthChecker.check();

		if (!status.healthy) {
			return createErrorResponse("Database unavailable", "DATABASE_UNHEALTHY", {
				error: status.error,
				latency: status.latency,
			});
		}

		return createSuccessResponse({
			status: "healthy",
			latency: status.latency,
			timestamp: status.lastChecked,
		});
	} catch (error) {
		console.error("Health check endpoint error:", error);
		return createErrorResponse(
			"Health check failed",
			"HEALTH_CHECK_ERROR",
			error instanceof Error ? error.message : String(error),
		);
	}
}

/**
 * Detailed health check endpoint
 *
 * Returns comprehensive health information including:
 * - Database health status
 * - Connection pool metrics
 * - Circuit breaker state
 */
export async function detailedHealthCheckFn() {
	try {
		const [health, poolMetrics, circuitBreakerStats] = await Promise.all([
			healthChecker.check(),
			poolMonitor.getMetrics(),
			Promise.resolve(circuitBreaker.getStats()),
		]);

		if (!health.healthy) {
			return createErrorResponse("Database unavailable", "DATABASE_UNHEALTHY", {
				database: health,
				pool: poolMetrics,
				circuitBreaker: circuitBreakerStats,
				timestamp: new Date().toISOString(),
			});
		}

		return createSuccessResponse({
			database: {
				healthy: health.healthy,
				latency: health.latency,
				poolStatus: health.poolStatus,
				lastChecked: health.lastChecked,
			},
			pool: poolMetrics,
			circuitBreaker: {
				state: circuitBreakerStats.state,
				failureCount: circuitBreakerStats.failureCount,
				successCount: circuitBreakerStats.successCount,
				lastFailureTime: circuitBreakerStats.lastFailureTime,
				lastStateChange: circuitBreakerStats.lastStateChange,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Detailed health check endpoint error:", error);
		return createErrorResponse(
			"Detailed health check failed",
			"HEALTH_CHECK_ERROR",
			error instanceof Error ? error.message : String(error),
		);
	}
}

/**
 * Readiness check endpoint
 *
 * Returns whether the service is ready to handle requests.
 * Similar to health check but can include additional readiness checks.
 */
export async function readinessCheckFn() {
	try {
		// Quick health check without cache
		const isHealthy = await healthChecker.isHealthy();

		if (!isHealthy) {
			return createErrorResponse("Service not ready", "SERVICE_NOT_READY", {
				reason: "Database connection unavailable",
			});
		}

		return createSuccessResponse({
			status: "ready",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Readiness check endpoint error:", error);
		return createErrorResponse(
			"Readiness check failed",
			"READINESS_CHECK_ERROR",
			error instanceof Error ? error.message : String(error),
		);
	}
}
