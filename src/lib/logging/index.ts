/**
 * Logging System Public API
 *
 * Central exports for the logging system
 */

export {
	getActiveCalls,
	getApiCallStats,
	getCallMetadata,
	loggedServerCall,
} from "./api-logger";
// Frontend logging
export {
	BrowserLogger,
	browserLogger,
	createRequestLogger,
} from "./browser-logger";
export type { LoggingConfig } from "./config";
// Configuration
export {
	getLoggingConfig,
	isFeatureEnabled,
	resetLoggingConfig,
	sanitizeData,
	shouldIncludeData,
	shouldLog,
	shouldLogPerformance,
	truncateData,
	updateLoggingConfig,
} from "./config";
export {
	DefaultErrorFallback,
	LoggingErrorBoundary,
	useErrorHandler,
} from "./error-boundary";
export {
	measurePerformance,
	withDatabaseLogging,
	withLogging,
} from "./middleware";
// Core utilities
export {
	createRequestContext,
	extractRequestId,
	generateRequestId,
	isValidRequestId,
} from "./request-context";
// Backend logging
export {
	createServerLogger,
	extractRequestContext as extractServerRequestContext,
	logServerFunction,
	sanitize,
} from "./server-logger";
// Type definitions
export type {
	ApiCallMetadata,
	LogContext,
	LogEntry,
	Logger,
	RequestContext,
} from "./types";
export { LogLevel } from "./types";
