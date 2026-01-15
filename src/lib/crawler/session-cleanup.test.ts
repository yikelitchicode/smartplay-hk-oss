import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../db";
import { SessionCleanupService } from "./session-cleanup";

// Mock Prisma
vi.mock("../../db", () => ({
	prisma: {
		session: {
			deleteMany: vi.fn(),
		},
	},
}));

describe("SessionCleanupService", () => {
	let service: SessionCleanupService;

	beforeEach(() => {
		service = new SessionCleanupService();
		vi.resetAllMocks();

		// Mock date to a fixed point in time: 2026-01-15 (Hong Kong Time)
		// We use system time mocking libraries usually, but here we can just rely on the logic test
		// Since the service uses internal Date creation, we should mock the System Date
		vi.useFakeTimers();
		// Set system time to 2026-01-15T10:00:00Z (UTC) -> 2026-01-15T18:00:00+08:00 (HKT)
		const mockDate = new Date("2026-01-15T10:00:00Z");
		vi.setSystemTime(mockDate);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should delete sessions prior to today (0 retention days)", async () => {
		// Mock deleteMany response
		vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 10 });

		const count = await service.deleteOverdueSessions(0);

		expect(count).toBe(10);
		expect(prisma.session.deleteMany).toHaveBeenCalledTimes(1);

		// Today in HKT is 2026-01-15
		// Cutoff date for 0 retention days means < 2026-01-15
		const expectedDate = new Date("2026-01-15T00:00:00.000Z");

		expect(prisma.session.deleteMany).toHaveBeenCalledWith({
			where: {
				date: {
					lt: expectedDate,
				},
			},
		});
	});

	it("should delete sessions with retention days override", async () => {
		vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 5 });

		// Retention 2 days -> Keep today (15th), yesterday (14th), and day before (13th)?
		// Logic:
		// "Today" = 15th
		// Cutoff = 15th - 2 days = 13th
		// Delete where date < 13th
		// So we keep 13th, 14th, 15th+

		await service.deleteOverdueSessions(2);

		const expectedDate = new Date("2026-01-13T00:00:00.000Z");

		expect(prisma.session.deleteMany).toHaveBeenCalledWith({
			where: {
				date: {
					lt: expectedDate,
				},
			},
		});
	});
});
