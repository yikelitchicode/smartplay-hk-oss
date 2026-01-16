/**
 * Browser Logger
 *
 * Client-side logging implementation with development/production modes
 * Includes in-memory log buffer for debugging
 */

import type { LogContext, LogEntry, Logger, LogLevel } from "./types";

// Environment detection
const isDevelopment = import.meta.env.DEV;
const isTest = import.meta.env.MODE === "test";

// Configuration from environment
const LOG_BUFFER_SIZE = Number.parseInt(
	import.meta.env.LOG_BUFFER_SIZE || "100",
	10,
);
const LOG_TO_BROWSER = import.meta.env.LOG_TO_BROWSER !== "false"; // Default true

/**
 * Browser Logger Implementation
 */
class BrowserLogger implements Logger {
	private buffer: LogEntry[] = [];
	private maxBufferSize: number;
	private enableConsoleLogging: boolean;

	constructor() {
		this.maxBufferSize = LOG_BUFFER_SIZE;
		this.enableConsoleLogging = !isTest && LOG_TO_BROWSER;
	}

	/**
	 * Core logging method
	 */
	private log(
		level: `${LogLevel}`,
		message: string,
		error?: Error | unknown,
		context?: LogContext,
	): void {
		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			context,
		};

		// Attach error details if provided
		if (error) {
			if (error instanceof Error) {
				entry.error = {
					message: error.message,
					stack: error.stack,
					name: error.name,
				};
			} else {
				entry.error = {
					message: String(error),
				};
			}
		}

		// Add to buffer
		this.addToBuffer(entry);

		// Console output in development
		if (this.enableConsoleLogging) {
			this.outputToConsole(entry);
		}

		// Send critical errors to backend (optional, for production monitoring)
		if (level === "error" || level === "fatal") {
			if (!isDevelopment && import.meta.env.SEND_ERRORS_TO_BACKEND === "true") {
				this.sendErrorToBackend(entry).catch((err) => {
					// Prevent infinite loop if error sending fails
					console.error("Failed to send error to backend:", err);
				});
			}
		}
	}

	/**
	 * Add entry to in-memory buffer
	 */
	private addToBuffer(entry: LogEntry): void {
		this.buffer.push(entry);

		// Maintain buffer size limit
		if (this.buffer.length > this.maxBufferSize) {
			this.buffer.shift(); // Remove oldest entry
		}
	}

	/**
	 * Output to browser console with appropriate formatting
	 */
	private outputToConsole(entry: LogEntry): void {
		const { level, message, context, error } = entry;
		const levelStr = level.toUpperCase();

		// Format context for console
		const contextStr = context
			? `\n  Context: ${JSON.stringify(context, null, 2)}`
			: "";
		const errorStr = error ? `\n  Error: ${error.message}` : "";
		const stackStr = error?.stack ? `\n  Stack: ${error.stack}` : "";

		const fullMessage = `[${levelStr}] ${message}${contextStr}${errorStr}${stackStr}`;

		// Use appropriate console method
		switch (level) {
			case "trace":
			case "debug":
				console.debug(fullMessage);
				break;
			case "info":
				console.info(fullMessage);
				break;
			case "warn":
				console.warn(fullMessage);
				break;
			case "error":
			case "fatal":
				console.error(fullMessage);
				break;
			default:
				console.log(fullMessage);
		}
	}

	/**
	 * Send error to backend for monitoring (production only)
	 * This can integrate with error tracking services like Sentry
	 */
	private async sendErrorToBackend(entry: LogEntry): Promise<void> {
		try {
			// In production, send to error tracking endpoint
			// This is a placeholder for integration with services like Sentry
			if (typeof window !== "undefined" && typeof fetch === "function") {
				await fetch("/api/log-error", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(entry),
					keepalive: true, // Ensure sent even if page is unloading
				});
			}
		} catch {
			// Silently fail to prevent cascading errors
		}
	}

	/**
	 * Standard logger methods
	 */
	trace(message: string, context?: LogContext): void {
		this.log("trace", message, undefined, context);
	}

	debug(message: string, context?: LogContext): void {
		this.log("debug", message, undefined, context);
	}

	info(message: string, context?: LogContext): void {
		this.log("info", message, undefined, context);
	}

	warn(message: string, context?: LogContext): void {
		this.log("warn", message, undefined, context);
	}

	error(message: string, error?: Error | unknown, context?: LogContext): void {
		this.log("error", message, error, context);
	}

	fatal(message: string, error?: Error | unknown, context?: LogContext): void {
		this.log("fatal", message, error, context);
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: LogContext): Logger {
		const childLogger = new BrowserLogger();
		const originalLog = childLogger.log.bind(childLogger);

		// Override log method to merge context
		childLogger.log = (
			level: `${LogLevel}`,
			message: string,
			error?: Error | unknown,
			additionalContext?: LogContext,
		) => {
			const mergedContext = { ...context, ...additionalContext };
			originalLog(level, message, error, mergedContext);
		};

		return childLogger;
	}

	/**
	 * Get all buffered log entries
	 */
	getBuffer(): LogEntry[] {
		return [...this.buffer];
	}

	/**
	 * Clear the log buffer
	 */
	clearBuffer(): void {
		this.buffer = [];
	}

	/**
	 * Get buffer size
	 */
	getBufferSize(): number {
		return this.buffer.length;
	}

	/**
	 * Export logs as JSON
	 */
	exportLogs(): string {
		return JSON.stringify(this.buffer, null, 2);
	}

	/**
	 * Download logs as file (for debugging)
	 */
	downloadLogs(filename = "logs.json"): void {
		if (typeof window === "undefined") {
			return;
		}

		const data = this.exportLogs();
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
}

// Export singleton instance
export const browserLogger = new BrowserLogger();

// Export class for testing
export { BrowserLogger };

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId: string): Logger {
	return browserLogger.child({ requestId });
}
