/**
 * HTTP client for SmartPlay API using fetch with retry logic
 */

import type {
	CrawlerConfig,
	CrawlRequestParams,
	FacilityApiResponse,
} from "./types";
import { CrawlerHttpError } from "./types";

export class SmartPlayHttpClient {
	private config: CrawlerConfig;
	private abortController: AbortController | null = null;

	constructor(config: CrawlerConfig) {
		this.config = config;
	}

	/**
	 * Build headers for API request
	 */
	private buildHeaders(): Record<string, string> {
		return {
			...this.config.headers,
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
			const queryParams = new URLSearchParams({
				distCode: params.distCode,
				faCode: params.faCode,
				playDate: params.playDate,
			});

			const url = `${this.config.api.baseUrl}${this.config.api.endpoint}?${queryParams.toString()}`;

			console.log(`Fetching: ${url}`);

			// Make request using fetch
			const response = await fetch(url, {
				method: "GET",
				headers: this.buildHeaders(),
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
	 * Fetch with retry logic
	 */
	async fetchWithRetry(
		params: CrawlRequestParams,
	): Promise<FacilityApiResponse> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.config.api.retryAttempts; attempt++) {
			try {
				const response = await this.fetchFacilities(params);

				// Log success on retries
				if (attempt > 1) {
					console.log(`Request succeeded on attempt ${attempt}`);
				}

				return response;
			} catch (error) {
				lastError = error as Error;
				console.warn(
					`Attempt ${attempt}/${this.config.api.retryAttempts} failed:`,
					lastError.message,
				);

				// Don't wait after the last attempt
				if (attempt < this.config.api.retryAttempts) {
					const delay = this.config.api.retryDelay * attempt; // Exponential backoff
					console.log(`Retrying in ${delay}ms...`);
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
	 * Delay helper
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
