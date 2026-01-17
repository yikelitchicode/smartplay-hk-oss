/**
 * Cloudflare Turnstile Verifier
 *
 * Server-side verification for Cloudflare Turnstile tokens.
 * Prevents bot abuse through score-based challenge verification.
 *
 * Security features:
 * - Request timeout to prevent hanging
 * - Token validation (length, format)
 * - Hostname verification
 * - Error message sanitization
 * - Retry logic for transient failures
 */

import { createLogger } from "@/lib/logger";
import type { TurnstileConfig, TurnstileVerifyResponse } from "../types";

const logger = createLogger({ module: "watch-turnstile" });

// Security constants
const MAX_TOKEN_LENGTH = 2048;
const DEFAULT_REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

// Sanitize error messages to prevent information leakage
function sanitizeError(error: string): string {
	// Map specific error codes to user-friendly messages
	const errorMap: Record<string, string> = {
		"missing-input-secret": "Configuration error",
		"invalid-input-secret": "Configuration error",
		"missing-input-response": "Verification required",
		"invalid-input-response": "Verification failed",
		"bad-request": "Invalid request",
		"timeout-or-duplicate": "Verification expired",
		"internal-error": "Service temporarily unavailable",
	};

	return errorMap[error] || "Verification failed";
}

export class TurnstileVerifier {
	private config: TurnstileConfig;
	private requestTimeout: number;

	constructor(
		config: TurnstileConfig,
		requestTimeout = DEFAULT_REQUEST_TIMEOUT,
	) {
		this.config = config;
		this.requestTimeout = requestTimeout;
	}

	/**
	 * Check if Turnstile verification is enabled
	 */
	isEnabled(): boolean {
		return (
			this.config.enabled &&
			!!this.config.secretKey &&
			this.config.minScore >= 0 &&
			this.config.minScore <= 1
		);
	}

	/**
	 * Verify Turnstile token from client-side
	 *
	 * @param token - Turnstile token from client-side widget
	 * @param remoteIp - Optional remote IP address for additional verification
	 * @param expectedHostname - Optional expected hostname for additional security
	 * @returns Verification result with validity status and score
	 */
	async verifyToken(
		token: string,
		remoteIp?: string,
		expectedHostname?: string,
	): Promise<{
		valid: boolean;
		score?: number;
		error?: string;
	}> {
		// If Turnstile is disabled, auto-approve
		if (!this.isEnabled()) {
			logger.debug("Turnstile verification disabled, auto-approving");
			return { valid: true };
		}

		// Validate token format (security: prevent DoS with extremely long tokens)
		if (!token || typeof token !== "string") {
			logger.warn("Missing or invalid Turnstile token");
			return { valid: false, error: "Verification required" };
		}

		if (token.length > MAX_TOKEN_LENGTH) {
			logger.warn(
				{ tokenLength: token.length },
				"Token exceeds maximum length",
			);
			return { valid: false, error: "Verification failed" };
		}

		if (!this.config.secretKey) {
			logger.error("Turnstile secret key not configured");
			return { valid: false, error: "Configuration error" };
		}

		// Attempt verification with retry logic
		let lastError: Error | undefined;
		for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
			try {
				const result = await this.attemptVerification(
					token,
					remoteIp,
					expectedHostname,
				);
				if (result.valid) {
					return result;
				}
				// Don't retry on validation failures, only on network errors
				return result;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				logger.warn(
					{ attempt, error: lastError.message },
					"Verification attempt failed",
				);

				if (attempt < MAX_RETRY_ATTEMPTS) {
					// Exponential backoff
					await new Promise((resolve) =>
						setTimeout(resolve, RETRY_DELAY_MS * 2 ** attempt),
					);
				}
			}
		}

		// All retries exhausted
		logger.error({ error: lastError }, "Verification failed after all retries");
		return {
			valid: false,
			error: "Service temporarily unavailable",
		};
	}

	/**
	 * Attempt a single verification request
	 */
	private async attemptVerification(
		token: string,
		remoteIp: string | undefined,
		expectedHostname: string | undefined,
	): Promise<{
		valid: boolean;
		score?: number;
		error?: string;
	}> {
		// Create abort controller for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

		try {
			const params = new URLSearchParams({
				secret: this.config.secretKey ?? "",
				response: token,
			});

			if (remoteIp) {
				params.append("remoteip", remoteIp);
			}

			const response = await fetch(this.config.verifyUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: params,
				signal: controller.signal,
			});

			if (!response.ok) {
				logger.error(
					{ status: response.status },
					"Turnstile verification request failed",
				);
				throw new Error(`HTTP ${response.status}`);
			}

			const data: TurnstileVerifyResponse = await response.json();

			if (!data.success) {
				const errorCodes = data["error-codes"] || [];
				logger.warn({ errorCodes }, "Turnstile verification failed");

				// Check for timeout-or-duplicate error (token already used)
				if (errorCodes.includes("timeout-or-duplicate")) {
					return {
						valid: false,
						error: "Verification expired, please refresh",
					};
				}

				return {
					valid: false,
					error: sanitizeError(errorCodes[0]) || "Verification failed",
				};
			}

			// Verify hostname if provided (security: prevent token replay)
			if (expectedHostname && data.hostname !== expectedHostname) {
				logger.warn(
					{
						expected: expectedHostname,
						received: data.hostname,
					},
					"Hostname mismatch",
				);
				return { valid: false, error: "Verification failed" };
			}

			// Check score if available (for managed challenges)
			const score = data.score;
			if (score !== undefined) {
				if (score < this.config.minScore) {
					logger.warn(
						{ score, minScore: this.config.minScore },
						"Turnstile score below threshold",
					);
					return {
						valid: false,
						error: "Verification failed",
					};
				}
				logger.info({ score }, "Turnstile verification passed with score");
				return { valid: true, score };
			}

			// Non-managed challenge (no score)
			logger.info("Turnstile verification passed (non-managed challenge)");
			return { valid: true };
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
