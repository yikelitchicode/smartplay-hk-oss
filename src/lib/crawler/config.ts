/**
 * Crawler Configuration
 *
 * Centralized crawler configuration file.
 * Edit this file directly to customize crawler behavior.
 *
 * Configuration immutability:
 * - defaultConfig is deeply frozen and cannot be modified at runtime
 * - Use loadConfig() or getConfigWithOverrides() to create new configurations
 *
 * Reference: https://www.lcsd.gov.hk/en/facilities/facilitiesdetails.html
 */

import type { CrawlerConfig } from "./types";

/**
 * Deep freeze utility for immutable configuration
 *
 * Recursively freezes an object and all its properties to prevent runtime mutations.
 *
 * @param config - Object to freeze
 * @returns Read-only frozen object
 *
 * @example
 * ```typescript
 * const frozen = deepFreeze({ api: { timeout: 30000 } });
 * frozen.api.timeout = 5000; // TypeError: Cannot assign to read only property
 * ```
 */
function deepFreeze<T>(config: T): Readonly<T> {
	// Freeze the root object
	Object.freeze(config);

	// Recursively freeze all nested objects
	Object.getOwnPropertyNames(config).forEach((prop) => {
		const value = config[prop as unknown as keyof T];

		if (
			value &&
			typeof value === "object" &&
			!Object.isFrozen(value) &&
			!(value instanceof Date)
		) {
			deepFreeze(value);
		}
	});

	return config as Readonly<T>;
}

/**
 * Create a mutation detection proxy
 *
 * Wraps an object in a Proxy that throws when mutation is attempted.
 *
 * @param config - Object to wrap
 * @param name - Name for error messages
 * @returns Proxy object that prevents mutations
 *
 * @example
 * ```typescript
 * const config = createMutationProxy({ api: { timeout: 30000 } }, 'config');
 * config.api.timeout = 5000; // Error: Cannot mutate 'config.api.timeout'
 * ```
 */
function createMutationProxy<T extends object>(
	config: T,
	name: string = "config",
): T {
	return new Proxy(config, {
		set(_target, property, _value) {
			throw new Error(
				`Cannot mutate '${String(property)}' on immutable ${name}. Use loadConfig() or getConfigWithOverrides() to create a new configuration.`,
			);
		},
		deleteProperty(_target, property) {
			throw new Error(
				`Cannot delete '${String(property)}' from immutable ${name}. Use loadConfig() or getConfigWithOverrides() to create a new configuration.`,
			);
		},
	});
}

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
export const DISTRICT_REGIONS: Record<DistrictCode, string> = {
	CW: "Hong Kong Island",
	EN: "Hong Kong Island",
	SN: "Hong Kong Island",
	WCH: "Hong Kong Island",
	KC: "Kowloon",
	KT: "Kowloon",
	SSP: "Kowloon",
	WTS: "Kowloon",
	YTM: "Kowloon",
	N: "New Territories",
	SK: "New Territories",
	ST: "New Territories",
	TP: "New Territories",
	IS: "New Territories",
	KWT: "New Territories",
	TW: "New Territories",
	TM: "New Territories",
	YL: "New Territories",
};

/**
 * Valid facility types for LCSD booking system.
 *
 * These are now managed dynamically in the database.
 * This list serves as a fallback for the crawler if the database is uninitialized.
 *
 * Reference: https://www.lcsd.gov.hk/en/facilities/facilitiesdetails.html
 */
export const VALID_FACILITY_TYPES = [
	// ARCH - Archery / 箭藝
	"ARH", // Archery / 箭藝
	// BAGM - Ball Games / 球類運動
	"AMPL", // American Pool / 美式桌球
	"NFBVOLC", // Beach Volleyball (Non-fee) / 沙灘排球 (不收費)
	"FHSP", // Five-a-side Hard Surface Football / 五人硬地足球
	"SPG", // Sportsground / 運動場
	"BADC", // Badminton / 羽毛球
	"BVOLC", // Beach Volleyball Court / 沙灘排球場
	"NFRHOC", // Roller Hockey (Non-fee) / 滾軸曲棍球 (不收費)
	"SHSP", // Seven-a-side Hard Surface Football / 七人硬地足球
	"NFARH", // Archery (Non-fee) / 箭藝 (不收費)
	"BBP", // Baseball / 棒球
	"DEC1", // Dodgebee / 躲避盤
	"RHOC", // Roller Hockey Court / 滾軸曲棍球場
	"BASC", // Basketball / 籃球
	"NFFOTP", // Football (Non-fee) / 足球 (不收費)
	"NFBADC", // Badminton (Non-fee) / 羽毛球 (不收費)
	"BBC", // Batting Cage / 棒球練習場
	"PBC", // Outdoor Pickleball (Non-fee) / 戶外匹克球 (不收費)
	"NFBASC", // Basketball (Non-fee) / 籃球 (不收費)
	"NFBHBC", // Beach Handball (Non-fee) / 沙灘手球 (不收費)
	"BHB", // Beach Handball / 沙灘手球
	"BVOL", // Beach Volleyball / 沙灘排球
	"NFCP", // Cricket (Non-fee) / 板球 (不收費)
	"BILT", // Billiard / 英式桌球
	"NFGBC1", // Gateball (Non-fee) / 門球 (不收費)
	"CART", // Carom Table / 克朗桌球檯
	"NFHBC", // Handball (Non-fee) / 手球 (不收費)
	"CP", // Cricket / 板球
	"NFNB", // Netball (Non-fee) / 投球 (不收費)
	"DBC", // Dodgeball / 閃避球
	"NFTABT", // Table Tennis (Non-fee) / 乒乓球 (不收費)
	"DBC1", // Dodgeball / 閃避球
	"NFTENC", // Tennis (Non-fee) / 網球 (不收費)
	"FOTP", // Football / 足球
	"NFVOLC", // Volleyball (Non-fee) / 排球 (不收費)
	"GBC1", // Gateball / 門球
	"NFCLMW", // Sport Climbing (Non-fee) / 運動攀登 (不收費)
	"GACT", // Gateball Court/Pickleball Court / 門球場/匹克球場
	"GOLF", // Golf / 高爾夫球
	"HBC", // Handball / 手球
	"HOCP", // Hockey / 曲棍球
	"KINBC1", // Kin-ball / 健球
	"KBC", // Korfball / 合球
	"BGNR", // Lawn Bowls / 草地滾球
	"NB", // Netball / 投球
	"PBC1", // Pickleball / 匹克球
	"RHC", // Roller Hockey Court / 滾軸曲棍球場
	"RUGP", // Rugby / 美式足球
	"SQUC", // Squash / 壁球
	"TABT", // Table Tennis / 乒乓球
	"TBC", // Tchoukball / 巧固球
	"TENC", // Tennis / 網球
	"TENP", // Tennis Practice Court / 網球練習場
	"VOLC", // Volleyball / 排球
	"NFBBP", // Baseball (Non-fee) / 棒球 (不收費)
	// CAMP - Camps / 營地
	"HR", // Horse Riding / 騎馬活動
	// CBTS - Contact Sports / 搏擊運動
	"STH", // Sanshou / 散手
	// CYCL - Cycling / 單車運動
	"CYT", // Track Cycling / 場地單車
	// DAAC - Dance and Activities / 舞蹈與活動
	"BR", // Boxing Room / 搏擊室
	"DNRM", // Dance / 舞蹈
	"GTC", // Gymnastic Training Centre / 體操訓練中心
	"JR", // Judo Room / 柔道室
	"ATRM", // Multi-purpose Activities / 多用途活動
	// FITN - Fitness / 健身
	"FITF", // Fitness / 健身
	// SCRC - Sport Climbing and rope course / 運動攀登與繩網運動
	"ROPC", // Rope Course Activities / 繩網活動
	"CLMW", // Sport Climbing / 運動攀登
	// WASP - Water sports / 水上活動
	"BATS", // Bathing Shed / 泳屋
	"CANOE", // Canoeing / 獨木舟
	"COLB", // Color Boat / 彩艇
	"OTHER", // Other crafts / 其他艇類
	"PDB", // Pedal Driven Boat / 水上單車
	"SAIL", // Sailing / 風帆
	"SAMP", // Sampan / 舢舨
	"WINDSURF", // Windsurfing / 滑浪風帆
	// AMPT - Amphitheatre / 露天劇場
	"AMPT", // Amphitheatre / 露天劇場
	// SP - Swimming Pool / 游泳池
	"SP", // Swimming Pool / 泳池
] as const;

export type FacilityType = (typeof VALID_FACILITY_TYPES)[number];

/**
 * Base configuration object
 *
 * Internal mutable configuration that gets frozen on export.
 */
const _baseConfig: CrawlerConfig = {
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
		daysToCrawl: 8, // Fetch current date + next 7 days
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
 * Default crawler configuration (IMMUTABLE)
 *
 * This is the main configuration object used by the crawler.
 * It is deeply frozen and cannot be modified at runtime.
 *
 * To create custom configurations, use:
 * - loadConfig(overrides) - For new base configurations
 * - getConfigWithOverrides(overrides) - For one-off overrides
 *
 * @example
 * ```typescript
 * import { defaultConfig } from './config';
 *
 * // This will throw an error in strict mode:
 * // defaultConfig.api.timeout = 5000;
 *
 * // Correct approach:
 * const customConfig = loadConfig({ timeout: 5000 });
 * ```
 */
export const defaultConfig: Readonly<CrawlerConfig> = deepFreeze(
	createMutationProxy(structuredClone(_baseConfig), "defaultConfig"),
);

/**
 * Load crawler configuration with optional overrides (IMMUTABLE)
 *
 * Creates a new immutable configuration object with the specified overrides.
 * Returns a deeply frozen configuration that cannot be modified at runtime.
 *
 * @param overrides - Optional partial parameters to override defaults
 * @returns New immutable configuration object
 *
 * @example
 * ```typescript
 * import { loadConfig } from './config';
 *
 * const config = loadConfig({
 *   distCode: ['KC', 'SSP'],
 *   faCode: 'BB'
 * });
 *
 * // config is frozen - this will throw an error:
 * // config.api.timeout = 5000;
 * ```
 */
export function loadConfig(
	overrides?: Partial<CrawlerConfig["parameters"]>,
): Readonly<CrawlerConfig> {
	const config = structuredClone(_baseConfig);

	if (overrides) {
		config.parameters = { ...config.parameters, ...overrides };
	}

	return deepFreeze(
		createMutationProxy(config, `loadConfig(${JSON.stringify(overrides)})`),
	);
}

/**
 * Get configuration with runtime overrides (IMMUTABLE)
 *
 * Creates a new immutable configuration with the specified overrides.
 * This is the recommended way to create one-off configuration variations.
 *
 * @param overrides - Partial configuration to override
 * @returns New immutable configuration with overrides applied
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
 *
 * // config is frozen - this will throw an error:
 * // config.schedule.enabled = false;
 * ```
 */
export function getConfigWithOverrides(
	overrides?: Partial<CrawlerConfig["parameters"]>,
): Readonly<CrawlerConfig> {
	const baseConfig = structuredClone(_baseConfig);

	if (overrides) {
		baseConfig.parameters = { ...baseConfig.parameters, ...overrides };
	}

	return deepFreeze(
		createMutationProxy(
			baseConfig,
			`getConfigWithOverrides(${JSON.stringify(overrides)})`,
		),
	);
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

	if (config.parameters.daysToCrawl < 1) {
		errors.push("daysToCrawl must be at least 1");
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
