/**
 * Environment Variable Schema and Validation
 *
 * This module provides type-safe access to environment variables with runtime validation
 * using Zod. It ensures all required environment variables are present and correctly
 * typed at startup.
 *
 * Note: Application configuration (like crawler settings) should be in dedicated
 * config files (see src/lib/crawler-config.ts), not environment variables.
 */

import { z } from "zod";

/**
 * Zod schema for environment variables
 *
 * This defines the shape, validation rules, and defaults for all environment variables.
 * The schema is parsed at startup, providing both runtime validation and TypeScript
 * type inference.
 *
 * Environment variables should only contain:
 * - External service URLs/credentials
 * - Deployment-specific settings
 * - Node environment configuration
 */
const isBrowser = typeof window !== "undefined";
const isTestEnv =
	typeof process !== "undefined" && process.env?.NODE_ENV === "test";

const envSchema = z.object({
	// Database
	DATABASE_URL:
		isBrowser || isTestEnv
			? z.string().default("postgresql://localhost/db")
			: z
					.string()
					.min(1, "DATABASE_URL cannot be empty")
					.refine((val) => {
						try {
							const url = new URL(val);
							// Validate protocol
							const isValidProtocol =
								url.protocol === "postgresql:" || url.protocol === "postgres:";
							if (!isValidProtocol) {
								return false;
							}

							// Check for potentially dangerous parameters that could indicate injection attempts
							const dangerousParams = [
								"sslmode",
								"connect_timeout",
								"statement_timeout",
								"query_timeout",
							];
							const hasDangerousParams = dangerousParams.some((param) =>
								url.searchParams.has(param),
							);
							if (hasDangerousParams) {
								console.warn(
									"⚠️ DATABASE_URL contains potentially unsafe parameters. Ensure these are intentional.",
								);
							}

							// Ensure hostname is present (prevents protocol-only URLs like "postgresql://")
							if (!url.hostname) {
								return false;
							}

							return true;
						} catch {
							// URL parsing failed
							return false;
						}
					}, "DATABASE_URL must be a valid PostgreSQL URL with hostname (e.g., postgresql://user:pass@localhost:5432/db)"),

	// Node Environment
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	BASE_URL:
		isBrowser || isTestEnv
			? z.string().optional()
			: z.string().url().optional(),

	// Features
	ENABLE_SCHEDULER: z
		.string()
		.default("true")
		.transform((val) => val.toLowerCase() === "true"),
	ENABLE_WATCHER: z
		.string()
		.default("true")
		.transform((val) => val.toLowerCase() === "true"),
});

/**
 * Type inference from the Zod schema
 *
 * This provides TypeScript types that match the validated schema exactly.
 */
type EnvOutput = z.output<typeof envSchema>;

/**
 * Parse and validate environment variables
 *
 * @param processEnv - The process environment object (defaults to process.env)
 * @returns Validated and typed environment configuration
 * @throws {z.ZodError} If validation fails
 */
function parseEnv(processEnv: NodeJS.ProcessEnv = process.env): EnvOutput {
	// Filter out undefined values to allow defaults to apply
	// Also filter out empty strings and literal "undefined" strings (can happen in some test runners)
	const filteredEnv = Object.fromEntries(
		Object.entries(processEnv).filter(
			([_, value]) =>
				value !== undefined && value !== "" && value !== "undefined",
		),
	) as Record<string, string>;

	// Provide a dummy DATABASE_URL for tests if not present
	if (
		(filteredEnv.NODE_ENV === "test" || process.env.NODE_ENV === "test") &&
		!filteredEnv.DATABASE_URL
	) {
		filteredEnv.DATABASE_URL =
			"postgresql://postgres:postgres@localhost:5432/postgres";
	}

	try {
		return envSchema.parse(filteredEnv);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const formattedErrors = error.issues
				.map((err: z.ZodIssue) => {
					const path = err.path.join(".");
					return `  - ${path}: ${err.message}`;
				})
				.join("\n");

			throw new Error(
				`Environment variable validation failed:\n${formattedErrors}\n\n` +
					`Please check your .env.local file and ensure all required variables are set correctly.`,
			);
		}
		throw error;
	}
}

// Validate environment at module load time
const env = parseEnv();

/**
 * Type-safe environment configuration object
 *
 * All environment variables are validated at startup and exported here with
 * proper types. Access these values throughout your application instead of
 * using process.env directly.
 *
 * Note: For crawler configuration, use `src/lib/crawler-config.ts` instead.
 *
 * @example
 * ```ts
 * import { envConfig } from './lib/env'
 *
 * if (envConfig.isDevelopment) {
 *   console.log('Running in development mode')
 * }
 * ```
 */
export const envConfig = {
	// Database
	databaseUrl: env.DATABASE_URL,

	// Node
	nodeEnv: env.NODE_ENV,
	isDevelopment: env.NODE_ENV === "development",
	isProduction: env.NODE_ENV === "production",
	isTest: env.NODE_ENV === "test",
	baseUrl:
		env.BASE_URL ??
		(env.NODE_ENV === "development"
			? "http://localhost:3000"
			: "https://smartplay.hk"),

	// Features
	enableScheduler: env.ENABLE_SCHEDULER,
	enableWatcher: env.ENABLE_WATCHER,
} as const;

export type EnvConfig = typeof envConfig;

// Re-export for convenience
export default envConfig;

/**
 * Sanitize secrets from environment configuration for safe logging
 *
 * This function redacts sensitive information (passwords, tokens) from
 * the DATABASE_URL to prevent accidental exposure in logs.
 *
 * @param config - The environment configuration to sanitize
 * @returns Sanitized configuration string with secrets redacted
 *
 * @example
 * ```ts
 * import { envConfig, sanitizeForLogs } from './lib/env'
 *
 * console.log('Database config:', sanitizeForLogs(envConfig))
 * // Output: "Database config: postgresql://user:****@localhost:5432/db"
 * ```
 */
export function sanitizeForLogs(config: EnvConfig): string {
	const sanitizedUrl = config.databaseUrl.replace(/:[^:@]+@/, ":****@");
	return JSON.stringify({
		databaseUrl: sanitizedUrl,
		nodeEnv: config.nodeEnv,
		isDevelopment: config.isDevelopment,
		isProduction: config.isProduction,
		isTest: config.isTest,
	});
}
