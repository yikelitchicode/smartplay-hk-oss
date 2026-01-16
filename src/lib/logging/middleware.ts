/**
 * Server Function Logging Middleware
 *
 * Automatically wraps server functions with logging and request tracking
 */

import { generateRequestId } from "./request-context";
import {
	createServerLogger,
	extractRequestContext,
	logServerFunction,
} from "./server-logger";

/**
 * Wrap a server function handler with automatic logging
 *
 * @param functionName - Name of the server function for identification
 * @param handler - The server function handler to wrap
 * @returns Wrapped handler with logging
 *
 * @example
 * ```ts
 * export const getData = createServerFn({ method: 'GET' })
 *   .handler(withLogging('getData', async ({ data }) => {
 *     // Your implementation here
 *   }))
 * ```
 */
export function withLogging<T extends { data?: unknown }, R>(
	functionName: string,
	handler: (args: T) => Promise<R>,
): (args: T) => Promise<R> {
	return async (args: T) => {
		const startTime = performance.now();
		const requestId = generateRequestId();
		const context = extractRequestContext(requestId, {
			function: functionName,
		});
		const logger = createServerLogger(context);

		logger.info(
			{
				function: functionName,
				params: args.data,
			},
			"Server function started",
		);

		try {
			const result = await handler(args);
			const duration = performance.now() - startTime;

			logServerFunction(functionName, args.data, result, duration, true);

			logger.info(
				{
					function: functionName,
					duration: `${duration.toFixed(2)}ms`,
					success: true,
				},
				"Server function completed",
			);

			return result;
		} catch (error) {
			const duration = performance.now() - startTime;

			logger.error(
				{
					function: functionName,
					duration: `${duration.toFixed(2)}ms`,
					success: false,
					params: args.data,
					err: error,
				},
				"Server function failed",
			);

			throw error;
		}
	};
}

/**
 * Performance measurement decorator
 *
 * @param operation - Operation name for logging
 * @param fn - Function to measure
 * @param context - Request context for logging
 * @returns Result of the function with performance logged
 *
 * @example
 * ```ts
 * const result = await measurePerformance(
 *   'database_query',
 *   () => db.session.findMany(),
 *   { requestId: 'req-123' }
 * )
 * ```
 */
export async function measurePerformance<T>(
	operation: string,
	fn: () => Promise<T>,
	context: { requestId: string },
): Promise<T> {
	const startTime = performance.now();
	const logger = createServerLogger({
		requestId: context.requestId,
		timestamp: new Date().toISOString(),
	});

	try {
		const result = await fn();
		const duration = performance.now() - startTime;

		logger.debug(
			{
				operation,
				duration: `${duration.toFixed(2)}ms`,
			},
			"Performance metric",
		);

		return result;
	} catch (error) {
		const duration = performance.now() - startTime;

		logger.error(
			{
				operation,
				duration: `${duration.toFixed(2)}ms`,
				err: error,
			},
			"Performance measurement failed",
		);

		throw error;
	}
}

/**
 * Wrap database operations with automatic logging
 *
 * @param operation - Database operation name
 * @param fn - Database function to execute
 * @param context - Request context
 * @returns Result of the database operation
 */
export async function withDatabaseLogging<T>(
	operation: string,
	fn: () => Promise<T>,
	context: { requestId: string },
): Promise<T> {
	const startTime = performance.now();
	const logger = createServerLogger({
		requestId: context.requestId,
		timestamp: new Date().toISOString(),
	});

	logger.debug({ operation }, "Database operation started");

	try {
		const result = await fn();
		const duration = performance.now() - startTime;

		logger.debug(
			{
				operation,
				duration: `${duration.toFixed(2)}ms`,
			},
			"Database operation completed",
		);

		return result;
	} catch (error) {
		const duration = performance.now() - startTime;

		logger.error(
			{
				operation,
				duration: `${duration.toFixed(2)}ms`,
				err: error,
			},
			"Database operation failed",
		);

		throw error;
	}
}
