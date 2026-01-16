/**
 * Logging System Type Definitions
 *
 * Unified types for frontend and backend logging
 */

/**
 * Standard log levels
 */
export enum LogLevel {
	TRACE = "trace",
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
	FATAL = "fatal",
}

/**
 * Log level union type for type-safe filtering
 */
export type LogLevelUnion =
	| "trace"
	| "debug"
	| "info"
	| "warn"
	| "error"
	| "fatal";

/**
 * Log entry structure
 */
export interface LogEntry {
	level: `${LogLevel}`;
	message: string;
	timestamp: string;
	context?: LogContext;
	error?: {
		message: string;
		stack?: string;
		name?: string;
	};
}

/**
 * Log context - additional metadata attached to log entries
 */
export interface LogContext {
	requestId?: string;
	userId?: string;
	function?: string;
	duration?: string;
	[key: string]: unknown;
}

/**
 * Request context for tracing
 */
export interface RequestContext {
	requestId: string;
	timestamp: string;
	userAgent?: string;
	userId?: string;
	[key: string]: unknown;
}

/**
 * Logger interface - implemented by both browser and server loggers
 */
export interface Logger {
	trace(message: string, context?: LogContext): void;
	debug(message: string, context?: LogContext): void;
	info(message: string, context?: LogContext): void;
	warn(message: string, context?: LogContext): void;
	error(message: string, error?: Error | unknown, context?: LogContext): void;
	fatal(message: string, error?: Error | unknown, context?: LogContext): void;
	child(context: LogContext): Logger;
}

/**
 * Type-safe log level literal type
 */
export type LogLevelType = `${LogLevel}`;

/**
 * API call metadata for logging
 */
export interface ApiCallMetadata {
	functionName: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	requestId: string;
	success?: boolean;
	error?: Error;
}
