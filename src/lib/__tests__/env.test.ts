/**
 * Tests for environment variable validation and utilities
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it } from "vitest";
import { envConfig, sanitizeForLogs } from "../env";

describe("env.ts", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset process.env before each test
		process.env = { ...originalEnv };
	});

	describe("envConfig", () => {
		it("should have required properties", () => {
			expect(envConfig).toHaveProperty("databaseUrl");
			expect(envConfig).toHaveProperty("nodeEnv");
			expect(envConfig).toHaveProperty("isDevelopment");
			expect(envConfig).toHaveProperty("isProduction");
			expect(envConfig).toHaveProperty("isTest");
		});

		it("should have valid DATABASE_URL", () => {
			expect(envConfig.databaseUrl).toBeTruthy();
			expect(typeof envConfig.databaseUrl).toBe("string");
		});

		it("should have valid NODE_ENV", () => {
			expect(["development", "production", "test"]).toContain(
				envConfig.nodeEnv,
			);
		});

		it("should correctly detect environment type", () => {
			const envTypes = [
				envConfig.isDevelopment,
				envConfig.isProduction,
				envConfig.isTest,
			];

			// Exactly one should be true
			const trueCount = envTypes.filter(Boolean).length;
			expect(trueCount).toBe(1);
		});
	});

	describe("DATABASE_URL validation", () => {
		it("should have valid PostgreSQL URL format", () => {
			// The envConfig should have a valid DATABASE_URL
			const url = envConfig.databaseUrl;
			expect(url).toMatch(/^postgresql:\/\/|^postgres:\/\//);
			expect(url).toContain("@");
			expect(url).toContain("://");
		});

		it("should have hostname in DATABASE_URL", () => {
			const url = new URL(envConfig.databaseUrl);
			expect(url.hostname).toBeTruthy();
			expect(url.hostname.length).toBeGreaterThan(0);
		});

		it("should have valid port or use default", () => {
			const url = new URL(envConfig.databaseUrl);
			// Port can be specified or use default (5432)
			const port = url.port;
			if (port) {
				expect(parseInt(port, 10)).toBeGreaterThan(0);
				expect(parseInt(port, 10)).toBeLessThan(65536);
			}
		});
	});

	describe("NODE_ENV validation", () => {
		it("should have valid NODE_ENV value", () => {
			expect(["development", "production", "test"]).toContain(
				envConfig.nodeEnv,
			);
		});

		it("should correctly detect environment", () => {
			// Exactly one of these should be true
			const envFlags = [
				envConfig.isDevelopment,
				envConfig.isProduction,
				envConfig.isTest,
			];
			const trueCount = envFlags.filter(Boolean).length;
			expect(trueCount).toBe(1);
		});
	});

	describe("sanitizeForLogs", () => {
		it("should redact password from DATABASE_URL", () => {
			const config = {
				databaseUrl: "postgresql://user:secret123@localhost:5432/db",
				nodeEnv: "development" as const,
				isDevelopment: true,
				isProduction: false,
				isTest: false,
				enableScheduler: false,
			};

			const sanitized = sanitizeForLogs(config);
			expect(sanitized).toContain(":****@");
			expect(sanitized).not.toContain("secret123");
		});

		it("should include all config properties in output", () => {
			const config = {
				databaseUrl: "postgresql://user:pass@localhost:5432/db",
				nodeEnv: "production" as const,
				isDevelopment: false,
				isProduction: true,
				isTest: false,
				enableScheduler: false,
			};

			const sanitized = sanitizeForLogs(config);
			const parsed = JSON.parse(sanitized);

			expect(parsed).toHaveProperty("databaseUrl");
			expect(parsed).toHaveProperty("nodeEnv");
			expect(parsed).toHaveProperty("isDevelopment");
			expect(parsed).toHaveProperty("isProduction");
			expect(parsed).toHaveProperty("isTest");
		});

		it("should handle URLs with special characters in password", () => {
			const config = {
				databaseUrl: "postgresql://user:p@ss!w0rd@localhost:5432/db",
				nodeEnv: "test" as const,
				isDevelopment: false,
				isProduction: false,
				isTest: true,
				enableScheduler: false,
			};

			const sanitized = sanitizeForLogs(config);
			expect(sanitized).toContain(":****@");
			expect(sanitized).not.toContain("p@ss!w0rd");
		});

		it("should handle URLs without password", () => {
			const config = {
				databaseUrl: "postgresql://user@localhost:5432/db",
				nodeEnv: "development" as const,
				isDevelopment: true,
				isProduction: false,
				isTest: false,
				enableScheduler: false,
			};

			const sanitized = sanitizeForLogs(config);
			// The sanitizeForLogs function uses regex :[^:@]+@ which won't match URLs without password
			// So the URL stays as-is (with "user" instead of "****"), which is fine since there's no secret
			const parsed = JSON.parse(sanitized);
			// The username "user" is not a secret, so it's acceptable to leave it
			expect(parsed.databaseUrl).toContain("localhost:5432/db");
		});

		it("should produce valid JSON string", () => {
			const config = {
				databaseUrl: "postgresql://user:pass@localhost:5432/db",
				nodeEnv: "production" as const,
				isDevelopment: false,
				isProduction: true,
				isTest: false,
				enableScheduler: false,
			};

			const sanitized = sanitizeForLogs(config);

			expect(() => {
				JSON.parse(sanitized);
			}).not.toThrow();
		});
	});
});
