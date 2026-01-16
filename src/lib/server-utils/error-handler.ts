/**
 * Server error handling utilities
 */

import {
	DatabaseErrorType,
	type EnhancedDbErrorHandlingOptions,
} from "@/lib/health/types";

/**
 * Standard error response structure
 */
export interface ServerError {
	success: false;
	error: string;
	code?: string;
	// biome-ignore lint/suspicious/noExplicitAny: error details can be of any type
	details?: any;
}

/**
 * Standard success response structure
 */
export interface ServerSuccess<T = unknown> {
	success: true;
	data?: T;
	message?: string;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
	message: string,
	code?: string,
	details?: unknown,
): ServerError {
	return {
		success: false,
		error: message,
		code,
		details,
	};
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
	data?: T,
	message?: string,
): ServerSuccess<T> {
	return {
		success: true,
		data,
		message,
	};
}

/**
 * Wraps an async handler with error handling
 */
export function withErrorHandling<T>(
	handler: () => Promise<T>,
	errorMessage: string = "An error occurred",
): Promise<ServerSuccess<T> | ServerError> {
	return handler()
		.then((data) => createSuccessResponse<T>(data))
		.catch((error) => {
			console.error(errorMessage, error);

			const message =
				error instanceof Error
					? error.message
					: typeof error === "string"
						? error
						: errorMessage;

			return createErrorResponse(
				message,
				"HANDLER_ERROR",
				process.env.NODE_ENV === "development" ? error : undefined,
			);
		});
}

/**
 * Classify database error into specific types
 *
 * Analyzes Prisma errors and determines the appropriate error category
 * for handling and retry logic.
 *
 * @param error - The error to classify
 * @returns Database error type
 */
export function classifyDatabaseError(error: unknown): DatabaseErrorType {
	// Prisma-specific errors have a 'code' property
	if (error && typeof error === "object" && "code" in error) {
		const prismaCode = String(error.code);

		// Connection errors
		const connectionErrors = ["P1000", "P1001", "P1003", "P1006"];
		if (connectionErrors.includes(prismaCode)) {
			return DatabaseErrorType.CONNECTION_FAILED;
		}

		// Timeout errors
		if (prismaCode === "P1002") {
			return DatabaseErrorType.TIMEOUT;
		}

		// Pool exhaustion
		if (prismaCode === "P1017") {
			return DatabaseErrorType.POOL_EXHAUSTED;
		}

		// Other Prisma errors are query failures
		if (prismaCode.startsWith("P")) {
			return DatabaseErrorType.QUERY_FAILED;
		}
	}

	// Generic error classification by message
	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		if (message.includes("connect") || message.includes("connection")) {
			return DatabaseErrorType.CONNECTION_FAILED;
		}
		if (message.includes("timeout")) {
			return DatabaseErrorType.TIMEOUT;
		}
		if (message.includes("pool")) {
			return DatabaseErrorType.POOL_EXHAUSTED;
		}
	}

	return DatabaseErrorType.UNKNOWN;
}

/**
 * Enhanced database error handling with retry logic
 *
 * Provides automatic retry for connection errors with exponential backoff.
 * Supports fallback values and monitoring callbacks.
 *
 * @param operation - Database operation to execute
 * @param options - Enhanced error handling options
 * @returns Result of the operation or fallback value
 */
export async function withDbErrorHandling<T>(
	operation: () => Promise<T>,
	options: EnhancedDbErrorHandlingOptions,
): Promise<T> {
	const {
		operationName,
		retryOnConnectionError = false,
		maxRetries = 2,
		initialRetryDelay = 1000,
		fallbackValue,
		onConnectionError,
	} = options;

	let attempt = 0;
	let lastError: Error | null = null;

	while (attempt <= maxRetries) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			const errorType = classifyDatabaseError(error);

			console.error(
				`Database error in ${operationName} (attempt ${attempt + 1}/${maxRetries + 1}):`,
				error,
			);

			// Check if we should retry
			const shouldRetry =
				retryOnConnectionError &&
				(errorType === DatabaseErrorType.CONNECTION_FAILED ||
					errorType === DatabaseErrorType.TIMEOUT) &&
				attempt < maxRetries;

			if (shouldRetry) {
				// Call connection error callback if provided
				if (onConnectionError) {
					onConnectionError(lastError);
				}

				// Exponential backoff delay
				const delay = initialRetryDelay * 2 ** attempt;
				await new Promise((resolve) => setTimeout(resolve, delay));

				attempt++;
				continue;
			}

			// No more retries or non-retryable error
			break;
		}
	}

	// All retries exhausted - use fallback or throw
	if (fallbackValue !== undefined) {
		console.warn(
			`Database operation "${operationName}" failed, using fallback value`,
		);
		return fallbackValue as T;
	}

	// Throw appropriate error based on type
	const errorType = lastError
		? classifyDatabaseError(lastError)
		: DatabaseErrorType.UNKNOWN;

	switch (errorType) {
		case DatabaseErrorType.CONNECTION_FAILED:
			throw new Error("Database connection failed. Please try again later.");
		case DatabaseErrorType.TIMEOUT:
			throw new Error("Database operation timed out. Please try again.");
		case DatabaseErrorType.POOL_EXHAUSTED:
			throw new Error(
				"Database is experiencing high traffic. Please try again later.",
			);
		case DatabaseErrorType.QUERY_FAILED:
			throw new Error(
				`An error occurred while ${operationName}. Please try again later.`,
			);
		default:
			throw new Error(
				`An unexpected error occurred while ${operationName}. Please try again later.`,
			);
	}
}
