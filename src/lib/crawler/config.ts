/**
 * Crawler Configuration
 *
 * Centralized crawler configuration file.
 * Edit this file directly to customize crawler behavior.
 *
 * Reference: https://www.lcsd.gov.hk/en/facilities/facilitiesdetails.html
 */

import type { CrawlerConfig } from "./types";

/**
 * Valid district codes for Hong Kong LCSD facilities, grouped by region
 */
export const VALID_DISTRICTS = [
	// Hong Kong Island
	"CW", // Central and Western
	"EN", // Eastern
	"SN", // Southern
	"WCH", // Wan Chai

	// Kowloon
	"KC", // Kowloon City
	"KT", // Kwun Tong
	"SSP", // Sham Shui Po
	"WTS", // Wong Tai Sin (Note: Official code is WTS)
	"YTM", // Yau Tsim Mong

	// New Territories East
	"N", // North
	"SK", // Sai Kung
	"ST", // Sha Tin
	"TP", // Tai Po

	// New Territories West
	"IS", // Islands
	"KWT", // Kwai Tsing
	"TW", // Tsuen Wan
	"TM", // Tuen Mun
	"YL", // Yuen Long
] as const;

export type DistrictCode = (typeof VALID_DISTRICTS)[number];

/**
 * Valid facility types for LCSD booking system (Ball Games / BAGM)
 */
export const VALID_FACILITY_TYPES = [
	"TENC", // Tennis
	"NFTENC", // Tennis (Free)
	"BADC", // Badminton
	"NFBADC", // Badminton (Free)
	"BASC", // Basketball
	"NFBASC", // Basketball (Free)
	"FOTP", // Football
	"NFFOTP", // Football (Free)
	"TABT", // Table Tennis
	"NFTABT", // Table Tennis (Free)
	"SQUC", // Squash
	"VOLC", // Volleyball
	"NFVOLC", // Volleyball (Free)
	"NB", // Netball
	"NFNB", // Netball (Free)
	"GOLF", // Golf
	"CP", // Cricket
	"NFCP", // Cricket (Free)
	"BGNR", // Lawn Bowls
	"HBC", // Handball
	"NFHBC", // Handball (Free)
	"HOCP", // Hockey
	"BB", // Basketball (Urban)
	"FB", // Football (Urban)
	"VB", // Volleyball (Urban)
] as const;

export type FacilityType = (typeof VALID_FACILITY_TYPES)[number];

/**
 * Default crawler configuration
 *
 * This is the main configuration object used by the crawler.
 * Modify these values to change crawler behavior.
 */
export const defaultConfig: CrawlerConfig = {
	api: {
		baseUrl: "https://www.smartplay.lcsd.gov.hk",
		endpoint: "/rest/facility-catalog/api/v1/publ/facilities",
		timeout: 30000, // 30 seconds
		retryAttempts: 3,
		retryDelay: 1000,
	},
	headers: {
		"User-Agent":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0",
		Accept: "application/json",
		"Accept-Language": "zh-hk",
		channel: "INTERNET",
		"Content-Type": "application/json; charset=utf-8",
	},
	parameters: {
		distCode: [...VALID_DISTRICTS], // Monitor all 18 districts by default
		faCode: [...VALID_FACILITY_TYPES], // Monitor all facility types
		playDate: new Date().toISOString().split("T")[0], // Today's date
	},
	schedule: {
		enabled: true,
		interval: "0 */30 * * * *", // Every 30 minutes
		timezone: "Asia/Hong_Kong",
	},
	processing: {
		skipDuplicates: true,
		flattenStructure: true,
		includeTimeSlots: true,
	},
	recovery: {
		maxRetryAttemptsPerDay: 3,
		retryDelayBase: 2000,
		enableCheckpoints: true,
		staleRunThresholdMs: 3600000, // 1 hour
	},
};

/**
 * Load crawler configuration with optional overrides
 *
 * @param overrides - Optional partial parameters to override defaults
 * @returns Current crawler configuration
 */
export function loadConfig(
	overrides?: Partial<CrawlerConfig["parameters"]>,
): CrawlerConfig {
	const config = { ...defaultConfig };
	if (overrides) {
		config.parameters = { ...config.parameters, ...overrides };
	}
	return config;
}

/**
 * Get configuration with runtime overrides
 *
 * Allows temporarily overriding configuration for specific requests.
 *
 * @param overrides - Partial configuration to override
 * @returns Configuration with overrides applied
 *
 * @example
 * ```typescript
 * import { getConfigWithOverrides } from './lib/crawler/config'
 *
 * // Crawl specific districts
 * const config = getConfigWithOverrides({
 *   distCode: ['KC', 'SSP'],
 *   faCode: 'FB'
 * })
 * ```
 */
export function getConfigWithOverrides(
	overrides?: Partial<CrawlerConfig["parameters"]>,
): CrawlerConfig {
	const config = loadConfig();

	if (overrides) {
		return {
			...config,
			parameters: {
				...config.parameters,
				...overrides,
			},
		};
	}

	return config;
}

/**
 * Update crawler configuration
 *
 * Permanently updates the default configuration for this session.
 *
 * @param updates - Partial configuration to update
 *
 * @example
 * ```typescript
 * import { updateConfig } from './lib/crawler/config'
 *
 * updateConfig({
 *   parameters: {
 *     distCode: ['KC', 'SSP', 'WT'],
 *     faCode: 'BB'
 *   },
 *   schedule: {
 *     enabled: false
 *   }
 * })
 * ```
 */
export function updateConfig(updates: Partial<CrawlerConfig>): void {
	Object.assign(defaultConfig, updates);
}

/**
 * Validate configuration
 *
 * Ensures configuration values are valid before use.
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors if any
 */
export function validateConfig(config: CrawlerConfig): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate API configuration
	if (!config.api.baseUrl) {
		errors.push("API base URL is required");
	}
	if (!config.api.endpoint) {
		errors.push("API endpoint is required");
	}
	if (config.api.timeout < 1000) {
		errors.push("API timeout must be at least 1000ms");
	}
	if (config.api.retryAttempts < 0) {
		errors.push("Retry attempts cannot be negative");
	}

	// Validate parameters
	if (!config.parameters.distCode || config.parameters.distCode.length === 0) {
		errors.push("At least one district code is required");
	}
	if (!config.parameters.faCode) {
		errors.push("Facility code is required");
	}
	if (
		!config.parameters.playDate ||
		!/^\d{4}-\d{2}-\d{2}$/.test(config.parameters.playDate)
	) {
		errors.push("Play date must be in YYYY-MM-DD format");
	}

	// Validate schedule
	if (!/^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/.test(config.schedule.interval)) {
		errors.push("Invalid cron expression for schedule interval");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
