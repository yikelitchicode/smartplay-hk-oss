/**
 * Logging Configuration
 *
 * Centralized configuration for controlling logging behavior
 * Developers can customize what information gets logged
 */

import type { LogLevel } from "./types";

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
	// Log level controls
	level: LogLevel;
	minLevel: LogLevel;

	// Feature flags
	features: {
		// Enable/disable logging for specific areas
		enableRequestTracing: boolean;
		enablePerformanceTracking: boolean;
		enableDatabaseLogging: boolean;
		enableServerFunctionLogging: boolean;
		enableApiCallLogging: boolean;
		enableErrorBoundaryLogging: boolean;
	};

	// Data inclusion controls
	data: {
		// Include/exclude specific data types
		includeQueryParams: boolean;
		includeRequestHeaders: boolean;
		includeResponseData: boolean;
		includeDatabaseResults: boolean; // Set to false to exclude large result sets
		includeErrorStackTraces: boolean;
		includeComponentStack: boolean;

		// Maximum size limits
		maxResultSize: number; // Max characters in logged results (0 = no limit)
		maxArrayLength: number; // Max array items to log (0 = log all)
		maxObjectDepth: number; // Max object nesting depth (0 = log all)
	};

	// Sanitization
	sanitization: {
		// Fields to redact from logs
		redactFields: string[];

		// Custom sanitization function
		customSanitizer?: (data: unknown) => unknown;
	};

	// Performance settings
	performance: {
		// Track operations slower than threshold (ms)
		slowOperationThreshold: number;

		// Enable performance sampling (log % of operations)
		performanceSamplingRate: number; // 0.0 to 1.0 (1.0 = log all)
	};

	// Buffer settings (browser only)
	buffer: {
		enabled: boolean;
		maxSize: number;
		persistToLocalStorage: boolean;
	};
}

/**
 * Default configuration
 */
export const defaultConfig: LoggingConfig = {
	level: ((import.meta.env.LOG_LEVEL as LogLevel) || "info") as LogLevel,
	minLevel: "info" as LogLevel,

	features: {
		enableRequestTracing: import.meta.env.ENABLE_REQUEST_TRACING !== "false",
		enablePerformanceTracking: true,
		enableDatabaseLogging: false, // Disabled by default to avoid massive logs
		enableServerFunctionLogging: true,
		enableApiCallLogging: true,
		enableErrorBoundaryLogging: true,
	},

	data: {
		includeQueryParams: true,
		includeRequestHeaders: false,
		includeResponseData: false, // Disabled by default to avoid massive logs
		includeDatabaseResults: false, // ⚠️ IMPORTANT: Set to false to exclude large result sets
		includeErrorStackTraces: true,
		includeComponentStack: true,

		maxResultSize: 1000, // Limit logged results to 1000 characters
		maxArrayLength: 50, // Limit array logging to 50 items
		maxObjectDepth: 3, // Limit object depth to 3 levels
	},

	sanitization: {
		redactFields: [
			"password",
			"token",
			"secret",
			"apiKey",
			"api_key",
			"DATABASE_URL",
			"authorization",
			"cookie",
			"session",
		],
	},

	performance: {
		slowOperationThreshold: 1000, // Log operations slower than 1 second
		performanceSamplingRate: 1.0, // Log all performance data
	},

	buffer: {
		enabled: import.meta.env.NODE_ENV === "development",
		maxSize: Number.parseInt(import.meta.env.LOG_BUFFER_SIZE || "100", 10),
		persistToLocalStorage: false as boolean,
	},
};

/**
 * Current configuration (mutable)
 */
let currentConfig: LoggingConfig = { ...defaultConfig };

/**
 * Get current logging configuration
 */
export function getLoggingConfig(): Readonly<LoggingConfig> {
	return currentConfig;
}

/**
 * Update logging configuration
 *
 * @param updates - Partial configuration updates
 * @param merge - Whether to merge with existing config (default: true)
 */
export function updateLoggingConfig(
	updates: Partial<LoggingConfig>,
	merge: boolean = true,
): void {
	if (merge) {
		// Deep merge with existing config
		currentConfig = deepMerge(currentConfig, updates);
	} else {
		// Replace entire config
		currentConfig = { ...defaultConfig, ...updates };
	}
}

/**
 * Reset to default configuration
 */
export function resetLoggingConfig(): void {
	currentConfig = { ...defaultConfig };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
	feature: keyof LoggingConfig["features"],
): boolean {
	return currentConfig.features[feature];
}

/**
 * Check if data type should be included
 */
export function shouldIncludeData(
	dataType: keyof LoggingConfig["data"],
): boolean {
	return Boolean(currentConfig.data[dataType]);
}

/**
 * Check if log level should be output
 */
export function shouldLog(level: LogLevel): boolean {
	const levels: LogLevel[] = [
		"trace" as LogLevel,
		"debug" as LogLevel,
		"info" as LogLevel,
		"warn" as LogLevel,
		"error" as LogLevel,
		"fatal" as LogLevel,
	];
	const currentLevelIndex = levels.indexOf(currentConfig.level);
	const logLevelIndex = levels.indexOf(level);

	return logLevelIndex >= currentLevelIndex;
}

/**
 * Deep merge utility for configuration updates
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
	const output = { ...target };

	for (const key in source) {
		if (source[key] !== undefined) {
			const sourceValue = source[key];
			const targetValue = output[key];

			if (
				typeof sourceValue === "object" &&
				sourceValue !== null &&
				!Array.isArray(sourceValue) &&
				typeof targetValue === "object" &&
				targetValue !== null &&
				!Array.isArray(targetValue)
			) {
				output[key] = deepMerge(
					targetValue as Record<string, unknown>,
					sourceValue as Partial<Record<string, unknown>>,
				) as T[Extract<keyof T, string>];
			} else {
				output[key] = sourceValue as T[Extract<keyof T, string>];
			}
		}
	}

	return output;
}

/**
 * Truncate data based on configuration limits
 */
export function truncateData(
	data: unknown,
	config: LoggingConfig = currentConfig,
): unknown {
	const { maxResultSize, maxArrayLength, maxObjectDepth } = config.data;

	if (data === null || data === undefined) {
		return data;
	}

	// Truncate strings
	if (typeof data === "string") {
		if (maxResultSize > 0 && data.length > maxResultSize) {
			return `${data.substring(0, maxResultSize)}... (truncated)`;
		}
		return data;
	}

	// Truncate arrays
	if (Array.isArray(data)) {
		if (maxArrayLength > 0 && data.length > maxArrayLength) {
			const truncated = data.slice(0, maxArrayLength);
			truncated.push(`... (${data.length - maxArrayLength} more items)`);
			return truncated;
		}
		return data.map((item) => truncateData(item, config));
	}

	// Truncate objects
	if (typeof data === "object") {
		const depth = 0;

		const truncateObject = (
			obj: Record<string, unknown>,
			currentDepth: number,
		): Record<string, unknown> => {
			const output: Record<string, unknown> = {};

			for (const [key, value] of Object.entries(obj)) {
				if (maxObjectDepth > 0 && currentDepth >= maxObjectDepth) {
					output[key] = "[object]"; // Stop at max depth
				} else if (typeof value === "object" && value !== null) {
					output[key] = truncateObject(
						value as Record<string, unknown>,
						currentDepth + 1,
					);
				} else if (
					typeof value === "string" &&
					maxResultSize > 0 &&
					value.length > maxResultSize
				) {
					output[key] = `${value.substring(0, maxResultSize)}... (truncated)`;
				} else {
					output[key] = value;
				}
			}

			return output;
		};

		return truncateObject(data as Record<string, unknown>, depth);
	}

	return data;
}

/**
 * Sanitize data based on configuration
 */
export function sanitizeData(
	data: unknown,
	config: LoggingConfig = currentConfig,
): unknown {
	if (config.sanitization.customSanitizer) {
		return config.sanitization.customSanitizer(data);
	}

	const redactFields = config.sanitization.redactFields;

	if (!data || typeof data !== "object") {
		return data;
	}

	if (Array.isArray(data)) {
		return data.map((item) => sanitizeData(item, config));
	}

	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(data)) {
		const shouldRedact = redactFields.some((field) =>
			key.toLowerCase().includes(field.toLowerCase()),
		);

		if (shouldRedact) {
			sanitized[key] = "[REDACTED]";
		} else if (typeof value === "object" && value !== null) {
			sanitized[key] = sanitizeData(value, config);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Check if performance should be logged
 */
export function shouldLogPerformance(duration: number): boolean {
	const { slowOperationThreshold, performanceSamplingRate } =
		currentConfig.performance;

	// Always log slow operations
	if (duration >= slowOperationThreshold) {
		return true;
	}

	// Sample faster operations
	return Math.random() < performanceSamplingRate;
}
