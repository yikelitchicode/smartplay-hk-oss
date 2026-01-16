/**
 * Request Context Management
 *
 * Generates and manages request IDs for distributed tracing
 */

import type { RequestContext } from "./types";

/**
 * Generate a unique request ID
 * Format: req-{uuid} for easy identification in logs
 */
export function generateRequestId(): string {
	if (typeof window !== "undefined") {
		// Browser environment
		if (typeof crypto?.randomUUID === "function") {
			return `req-${crypto.randomUUID()}`;
		}
		// Fallback for older browsers
		return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
	}

	// Node.js environment
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { randomUUID } = require("node:crypto");
		return `req-${randomUUID()}`;
	} catch {
		// Fallback
		return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
	}
}

/**
 * Create a request context object with metadata
 */
export function createRequestContext(
	requestId: string,
	metadata?: Record<string, unknown>,
): RequestContext {
	return {
		requestId,
		timestamp: new Date().toISOString(),
		userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
		...metadata,
	};
}

/**
 * Extract request ID from headers
 * Used on backend to retrieve requestId from frontend
 */
export function extractRequestId(headers: Headers): string | null {
	const requestIdHeader = headers.get("x-request-id");
	if (requestIdHeader) {
		return requestIdHeader;
	}

	// Check alternative header names
	return (
		headers.get("x-request-id") ||
		headers.get("request-id") ||
		headers.get("requestid") ||
		null
	);
}

/**
 * Validate request ID format
 */
export function isValidRequestId(requestId: string): boolean {
	return typeof requestId === "string" && requestId.startsWith("req-");
}
