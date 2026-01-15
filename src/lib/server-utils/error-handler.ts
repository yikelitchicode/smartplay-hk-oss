/**
 * Server error handling utilities
 */

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
 * Wraps a database operation with error handling
 */
export async function withDbErrorHandling<T>(
	operation: () => Promise<T>,
	operationName: string,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		console.error(`Database error in ${operationName}:`, error);

		if (error instanceof Error) {
			// Check for common database errors
			if (error.message.includes("connect")) {
				throw new Error("Database connection failed. Please try again later.");
			}
			if (error.message.includes("timeout")) {
				throw new Error("Database operation timed out. Please try again.");
			}
		}

		throw new Error(
			`An error occurred while ${operationName}. Please try again later.`,
		);
	}
}
