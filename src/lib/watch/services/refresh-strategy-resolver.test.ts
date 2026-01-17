import { addDays, subDays, subMinutes } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import { RefreshStrategyResolver } from "./refresh-strategy-resolver";

const mockConfig = {
	activeIntervalMs: 3 * 60 * 1000, // 3 mins
	pendingIntervalMs: 60 * 60 * 1000, // 1 hour
	dormantIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
	bookingWindowDays: 7,
	pendingWindowDays: 14,
};

describe("RefreshStrategyResolver", () => {
	let resolver: RefreshStrategyResolver;
	const now = new Date("2024-01-01T12:00:00Z"); // Reference time

	beforeEach(() => {
		resolver = new RefreshStrategyResolver(mockConfig);
	});

	describe("resolveTier", () => {
		it("should return ACTIVE for dates within booking window", () => {
			const today = now;
			const tomorrow = addDays(now, 1);
			const day7 = addDays(now, 7);

			expect(resolver.resolveTier(today, now)).toBe("ACTIVE");
			expect(resolver.resolveTier(tomorrow, now)).toBe("ACTIVE");
			expect(resolver.resolveTier(day7, now)).toBe("ACTIVE");
		});

		it("should return PENDING for dates between booking and pending window", () => {
			const day8 = addDays(now, 8);
			const day14 = addDays(now, 14);

			expect(resolver.resolveTier(day8, now)).toBe("PENDING");
			expect(resolver.resolveTier(day14, now)).toBe("PENDING");
		});

		it("should return DORMANT for dates outside pending window", () => {
			const day15 = addDays(now, 15);
			const nextMonth = addDays(now, 30);

			expect(resolver.resolveTier(day15, now)).toBe("DORMANT");
			expect(resolver.resolveTier(nextMonth, now)).toBe("DORMANT");
		});
	});

	describe("isDueForEvaluation", () => {
		const activeDate = addDays(now, 1); // Tommorrow -> ACTIVE tier

		it("should be due if never evaluated", () => {
			const watcher = {
				date: activeDate,
				updatedAt: subDays(now, 1), // Old update
				lastEvaluatedAt: null,
			};
			// updatedAt is old, so it should be due.
			// Wait, the logic falls back to updatedAt if lastEvaluatedAt is null.
			// subDays(1) is > activeIntervalMs (3 mins). So yes.
			expect(resolver.isDueForEvaluation(watcher, now)).toBe(true);
		});

		it("should NOT be due if recently evaluated (Active Tier)", () => {
			const watcher = {
				date: activeDate,
				updatedAt: subMinutes(now, 1), // 1 min ago
			};
			// 1 min < 3 mins
			expect(resolver.isDueForEvaluation(watcher, now)).toBe(false);
		});

		it("should be due if interval exceeded (Active Tier)", () => {
			const watcher = {
				date: activeDate, // Active tier
				updatedAt: subMinutes(now, 4), // 4 mins ago (interval is 3)
			};
			expect(resolver.isDueForEvaluation(watcher, now)).toBe(true);
		});

		it("should handle mixed tier intervals", () => {
			const dormantDate = addDays(now, 20); // Dormant tier -> 24h interval

			const watcherNotDue = {
				date: dormantDate,
				updatedAt: subMinutes(now, 60), // 1 hour ago
			};
			// 1 hour < 24 hours
			expect(resolver.isDueForEvaluation(watcherNotDue, now)).toBe(false);

			const watcherDue = {
				date: dormantDate,
				updatedAt: subDays(now, 2), // 2 days ago
			};
			// 2 days > 24 hours
			expect(resolver.isDueForEvaluation(watcherDue, now)).toBe(true);
		});
	});
});
