/**
 * Server Logger Integration
 *
 * Backend logging utilities that extend the existing Pino setup
 */

import { logger as baseLogger } from "@/lib/logger";
import {
	getLoggingConfig,
	sanitizeData,
	shouldLogPerformance,
	truncateData,
} from "./config";
import type { RequestContext } from "./types";

/**
 * Create a request-scoped server logger
 * Extends the base Pino logger with request context
 */
export function createServerLogger(context: RequestContext) {
	const { requestId, timestamp, ...rest } = context;
	return baseLogger.child({
		requestId,
		timestamp,
		...rest,
	});
}

/**
 * Sanitize data before logging (remove sensitive fields)
 * Uses configuration from logging config
 */
export function sanitize(data: unknown): unknown {
	return sanitizeData(data);
}

/**
 * Log server function execution with performance timing
 * Respects configuration for data inclusion
 */
export function logServerFunction(
	functionName: string,
	params: unknown,
	result: unknown,
	duration: number,
	success: boolean,
): void {
	const config = getLoggingConfig();

	// Check if performance should be logged
	if (!shouldLogPerformance(duration)) {
		return;
	}

	const logData: Record<string, unknown> = {
		function: functionName,
		duration: `${duration.toFixed(2)}ms`,
		success,
	};

	// Include params based on configuration
	if (config.data.includeQueryParams) {
		logData.params = truncateData(sanitize(params));
	}

	// Include result based on configuration
	if (config.data.includeResponseData && config.data.includeDatabaseResults) {
		logData.result = truncateData(sanitize(result));
	}

	if (success) {
		baseLogger.info(logData, "Server function executed successfully");
	} else {
		baseLogger.error(logData, "Server function execution failed");
	}
}

/**
 * Extract request context from server function call
 */
export function extractRequestContext(
	requestId: string,
	additionalContext?: Record<string, unknown>,
): RequestContext {
	return {
		requestId,
		timestamp: new Date().toISOString(),
		...additionalContext,
	};
}
