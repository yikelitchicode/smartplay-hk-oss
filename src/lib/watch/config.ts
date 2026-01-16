/**
 * Watch Scheduler Configuration
 *
 * Centralized watch scheduler configuration file.
 * Edit this file directly to customize watcher behavior.
 *
 * Configuration immutability:
 * - defaultConfig is deeply frozen and cannot be modified at runtime
 * - Use loadConfig() or getConfigWithOverrides() to create new configurations
 */

import type { WatchConfig } from "./types";

/**
 * Deep freeze utility for immutable configuration
 */
function deepFreeze<T>(config: T): Readonly<T> {
	Object.freeze(config);
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
 * Base configuration object
 */
const _baseConfig: WatchConfig = {
	// Scheduler settings
	schedule: {
		enabled: true,
		interval: "*/5 * * * *", // Every 5 minutes
		timezone: "Asia/Hong_Kong",
	},

	// Cleanup settings
	cleanup: {
		enabled: true,
		interval: "0 2 * * *", // Daily at 2 AM
		expiredWatcherRetentionDays: 30, // Keep expired watchers for 30 days
		watchHitRetentionDays: 90, // Keep hit history for 90 days
		staleSessionRetentionDays: 180, // Remove inactive sessions after 180 days
	},

	// Evaluation settings
	evaluation: {
		batchSize: 100, // Process watchers in batches
		maxConcurrentEvaluations: 5, // Parallel evaluation limit
		evaluationTimeoutMs: 30000, // 30 seconds per batch
	},

	// Notification settings
	notifications: {
		enabled: true,
		timeoutMs: 5000, // Webhook request timeout
		retryAttempts: 3, // Retry failed notifications
		retryDelayBase: 2000, // Exponential backoff base
		rateLimitPerMinute: 10, // Max notifications per minute per session
	},

	// Cloudflare Turnstile settings
	turnstile: {
		enabled: true,
		verifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
		siteKey: process.env.CLOUDFLARE_TURNSTILE_SITE_KEY,
		secretKey: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
		minScore: 0.5, // Minimum score to pass (0.0 - 1.0)
	},

	// Webhook validation
	webhook: {
		allowedHosts: [
			"discord.com",
			"discordapp.com",
			"hooks.slack.com",
			"api.slack.com",
		],
		maxUrlLength: 2048,
	},
};

/**
 * Default watch scheduler configuration (IMMUTABLE)
 */
export const defaultConfig: Readonly<WatchConfig> = deepFreeze(
	createMutationProxy(structuredClone(_baseConfig), "defaultConfig"),
);

/**
 * Load watch scheduler configuration with optional overrides (IMMUTABLE)
 */
export function loadConfig(
	overrides?: Partial<WatchConfig>,
): Readonly<WatchConfig> {
	const config = structuredClone(_baseConfig);

	if (overrides) {
		Object.assign(config, overrides);
	}

	return deepFreeze(
		createMutationProxy(config, `loadConfig(${JSON.stringify(overrides)})`),
	);
}

/**
 * Get configuration with runtime overrides (IMMUTABLE)
 */
export function getConfigWithOverrides(
	overrides?: Partial<WatchConfig>,
): Readonly<WatchConfig> {
	const baseConfig = structuredClone(_baseConfig);

	if (overrides) {
		Object.assign(baseConfig, overrides);
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
 */
export function validateConfig(config: WatchConfig): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate schedule
	if (!/^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/.test(config.schedule.interval)) {
		errors.push("Invalid cron expression for schedule interval");
	}

	// Validate cleanup
	if (config.cleanup.expiredWatcherRetentionDays < 1) {
		errors.push("expiredWatcherRetentionDays must be at least 1");
	}
	if (config.cleanup.watchHitRetentionDays < 1) {
		errors.push("watchHitRetentionDays must be at least 1");
	}

	// Validate evaluation
	if (config.evaluation.batchSize < 1) {
		errors.push("batchSize must be at least 1");
	}
	if (config.evaluation.maxConcurrentEvaluations < 1) {
		errors.push("maxConcurrentEvaluations must be at least 1");
	}

	// Validate notifications
	if (config.notifications.timeoutMs < 1000) {
		errors.push("timeoutMs must be at least 1000ms");
	}
	if (config.notifications.retryAttempts < 0) {
		errors.push("retryAttempts cannot be negative");
	}

	// Validate Turnstile
	if (config.turnstile.enabled && !config.turnstile.secretKey) {
		errors.push(
			"CLOUDFLARE_TURNSTILE_SECRET_KEY is required when Turnstile is enabled",
		);
	}
	if (config.turnstile.minScore < 0 || config.turnstile.minScore > 1) {
		errors.push("turnstile.minScore must be between 0 and 1");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
