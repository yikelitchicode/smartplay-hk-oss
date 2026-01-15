/**
 * Tests for booking utility functions
 *
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getAvailabilityColor,
	getFacilityDetails,
	getRegion,
	isSessionPassed,
	normalizeTime,
} from "../utils";

describe("normalizeTime", () => {
	it("should extract first 5 characters from time string", () => {
		expect(normalizeTime("14:30:00")).toBe("14:30");
		expect(normalizeTime("09:05:00")).toBe("09:05");
		expect(normalizeTime("23:59:59")).toBe("23:59");
	});

	it("should handle empty input gracefully", () => {
		expect(normalizeTime("")).toBe("");
	});

	it("should handle short strings", () => {
		expect(normalizeTime("1")).toBe("1");
		expect(normalizeTime("12:3")).toBe("12:3");
	});

	it("should handle times with single digit hours", () => {
		// normalizeTime just takes first 5 chars
		expect(normalizeTime("9:00:00")).toBe("9:00:");
		expect(normalizeTime("09:00:00")).toBe("09:00");
	});
});

describe("getRegion", () => {
	it("should map Hong Kong Island district codes correctly", () => {
		expect(getRegion("CW")).toBe("Hong Kong Island");
		expect(getRegion("EN")).toBe("Hong Kong Island");
		expect(getRegion("SN")).toBe("Hong Kong Island");
		expect(getRegion("WCH")).toBe("Hong Kong Island");
	});

	it("should map Kowloon district codes correctly", () => {
		expect(getRegion("KC")).toBe("Kowloon");
		expect(getRegion("KT")).toBe("Kowloon");
		expect(getRegion("SSP")).toBe("Kowloon");
		expect(getRegion("WTS")).toBe("Kowloon");
		expect(getRegion("YTM")).toBe("Kowloon");
	});

	it("should map New Territories district codes correctly", () => {
		expect(getRegion("TW")).toBe("New Territories");
	});

	it("should default to New Territories for unknown codes", () => {
		expect(getRegion("UNKNOWN")).toBe("New Territories");
		expect(getRegion("")).toBe("New Territories");
		expect(getRegion("INVALID")).toBe("New Territories");
	});
});

describe("isSessionPassed", () => {
	beforeEach(() => {
		// Mock current time for consistent tests
		vi.setSystemTime(new Date("2026-01-14T12:00:00+08:00"));
	});

	it("should identify past sessions on the same day", () => {
		expect(isSessionPassed("2026-01-14", "10:00")).toBe(true);
		expect(isSessionPassed("2026-01-14", "00:00")).toBe(true);
		expect(isSessionPassed("2026-01-14", "11:59")).toBe(true);
	});

	it("should identify future sessions on the same day", () => {
		expect(isSessionPassed("2026-01-14", "14:00")).toBe(false);
		expect(isSessionPassed("2026-01-14", "23:59")).toBe(false);
		expect(isSessionPassed("2026-01-14", "12:01")).toBe(false);
	});

	it("should identify sessions on previous days as passed", () => {
		expect(isSessionPassed("2026-01-13", "23:59")).toBe(true);
		expect(isSessionPassed("2026-01-01", "10:00")).toBe(true);
	});

	it("should identify sessions on future days as not passed", () => {
		expect(isSessionPassed("2026-01-15", "00:00")).toBe(false);
		expect(isSessionPassed("2026-12-31", "10:00")).toBe(false);
	});

	it("should handle timezone correctly (HK +08:00)", () => {
		// Test midnight boundary
		expect(isSessionPassed("2026-01-14", "00:00")).toBe(true);
		expect(isSessionPassed("2026-01-15", "00:00")).toBe(false);
	});
});

describe("getFacilityDetails", () => {
	it("should lookup paid facilities by code", () => {
		const result = getFacilityDetails("BASC", "籃球", "Basketball");
		expect(result).toEqual({
			name: "籃球",
			priceType: "Paid",
		});
	});

	it("should detect free facilities by NF prefix", () => {
		const result = getFacilityDetails("NFBASC", "籃球", "Basketball");
		expect(result).toEqual({
			name: "籃球",
			priceType: "Free",
		});
	});

	it("should handle unknown facility codes gracefully", () => {
		const result = getFacilityDetails("UNKNOWN", "Unknown", "Unknown");
		expect(result.name).toBe("Unknown");
		expect(result.priceType).toBe("Paid"); // Default assumption
	});

	it("should handle various paid facility codes", () => {
		expect(getFacilityDetails("FOTP", "足球", "Football")).toEqual({
			name: "足球",
			priceType: "Paid",
		});

		expect(getFacilityDetails("VOLC", "排球", "Volleyball")).toEqual({
			name: "排球",
			priceType: "Paid",
		});
	});

	it("should handle various free facility codes", () => {
		expect(getFacilityDetails("NFFOTP", "足球", "Football")).toEqual({
			name: "足球",
			priceType: "Free",
		});

		expect(getFacilityDetails("NFVOLC", "排球", "Volleyball")).toEqual({
			name: "排球",
			priceType: "Free",
		});
	});
});

describe("getAvailabilityColor", () => {
	describe("gray theme for no sessions", () => {
		it("should return gray theme when total is 0", () => {
			const result = getAvailabilityColor(0, 0);
			expect(result.bg).toBe("bg-porcelain-100");
			expect(result.text).toBe("text-porcelain-400");
			expect(result.border).toBe("border-porcelain-200");
			expect(result.hover).toBe("");
			expect(result.ring).toBe("");
			expect(result.disabled).toBe(true);
		});
	});

	describe("meadow green theme for high availability (≥50%)", () => {
		it("should return meadow green theme for 50% availability", () => {
			const result = getAvailabilityColor(100, 50);
			expect(result.bg).toBe("bg-meadow-green-100");
			expect(result.text).toBe("text-meadow-green-800");
			expect(result.border).toBe("border-meadow-green-200");
			expect(result.hover).toBe("hover:bg-meadow-green-200");
			expect(result.ring).toBe("focus:ring-meadow-green-500");
			expect(result.disabled).toBe(false);
		});

		it("should return meadow green theme for 60% availability", () => {
			const result = getAvailabilityColor(100, 60);
			expect(result.bg).toBe("bg-meadow-green-100");
		});

		it("should return meadow green theme for 100% availability", () => {
			const result = getAvailabilityColor(1, 1);
			expect(result.bg).toBe("bg-meadow-green-100");
		});
	});

	describe("vanilla custard theme for medium availability (20-50%)", () => {
		it("should return vanilla custard theme for 20% availability", () => {
			const result = getAvailabilityColor(100, 20);
			expect(result.bg).toBe("bg-vanilla-custard-100");
			expect(result.text).toBe("text-vanilla-custard-800");
			expect(result.border).toBe("border-vanilla-custard-200");
			expect(result.hover).toBe("hover:bg-vanilla-custard-200");
			expect(result.ring).toBe("focus:ring-vanilla-custard-500");
			expect(result.disabled).toBe(false);
		});

		it("should return vanilla custard theme for 30% availability", () => {
			const result = getAvailabilityColor(100, 30);
			expect(result.bg).toBe("bg-vanilla-custard-100");
		});

		it("should return vanilla custard theme for 49% availability", () => {
			const result = getAvailabilityColor(100, 49);
			expect(result.bg).toBe("bg-vanilla-custard-100");
		});
	});

	describe("tangerine dream theme for low availability (<20%)", () => {
		it("should return tangerine dream theme for 19% availability", () => {
			const result = getAvailabilityColor(100, 19);
			expect(result.bg).toBe("bg-tangerine-dream-100");
			expect(result.text).toBe("text-tangerine-dream-800");
			expect(result.border).toBe("border-tangerine-dream-200");
			expect(result.hover).toBe("hover:bg-tangerine-dream-200");
			expect(result.ring).toBe("focus:ring-tangerine-dream-500");
			expect(result.disabled).toBe(false);
		});

		it("should return tangerine dream theme for 10% availability", () => {
			const result = getAvailabilityColor(100, 10);
			expect(result.bg).toBe("bg-tangerine-dream-100");
		});

		it("should return tangerine dream theme for 1% availability", () => {
			const result = getAvailabilityColor(100, 1);
			expect(result.bg).toBe("bg-tangerine-dream-100");
		});
	});

	describe("edge cases", () => {
		it("should handle 0 available when total > 0", () => {
			const result = getAvailabilityColor(10, 0);
			expect(result.bg).toBe("bg-porcelain-100");
			expect(result.disabled).toBe(true);
		});

		it("should handle exact 20% boundary", () => {
			const result1 = getAvailabilityColor(5, 1); // 20%
			expect(result1.bg).toBe("bg-vanilla-custard-100");
		});

		it("should handle exact 50% boundary", () => {
			const result1 = getAvailabilityColor(2, 1); // 50%
			expect(result1.bg).toBe("bg-meadow-green-100");
		});

		it("should handle single session availability", () => {
			const result = getAvailabilityColor(1, 1); // 100%
			expect(result.bg).toBe("bg-meadow-green-100");
		});

		it("should handle large numbers", () => {
			const result = getAvailabilityColor(10000, 1500); // 15%
			expect(result.bg).toBe("bg-tangerine-dream-100");
		});
	});
});
