/**
 * Server-side logging utilities
 */

export enum LogLevel {
	DEBUG = "DEBUG",
	INFO = "INFO",
	WARN = "WARN",
	ERROR = "ERROR",
}

export interface LogContext {
	[key: string]: unknown;
}

class Logger {
	private isDevelopment = process.env.NODE_ENV === "development";

	private formatMessage(
		level: LogLevel,
		message: string,
		context?: LogContext,
	): string {
		const timestamp = new Date().toISOString();
		const contextStr = context ? ` ${JSON.stringify(context)}` : "";
		return `[${timestamp}] [${level}] ${message}${contextStr}`;
	}

	debug(message: string, context?: LogContext): void {
		if (this.isDevelopment) {
			console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
		}
	}

	info(message: string, context?: LogContext): void {
		console.info(this.formatMessage(LogLevel.INFO, message, context));
	}

	warn(message: string, context?: LogContext): void {
		console.warn(this.formatMessage(LogLevel.WARN, message, context));
	}

	error(message: string, error?: Error | unknown, context?: LogContext): void {
		const errorContext =
			error instanceof Error
				? { ...context, error: error.message, stack: error.stack }
				: { ...context, error };

		console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
	}

	/**
	 * Logs server function execution
	 */
	logServerFunction(functionName: string, params?: LogContext): void {
		this.info(`Server function called: ${functionName}`, params);
	}

	/**
	 * Logs database operations
	 */
	logDatabase(
		operation: string,
		duration?: number,
		context?: LogContext,
	): void {
		const message = `Database operation: ${operation}${duration ? ` (${duration}ms)` : ""}`;
		this.debug(message, context);
	}

	/**
	 * Logs external service calls
	 */
	logExternalService(
		service: string,
		operation: string,
		context?: LogContext,
	): void {
		this.info(`External service call: ${service} - ${operation}`, context);
	}
}

// Export singleton instance
export const logger = new Logger();
