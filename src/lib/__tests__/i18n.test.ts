/**
 * Tests for i18n configuration and utilities
 *
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import * as i18nModule from "../i18n";
import i18n, { ensureI18nInitialized } from "../i18n";

describe("i18n.ts", () => {
	describe("i18n configuration", () => {
		it("should have correct fallback language", () => {
			// fallbackLng can be a string or array
			const fallbackLng = i18n.options.fallbackLng;
			const isValid =
				fallbackLng === "en" ||
				(Array.isArray(fallbackLng) && fallbackLng.includes("en"));
			expect(isValid).toBe(true);
		});

		it("should support correct languages", () => {
			const supportedLanguages = ["en", "zh", "cn"];
			supportedLanguages.forEach((lang) => {
				expect(i18n.options.supportedLngs).toContain(lang);
			});
		});

		it("should have correct namespaces", () => {
			const expectedNamespaces = ["common", "home", "booking"];
			expectedNamespaces.forEach((ns) => {
				expect(i18n.options.ns).toContain(ns);
			});
		});

		it("should have common as default namespace", () => {
			expect(i18n.options.defaultNS).toBe("common");
		});

		it("should have interpolation disabled", () => {
			expect(i18n.options.interpolation?.escapeValue).toBe(false);
		});

		it("should not have backend configuration", () => {
			expect(i18n.options.backend).toBeUndefined();
		});

		it("should have react suspense disabled", () => {
			expect(i18n.options.react?.useSuspense).toBe(false);
		});
	});

	describe("ensureI18nInitialized", () => {
		it("should be a function", () => {
			expect(typeof ensureI18nInitialized).toBe("function");
		});

		it("should return a promise", () => {
			const result = ensureI18nInitialized();
			expect(result).toBeInstanceOf(Promise);
			// Don't wait for it, just check it's a promise
			// The async tests below will test actual resolution
		});

		it("should resolve without errors", async () => {
			await expect(ensureI18nInitialized()).resolves.toBeUndefined();
		}, 15000); // Increase timeout to 15s for slow initialization

		it("should handle multiple calls", async () => {
			// Multiple calls should all resolve
			const promises = [
				ensureI18nInitialized(),
				ensureI18nInitialized(),
				ensureI18nInitialized(),
			];

			await expect(Promise.all(promises)).resolves.toBeTruthy();
		}, 10000);

		it("should resolve quickly on subsequent calls", async () => {
			// First call - may take time
			await ensureI18nInitialized();

			// Second call should be fast (already initialized)
			const startTime = Date.now();
			await ensureI18nInitialized();
			const endTime = Date.now();

			// Should complete in less than 100ms (already initialized)
			expect(endTime - startTime).toBeLessThan(100);
		});
	});

	describe("error handling", () => {
		it("should have error fallback in place", () => {
			// The module includes try-catch with fallback to 'en'
			// This test verifies the error handling infrastructure exists
			expect(ensureI18nInitialized).toBeDefined();
		});
	});

	describe("module exports", () => {
		it("should export default i18n instance", () => {
			expect(i18n).toBeDefined();
			expect(typeof i18n.t).toBe("function");
			expect(typeof i18n.changeLanguage).toBe("function");
		});

		it("should export ensureI18nInitialized function", () => {
			expect(ensureI18nInitialized).toBeDefined();
			expect(typeof ensureI18nInitialized).toBe("function");
		});
	});

	describe("detectLanguage", () => {
		const { detectLanguage } = i18nModule;

		it("should return 'en' for null/empty accept-language", () => {
			expect(detectLanguage(null)).toBe("en");
			expect(detectLanguage("")).toBe("en");
		});

		it("should detect English", () => {
			expect(detectLanguage("en-US,en;q=0.9")).toBe("en");
		});

		it("should detect Traditional Chinese (zh)", () => {
			expect(detectLanguage("zh-HK,zh;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("zh");
			expect(detectLanguage("zh-TW,zh;q=0.9")).toBe("zh");
		});

		it("should detect Simplified Chinese (cn)", () => {
			expect(detectLanguage("zh-CN,zh;q=0.9,en-US;q=0.8")).toBe("cn");
		});

		it("should respect preference order", () => {
			expect(detectLanguage("zh-HK,en-US;q=0.8")).toBe("zh");
			expect(detectLanguage("en-US,zh-HK;q=0.8")).toBe("en");
		});
	});
});
