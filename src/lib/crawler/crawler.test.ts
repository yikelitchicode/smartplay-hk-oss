import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CrawlerDataProcessor } from "./data-processor";
import type { FacilityApiResponse } from "./types";

// Helper to load fixture
function loadFixture(name: string): FacilityApiResponse {
	const path = join(process.cwd(), "scripts/fixtures", name);
	return JSON.parse(readFileSync(path, "utf-8"));
}

describe("CrawlerDataProcessor", () => {
	const processor = new CrawlerDataProcessor();
	const jobId = "test-comp-job-id";

	it("should process standard mock response correctly", () => {
		const rawResponse = loadFixture("mock-response.json");
		const results = processor.processRawResponse(rawResponse, jobId);

		expect(results).toHaveLength(2);
		expect(results[0].venueName).toBe("Hong Kong Park Tennis Court");
		expect(results[0].crawlJobId).toBe(jobId);

		const summary = processor.extractSummary(results);
		expect(summary.totalVenues).toBe(1);
		expect(summary.totalSessions).toBe(2);
		expect(summary.availableSessions).toBe(1);
	});

	it("should process free tennis response correctly (user provided data)", () => {
		const rawResponse = loadFixture("mock-free-tennis.json");
		const results = processor.processRawResponse(rawResponse, jobId);

		// The mock data has 3 venues with 6, 6, 5 sessions respectively for morning/afternoon/evening
		// Actually let's check the data:
		// Morning:
		// - North District: 5 sessions (07:00-12:00)
		// - Po Tsui Park: 5 sessions (07:00-12:00)
		// - Tai Po: 5 sessions (07:00-12:00)
		// Afternoon:
		// - North District: 6 sessions (12:00-18:00)
		// - Po Tsui Park: 6 sessions (12:00-18:00)
		// - Tai Po: 6 sessions (12:00-18:00)
		// Evening:
		// - North District: 5 sessions (18:00-23:00)
		// - Po Tsui Park: 5 sessions (18:00-23:00)
		// - Tai Po: 5 sessions (18:00-23:00)

		// Total per venue: 5+6+5 = 16
		// Total sessions: 16 * 3 = 48

		expect(results).toHaveLength(48);

		const northDistrict = results.filter((r) => r.districtCode === "N");
		expect(northDistrict.length).toBe(16);

		const summary = processor.extractSummary(results);
		expect(summary.totalVenues).toBe(3);
		expect(summary.totalSessions).toBe(48);
		expect(summary.availableSessions).toBe(0); // All false in mock
		expect(summary.periodBreakdown.morning).toBe(15);
		expect(summary.periodBreakdown.afternoon).toBe(18);
		expect(summary.periodBreakdown.evening).toBe(15);
	});

	it("should handle empty api response gracefully", () => {
		const emptyResponse: FacilityApiResponse = {
			code: "0",
			message: "success",
			timestamp: 1234567890,
			data: {
				morning: { distList: [], venueCount: 0 },
				afternoon: { distList: [], venueCount: 0 },
				evening: { distList: [], venueCount: 0 },
				venueCountList: [],
			},
		};

		const results = processor.processRawResponse(emptyResponse, jobId);
		expect(results).toHaveLength(0);
	});
});
