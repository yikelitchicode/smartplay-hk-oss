/**
 * API Call Logger
 *
 * Automatic logging and timing for server function calls from the frontend
 */

import { browserLogger } from "./browser-logger";
import { generateRequestId } from "./request-context";
import type { ApiCallMetadata, LogContext } from "./types";

/**
 * Store active API calls for debugging
 */
const activeCalls = new Map<string, ApiCallMetadata>();

/**
 * Wrapper for server function calls with automatic logging
 *
 * @param functionName - Name of the server function being called
 * @param serverFn - The server function to call
 * @param context - Additional context to log
 * @returns Result of the server function call
 *
 * @example
 * ```ts
 * const data = await loggedServerCall(
 *   'getBookingData',
 *   () => getBookingData({ date: '2025-01-16' }),
 *   { date: '2025-01-16' }
 * )
 * ```
 */
export async function loggedServerCall<T>(
	functionName: string,
	serverFn: () => Promise<T>,
	context?: Record<string, unknown>,
): Promise<T> {
	const requestId = generateRequestId();
	const startTime = performance.now();

	const metadata: ApiCallMetadata = {
		functionName,
		startTime,
		requestId,
	};

	activeCalls.set(requestId, metadata);

	browserLogger.info("API call started", {
		requestId,
		function: functionName,
		...context,
	} as LogContext);

	try {
		const result = await serverFn();
		const endTime = performance.now();
		const duration = endTime - startTime;

		metadata.endTime = endTime;
		metadata.duration = duration;
		metadata.success = true;

		browserLogger.info("API call completed", {
			requestId,
			function: functionName,
			duration: `${duration.toFixed(2)}ms`,
			success: true,
			...context,
		} as LogContext);

		return result;
	} catch (error) {
		const endTime = performance.now();
		const duration = endTime - startTime;

		metadata.endTime = endTime;
		metadata.duration = duration;
		metadata.success = false;
		metadata.error = error instanceof Error ? error : new Error(String(error));

		browserLogger.error("API call failed", error, {
			requestId,
			function: functionName,
			duration: `${duration.toFixed(2)}ms`,
			success: false,
			...context,
		} as LogContext);

		throw error;
	} finally {
		// Keep in activeCalls for a short time for debugging
		setTimeout(() => {
			activeCalls.delete(requestId);
		}, 5000);
	}
}

/**
 * Get all active API calls
 */
export function getActiveCalls(): ApiCallMetadata[] {
	return Array.from(activeCalls.values());
}

/**
 * Get metadata for a specific request
 */
export function getCallMetadata(
	requestId: string,
): ApiCallMetadata | undefined {
	return activeCalls.get(requestId);
}

/**
 * Performance tracking hook for API calls
 * Returns statistics about recent API calls
 */
export function getApiCallStats() {
	const completedCalls = browserLogger
		.getBuffer()
		.filter(
			(entry) => entry.context?.function && entry.message.includes("API"),
		);

	const stats = {
		total: completedCalls.length,
		successful: 0,
		failed: 0,
		averageDuration: 0,
		slowestCall: { function: "", duration: 0 },
		fastestCall: { function: "", duration: 0 },
	};

	let totalDuration = 0;
	let maxDuration = 0;
	let minDuration = Infinity;

	for (const entry of completedCalls) {
		const context = entry.context || {};
		const duration = context.duration
			? Number.parseFloat(String(context.duration))
			: 0;

		if (context.success === true) {
			stats.successful++;
		} else if (context.success === false) {
			stats.failed++;
		}

		totalDuration += duration;

		if (duration > maxDuration) {
			maxDuration = duration;
			stats.slowestCall = {
				function: String(context.function || "unknown"),
				duration,
			};
		}

		if (duration < minDuration && duration > 0) {
			minDuration = duration;
			stats.fastestCall = {
				function: String(context.function || "unknown"),
				duration,
			};
		}
	}

	stats.averageDuration =
		completedCalls.length > 0 ? totalDuration / completedCalls.length : 0;

	return stats;
}
