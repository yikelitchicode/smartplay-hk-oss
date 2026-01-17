import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SchedulerCheckpointService } from "./checkpoint";
import { defaultConfig } from "./config";
import { CrawlerOrchestrator } from "./orchestrator";
import { CrawlerScheduler } from "./scheduler";
import type { CrawlerConfig } from "./types";

// Define mock functions outside to handle hoisting or use local variables in beforeEach if we use the factory pattern correctly
// Since vi.mock is hoisted, we can't use outer variables unless they are vi.hoisted()
// But simple way is to access the mock class after import

// Mock dependencies with explicit factory
vi.mock("./orchestrator", () => {
	return {
		CrawlerOrchestrator: vi.fn().mockImplementation(() => ({})),
	};
});

vi.mock("./checkpoint", () => {
	const { vi } = require("vitest");
	return {
		SchedulerCheckpointService: vi.fn(),
	};
});

vi.mock("../../db", () => ({
	prisma: {},
}));

vi.mock("node-cron", () => ({
	default: {
		schedule: vi.fn(),
	},
}));

describe("CrawlerScheduler Recovery", () => {
	let scheduler: CrawlerScheduler;
	let mockOrchestrator: {
		runCrawl: ReturnType<typeof vi.fn>;
	};
	let mockCheckpoint: {
		createRun: ReturnType<typeof vi.fn>;
		getIncompleteRun: ReturnType<typeof vi.fn>;
		getRemainingDays: ReturnType<typeof vi.fn>;
		markDayStarted: ReturnType<typeof vi.fn>;
		markDayCompleted: ReturnType<typeof vi.fn>;
		markDayFailed: ReturnType<typeof vi.fn>;
		completeRun: ReturnType<typeof vi.fn>;
	};
	let config: CrawlerConfig;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		// Setup mock implementations
		mockOrchestrator = {
			runCrawl: vi.fn().mockResolvedValue({
				jobId: "job-id-123",
				success: true,
				failedCodes: [],
			}),
		};

		vi.mocked(CrawlerOrchestrator).mockImplementation(function () {
			return mockOrchestrator as any;
		});

		mockCheckpoint = {
			createRun: vi.fn().mockResolvedValue({ id: "run-123" }),
			getIncompleteRun: vi.fn().mockResolvedValue(null),
			getRemainingDays: vi.fn().mockResolvedValue([]),
			markDayStarted: vi.fn().mockResolvedValue(undefined),
			markDayCompleted: vi.fn().mockResolvedValue(undefined),
			markDayFailed: vi.fn().mockResolvedValue(undefined),
			completeRun: vi.fn().mockResolvedValue(undefined),
		};

		vi.mocked(SchedulerCheckpointService).mockImplementation(function () {
			return mockCheckpoint as any;
		});

		config = {
			...defaultConfig,
			schedule: { enabled: true, interval: "* * * * *", timezone: "UTC" },
			recovery: {
				enableCheckpoints: true,
				maxRetryAttemptsPerDay: 3,
				retryDelayBase: 10, // Fast for tests
				staleRunThresholdMs: 3600000,
			},
		};

		scheduler = new CrawlerScheduler(config);
	});

	afterEach(() => {
		scheduler.stop();
		vi.useRealTimers();
	});

	it("should create a new run when no incomplete run exists", async () => {
		// Trigger crawl via private method
		const crawlPromise = (
			scheduler as unknown as { triggerCrawl: () => Promise<void> }
		).triggerCrawl();

		// Fast-forward timers to skip delays
		await vi.runAllTimersAsync();
		await crawlPromise;

		expect(mockCheckpoint.getIncompleteRun).toHaveBeenCalled();
		expect(mockCheckpoint.createRun).toHaveBeenCalled();
		// Should process 7 days
		expect(mockCheckpoint.markDayStarted).toHaveBeenCalledTimes(7);
		// Each day triggers a main crawl and an English refresh = 14 calls
		expect(mockOrchestrator.runCrawl).toHaveBeenCalledTimes(14);
		expect(mockCheckpoint.markDayCompleted).toHaveBeenCalledTimes(7);
		expect(mockCheckpoint.completeRun).toHaveBeenCalledWith("run-123");
	}, 20000);

	it("should resume an incomplete run", async () => {
		// Mock incomplete run
		mockCheckpoint.getIncompleteRun.mockResolvedValue({
			id: "run-existing",
			completedDays: ["day1", "day2"],
			totalDays: 7,
		});
		mockCheckpoint.getRemainingDays.mockResolvedValue(["day3", "day4"]);

		const crawlPromise = (
			scheduler as unknown as { triggerCrawl: () => Promise<void> }
		).triggerCrawl();

		// Fast-forward timers
		await vi.runAllTimersAsync();
		await crawlPromise;

		expect(mockCheckpoint.createRun).not.toHaveBeenCalled();
		expect(mockCheckpoint.getRemainingDays).toHaveBeenCalledWith(
			"run-existing",
		);

		// Should process remaining 2 days
		expect(mockCheckpoint.markDayStarted).toHaveBeenCalledTimes(2);
		// 2 days * 2 calls (main + en) = 4 calls
		expect(mockOrchestrator.runCrawl).toHaveBeenCalledTimes(4);
		expect(mockCheckpoint.markDayCompleted).toHaveBeenCalledTimes(2);
		expect(mockCheckpoint.completeRun).toHaveBeenCalledWith("run-existing");
	});

	it("should retry failed days", async () => {
		// Mock partial failure on first attempt, success on second
		// Note: English refresh happens after success
		mockOrchestrator.runCrawl
			.mockResolvedValueOnce({
				jobId: "job-id-fail",
				success: false,
				failedCodes: ["TENC"],
			})
			.mockResolvedValueOnce({
				jobId: "job-id-retry",
				success: true,
				failedCodes: [],
			})
			.mockResolvedValueOnce({
				jobId: "job-id-en",
				success: true,
				failedCodes: [],
			}); // English refresh

		const processPromise = (
			scheduler as unknown as {
				processDayWithRetry: (runId: string, date: string) => Promise<void>;
			}
		).processDayWithRetry("run-123", "2025-01-01");

		// Run timers to skip retry backoff
		await vi.runAllTimersAsync();
		await processPromise;

		// Should call runCrawl 3 times: 1 fail + 1 retry + 1 English
		expect(mockOrchestrator.runCrawl).toHaveBeenCalledTimes(3);

		// First call with all codes (undefined)
		expect(mockOrchestrator.runCrawl).toHaveBeenNthCalledWith(1, {
			playDate: "2025-01-01",
			faCode: undefined,
		});

		// Second call with failed codes
		expect(mockOrchestrator.runCrawl).toHaveBeenNthCalledWith(2, {
			playDate: "2025-01-01",
			faCode: ["TENC"],
		});

		// Third call: English refresh (best effort)
		expect(mockOrchestrator.runCrawl).toHaveBeenNthCalledWith(3, {
			playDate: "2025-01-01",
			faCode: ["TENC"], // Reuses last used faCodes
			lang: "en",
		});

		// First attempt marking failure
		expect(mockCheckpoint.markDayFailed).toHaveBeenCalledWith(
			"run-123",
			"2025-01-01",
			expect.any(Error),
			1,
		);

		// Second attempt succeeded
		expect(mockCheckpoint.markDayCompleted).toHaveBeenCalledWith(
			"run-123",
			"2025-01-01",
			"job-id-retry",
		);
	});

	it("should give up after max retries", async () => {
		mockOrchestrator.runCrawl.mockResolvedValue({
			jobId: "job-id-fail",
			success: false,
			failedCodes: ["TENC"],
		});

		const processPromise = (
			scheduler as unknown as {
				processDayWithRetry: (runId: string, date: string) => Promise<void>;
			}
		).processDayWithRetry("run-123", "2025-01-01");

		await vi.runAllTimersAsync();
		await processPromise;

		// Should try 3 times (configured max)
		expect(mockOrchestrator.runCrawl).toHaveBeenCalledTimes(3);
		expect(mockCheckpoint.markDayFailed).toHaveBeenCalledTimes(3);
		expect(mockCheckpoint.markDayCompleted).not.toHaveBeenCalled();
	});
});
