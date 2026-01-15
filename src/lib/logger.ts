/**
 * Structured Logging Configuration
 *
 * Provides production-ready logging with Pino for structured JSON logs.
 * In development, uses pino-pretty for human-readable output.
 */

import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

/**
 * Base logger configuration
 */
const baseLogger = pino({
	level: process.env.LOG_LEVEL || (isTest ? "silent" : "info"),
	// Use pretty printing in development
	...(isDevelopment && {
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "HH:MM:ss",
				ignore: "pid,hostname",
				singleLine: true,
			},
		},
	}),
	// Add timestamp to all logs
	timestamp: pino.stdTimeFunctions.isoTime,
	// Serialize errors properly
	serializers: {
		err: pino.stdSerializers.err,
		error: pino.stdSerializers.err,
	},
	// Redact sensitive fields
	redact: {
		paths: ["DATABASE_URL", "password", "token", "secret", "apiKey"],
		remove: true,
	},
});

/**
 * Main logger instance
 */
export const logger = baseLogger;

/**
 * Module-specific child loggers with predefined context
 */
export const crawlerLogger = logger.child({ module: "crawler" });
export const bookingLogger = logger.child({ module: "booking" });
export const serverLogger = logger.child({ module: "server" });
export const apiLogger = logger.child({ module: "api" });

/**
 * Log levels for type safety
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Create a child logger with additional context
 *
 * @param context - Additional context to include in all log messages
 * @returns Child logger instance
 *
 * @example
 * ```ts
 * const jobLogger = createLogger({ jobId: "12345", jobType: "crawl" });
 * jobLogger.info("Starting job");
 * // Output: {"level":"info", "time":"...", "module":"crawler", "jobId":"12345", "jobType":"crawl", "msg":"Starting job"}
 * ```
 */
export function createLogger(context: Record<string, unknown>) {
	return logger.child(context);
}

/**
 * Create a request-scoped logger for tracing
 *
 * @param requestId - Unique request identifier
 * @param additionalContext - Additional context to include
 * @returns Child logger instance with request context
 *
 * @example
 * ```ts
 * const requestLogger = createRequestLogger("req-123", { userId: "user-456" });
 * requestLogger.info("Processing request");
 * // Output: {"level":"info", "requestId":"req-123", "userId":"user-456", "msg":"Processing request"}
 * ```
 */
export function createRequestLogger(
	requestId: string,
	additionalContext?: Record<string, unknown>,
) {
	return logger.child({
		requestId,
		...additionalContext,
	});
}

export default logger;
