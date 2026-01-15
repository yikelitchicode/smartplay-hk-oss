/**
 * HTTP client for SmartPlay API using fetch with retry logic and circuit breaker
 */

import { crawlerLogger } from "@/lib/logger";
import { CircuitBreaker } from "./circuit-breaker";
import type {
	CrawlerConfig,
	CrawlRequestParams,
	FacilityApiResponse,
} from "./types";
import { CrawlerHttpError } from "./types";

export class SmartPlayHttpClient {
	private config: CrawlerConfig;
	private abortController: AbortController | null = null;
	private circuitBreaker: CircuitBreaker;

	constructor(config: CrawlerConfig, circuitBreaker?: CircuitBreaker) {
		this.config = config;
		// Use provided circuit breaker or create default one
		this.circuitBreaker =
			circuitBreaker ||
			new CircuitBreaker({
				threshold: 5,
				timeout: 60000, // 1 minute
				halfOpenAttempts: 3,
				logging: true,
			});
	}

	/**
	 * Build headers for API request
	 */
	private buildHeaders(lang?: string): Record<string, string> {
		return {
			...this.config.headers,
			"Accept-Language": lang || this.config.headers["Accept-Language"],
			"Accept-Encoding": "gzip, deflate, br, zstd",
			Connection: "keep-alive",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-origin",
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
		};
	}

	/**
	 * Fetch facilities from SmartPlay API
	 */
	async fetchFacilities(
		params: CrawlRequestParams,
	): Promise<FacilityApiResponse> {
		// Create abort controller for timeout
		this.abortController = new AbortController();
		const timeoutId = setTimeout(() => {
			this.abortController?.abort();
		}, this.config.api.timeout);

		try {
			// Build URL with query parameters
			const queryParams = new URLSearchParams();
			queryParams.append("distCode", params.distCode);
			queryParams.append("playDate", params.playDate);

			// Append each facility code - SmartPlay API typically takes multiple faCode params
			for (const code of params.faCode) {
				queryParams.append("faCode", code);
			}

			const url = `${this.config.api.baseUrl}${this.config.api.endpoint}?${queryParams.toString()}`;

			crawlerLogger.info(
				{
					faCode: params.faCode,
					playDate: params.playDate,
					url: url.replace(/\b(playDate=)[^&]+/, "playDate=REDACTED"), // Redact sensitive params
				},
				"Fetching facilities",
			);

			// Make request using fetch
			const response = await fetch(url, {
				method: "GET",
				headers: this.buildHeaders(params.lang),
				signal: this.abortController.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new CrawlerHttpError(
					`HTTP request failed: ${response.status} ${response.statusText}`,
					response.status,
					url,
				);
			}

			// Parse JSON response
			const data: FacilityApiResponse = await response.json();

			// Validate response structure
			if (!data || typeof data !== "object") {
				throw new CrawlerHttpError(
					"Invalid response: not an object",
					undefined,
					url,
				);
			}

			if (data.code === undefined || data.message === undefined) {
				throw new CrawlerHttpError(
					"Invalid response: missing code or message",
					undefined,
					url,
				);
			}

			return data;
		} catch (error) {
			clearTimeout(timeoutId);

			// Re-throw aborted errors as timeout errors
			if (error instanceof Error && error.name === "AbortError") {
				throw new CrawlerHttpError(
					"Request timeout",
					undefined,
					params.toString(),
				);
			}

			// Re-throw CrawlerHttpError
			if (error instanceof CrawlerHttpError) {
				throw error;
			}

			// Wrap other errors
			throw new CrawlerHttpError(
				`Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
				undefined,
				params.toString(),
			);
		} finally {
			this.abortController = null;
		}
	}

	/**
	 * Fetch with retry logic and circuit breaker protection
	 */
	async fetchWithRetry(
		params: CrawlRequestParams,
	): Promise<FacilityApiResponse> {
		// Execute request through circuit breaker
		return this.circuitBreaker.execute(async () => {
			let lastError: Error | null = null;

			for (
				let attempt = 1;
				attempt <= this.config.api.retryAttempts;
				attempt++
			) {
				try {
					const response = await this.fetchFacilities(params);

					// Log success on retries
					if (attempt > 1) {
						crawlerLogger.info(
							{
								attempt,
								maxAttempts: this.config.api.retryAttempts,
							},
							"Request succeeded after retry",
						);
					}

					return response;
				} catch (error) {
					lastError = error as Error;
					crawlerLogger.warn(
						{
							attempt,
							maxAttempts: this.config.api.retryAttempts,
							error: lastError.message,
							errorName: lastError.name,
						},
						"Request attempt failed",
					);

					// Don't wait after the last attempt
					if (attempt < this.config.api.retryAttempts) {
						const delay = this.config.api.retryDelay * attempt; // Linear backoff
						crawlerLogger.debug(
							{
								delay,
								nextAttempt: attempt + 1,
							},
							"Retrying after delay",
						);
						await this.delay(delay);
					}
				}
			}

			// All attempts failed
			throw new CrawlerHttpError(
				`All ${this.config.api.retryAttempts} attempts failed. Last error: ${lastError?.message}`,
				undefined,
				params.toString(),
			);
		});
	}

	/**
	 * Cancel ongoing request
	 */
	cancelRequest(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
	}

	/**
	 * Get circuit breaker state for monitoring
	 */
	getCircuitBreakerState() {
		return this.circuitBreaker.getState();
	}

	/**
	 * Reset circuit breaker (useful for manual recovery)
	 */
	resetCircuitBreaker() {
		this.circuitBreaker.reset();
	}

	/**
	 * Delay helper
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
