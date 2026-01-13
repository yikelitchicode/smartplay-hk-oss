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
const envSchema = z.object({
	// Database
	DATABASE_URL: z
		.string()
		.min(1, "DATABASE_URL cannot be empty")
		.refine(
			(val) => val.startsWith("postgresql://") || val.startsWith("postgres://"),
			"DATABASE_URL must start with postgresql:// or postgres://",
		),

	// Node Environment
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

/**
 * Type inference from the Zod schema
 *
 * This provides TypeScript types that match the validated schema exactly.
 */
type EnvInput = z.input<typeof envSchema>;
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
	const filteredEnv = Object.fromEntries(
		Object.entries(processEnv).filter(([_, value]) => value !== undefined),
	) as EnvInput;

	try {
		return envSchema.parse(filteredEnv);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const formattedErrors = error.errors
				.map((err) => {
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
} as const;

export type EnvConfig = typeof envConfig;

// Re-export for convenience
export default envConfig;
