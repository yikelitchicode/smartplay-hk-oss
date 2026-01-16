/**
 * Cloudflare Turnstile Verifier
 *
 * Server-side verification for Cloudflare Turnstile tokens.
 * Prevents bot abuse through score-based challenge verification.
 */

import { createLogger } from "@/lib/logger";
import type { TurnstileConfig, TurnstileVerifyResponse } from "../types";

const logger = createLogger({ module: "watch-turnstile" });

export class TurnstileVerifier {
	private config: TurnstileConfig;

	constructor(config: TurnstileConfig) {
		this.config = config;
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
	 * @returns Verification result with validity status and score
	 */
	async verifyToken(
		token: string,
		remoteIp?: string,
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

		if (!token) {
			logger.warn("Missing Turnstile token");
			return { valid: false, error: "Missing verification token" };
		}

		if (!this.config.secretKey) {
			logger.error("Turnstile secret key not configured");
			return { valid: false, error: "Verification service misconfigured" };
		}

		try {
			const response = await fetch(this.config.verifyUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					secret: this.config.secretKey,
					response: token,
					remoteip: remoteIp || "",
				}),
			});

			if (!response.ok) {
				logger.error(
					{ status: response.status },
					"Turnstile verification request failed",
				);
				return {
					valid: false,
					error: `Verification service error: ${response.status}`,
				};
			}

			const data: TurnstileVerifyResponse = await response.json();

			if (!data.success) {
				logger.warn(
					{ errorCodes: data["error-codes"] },
					"Turnstile verification failed",
				);
				return {
					valid: false,
					error: `Verification failed: ${data["error-codes"]?.join(", ")}`,
				};
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
						error: `Score ${score} below minimum ${this.config.minScore}`,
					};
				}
				logger.info({ score }, "Turnstile verification passed with score");
				return { valid: true, score };
			}

			// Non-managed challenge (no score)
			logger.info("Turnstile verification passed (non-managed challenge)");
			return { valid: true };
		} catch (error) {
			logger.error({ error }, "Turnstile verification request error");
			return {
				valid: false,
				error:
					error instanceof Error ? error.message : "Verification service error",
			};
		}
	}
}
