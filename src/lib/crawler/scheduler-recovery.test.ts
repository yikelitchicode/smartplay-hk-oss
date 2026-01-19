import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrawlerScheduler } from "./scheduler";
import type { CrawlerConfig } from "./types";

const mockConfig: CrawlerConfig = {
	api: {
		baseUrl: "https://example.com",
		endpoint: "/api",
		timeout: 5000,
		retryAttempts: 3,
		retryDelay: 1000,
	},
	headers: {
		"User-Agent": "test",
		Accept: "application/json",
		"Accept-Language": "zh-hk",
		channel: "web",
		"Content-Type": "application/json",
	},
	parameters: {
		distCode: ["CW"],
		faCode: ["BAGM"],
		playDate: "2024-01-01",
		daysToCrawl: 1,
	},
	schedule: {
		enabled: true,
		interval: "0 0 * * *",
		timezone: "Asia/Hong_Kong",
	},
	processing: {
		skipDuplicates: true,
		flattenStructure: true,
		includeTimeSlots: true,
	},
	recovery: {
		maxRetryAttemptsPerDay: 2,
		retryDelayBase: 1,
		enableCheckpoints: true,
		staleRunThresholdMs: 3600000,
	},
};

describe("CrawlerScheduler Recovery", () => {
	let scheduler: CrawlerScheduler;
	let mockOrchestrator: any;
	let mockCheckpoint: any;

	beforeEach(() => {
		vi.useFakeTimers();

		mockOrchestrator = {
			runCrawl: vi.fn().mockResolvedValue({
				success: true,
				jobId: "test-job",
				failedCodes: [],
			}),
		};

		mockCheckpoint = {
			getIncompleteRun: vi.fn().mockResolvedValue(null),
			createRun: vi.fn().mockResolvedValue({ id: "new-run" }),
			markDayStarted: vi.fn().mockResolvedValue(undefined),
			markDayCompleted: vi.fn().mockResolvedValue(undefined),
			markDayFailed: vi.fn().mockResolvedValue(undefined),
			getRemainingDays: vi.fn().mockResolvedValue(["2024-01-01"]),
			completeRun: vi.fn().mockResolvedValue(undefined),
		};

		scheduler = new CrawlerScheduler(
			mockConfig,
			mockOrchestrator as any,
			mockCheckpoint as any,
		);
	});

	afterEach(() => {
		scheduler.stop();
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("should create a new run when no incomplete run exists", async () => {
		// @ts-expect-error - accessing private method for test
		await scheduler.triggerCrawl();

		expect(mockCheckpoint.getIncompleteRun).toHaveBeenCalled();
		expect(mockCheckpoint.createRun).toHaveBeenCalled();
		expect(mockOrchestrator.runCrawl).toHaveBeenCalled();
		expect(mockCheckpoint.completeRun).toHaveBeenCalledWith("new-run");
	});

	it("should resume an incomplete run", async () => {
		const incompleteRun = {
			id: "resume-run",
			completedDays: [],
			totalDays: 2,
		};
		mockCheckpoint.getIncompleteRun.mockResolvedValue(incompleteRun);
		mockCheckpoint.getRemainingDays.mockResolvedValue(["2024-01-02"]);

		// @ts-expect-error - accessing private method for test
		await scheduler.triggerCrawl();

		expect(mockCheckpoint.createRun).not.toHaveBeenCalled();
		expect(mockCheckpoint.getRemainingDays).toHaveBeenCalledWith("resume-run");
		expect(mockOrchestrator.runCrawl).toHaveBeenCalledWith(
			expect.objectContaining({ playDate: "2024-01-02" }),
		);
	});

	it("should retry failed days", async () => {
		mockOrchestrator.runCrawl
			.mockResolvedValueOnce({
				success: false,
				jobId: "fail-job",
				failedCodes: ["BAGM"],
			})
			.mockResolvedValueOnce({
				success: true,
				jobId: "success-job",
				failedCodes: [],
			});

		// @ts-expect-error - accessing private method for test
		const processPromise = scheduler.triggerCrawl();

		// Fast-forward through retry delays
		await vi.runAllTimersAsync();
		await processPromise;

		// 1 initial failure + 1 success retry = 2 calls for zh-hk
		// Plus one extra for English metadata refresh on success if we want to be exact
		// But let's just check it called it more than once
		expect(mockOrchestrator.runCrawl).toHaveBeenCalledTimes(3);
		expect(mockCheckpoint.markDayFailed).toHaveBeenCalled();
		expect(mockCheckpoint.markDayCompleted).toHaveBeenCalledWith(
			"new-run",
			expect.any(String),
			"success-job",
		);
	});

	it("should give up after max retries", async () => {
		mockOrchestrator.runCrawl.mockResolvedValue({
			success: false,
			jobId: "fail-job",
			failedCodes: ["BAGM"],
		});

		// @ts-expect-error - accessing private method for test
		const processPromise = scheduler.triggerCrawl();

		// Fast-forward through all retry delays
		await vi.runAllTimersAsync();
		await processPromise;

		// maxRetryAttemptsPerDay is 2
		expect(mockOrchestrator.runCrawl).toHaveBeenCalledTimes(2);
		expect(mockCheckpoint.completeRun).toHaveBeenCalled();
	});
});
