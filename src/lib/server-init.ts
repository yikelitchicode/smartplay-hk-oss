/**
 * Server initialization module
 * Import this in a server function to ensure the crawler scheduler starts
 * This will be automatically initialized when the server starts
 */

import { disconnectDatabase } from "@/db";
import { destroyScheduler } from "@/lib/crawler/scheduler";
import { healthChecker } from "@/lib/health";
import { serverLogger } from "@/lib/logger";

// Watch scheduler globals
let watchEvaluationScheduler:
	| import("@/lib/watch").WatchEvaluationScheduler
	| null = null;
let watchCleanupScheduler: import("@/lib/watch").WatchCleanupScheduler | null =
	null;

// Initialize the scheduler on server start
let initialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureSchedulerInitialized(): Promise<void> {
	// Return existing promise if initialization is in progress
	if (initPromise) {
		return initPromise;
	}

	// Return immediately if already initialized
	if (initialized) {
		return;
	}

	// Create initialization promise
	initPromise = (async () => {
		serverLogger.debug(
			"🔄 Loading server-init.ts (VERSION: PATCHED-WITH-SCHEDULER-START)...",
		);

		// Check if any features are enabled
		const { envConfig } = await import("@/lib/env");
		const schedulerEnabled = envConfig.enableScheduler;
		const watcherEnabled = envConfig.enableWatcher;

		if (!schedulerEnabled && !watcherEnabled) {
			serverLogger.info(
				"⏸️ Both Crawler Scheduler and Watcher are disabled via configuration",
			);
			initialized = true;
			return;
		}

		serverLogger.info("🚀 Initializing Server Components...");

		try {
			// Step 1: Database health check (required for both)
			serverLogger.info("📍 Step 1/3: Checking database health...");
			const healthStatus = await healthChecker.check({ timeout: 5000 });

			if (!healthStatus.healthy) {
				throw new Error(
					`Database health check failed: ${healthStatus.error || "Unknown error"}`,
				);
			}

			serverLogger.info(
				`✅ Database healthy (latency: ${healthStatus.latency}ms)`,
			);

			// Step 2: Initialize crawler scheduler (if enabled)
			if (schedulerEnabled) {
				serverLogger.info("📍 Step 2/3: Initializing Crawler Scheduler...");
				const { initScheduler: _initScheduler } = await import("@/lib/crawler");
				const scheduler = _initScheduler();

				// Start the scheduler
				scheduler.start();

				if (scheduler.isActive()) {
					serverLogger.info("✅ Crawler Scheduler is running");
				} else {
					serverLogger.warn(
						"⚠️ Crawler Scheduler failed to start (check logs for details)",
					);
				}
			} else {
				serverLogger.info("⏸️ Crawler Scheduler is disabled via configuration");
			}

			// Step 3: Initialize watch schedulers (if enabled)
			if (watcherEnabled) {
				serverLogger.info("📍 Step 3/3: Initializing Watch Schedulers...");
				await initializeWatchSchedulers();
			} else {
				serverLogger.info("⏸️ Watch Schedulers are disabled via configuration");
			}

			initialized = true;
		} catch (error) {
			serverLogger.error(
				{ err: error },
				"❌ Failed to initialize server components",
			);
			// Re-throw for proper error handling upstream
			throw error;
		} finally {
			// Clear promise after completion (success or failure)
			initPromise = null;
		}
	})();

	return initPromise;
}

/**
 * Initialize watch schedulers (evaluation and cleanup)
 */
async function initializeWatchSchedulers(): Promise<void> {
	const {
		loadConfig,
		WatchEvaluator,
		NotificationService,
		WatchEvaluationScheduler,
		WatchCleanupScheduler,
	} = await import("@/lib/watch");

	const watchConfig = loadConfig();

	// Initialize services
	const notificationService = new NotificationService({
		notifications: watchConfig.notifications,
		webhook: watchConfig.webhook,
	});
	const { RefreshStrategyResolver } = await import(
		"@/lib/watch/services/refresh-strategy-resolver"
	);
	const strategyResolver = new RefreshStrategyResolver(
		watchConfig.refreshStrategy,
	);
	const watchEvaluator = new WatchEvaluator(
		notificationService,
		strategyResolver,
	);

	// Initialize and start evaluation scheduler
	if (watchConfig.schedule.enabled) {
		watchEvaluationScheduler = new WatchEvaluationScheduler(
			watchEvaluator,
			watchConfig.schedule,
			watchConfig.evaluation,
		);
		watchEvaluationScheduler.start({ runImmediate: false });
		serverLogger.info("✅ Watch evaluation scheduler started");
	} else {
		serverLogger.info("⏸️ Watch evaluation scheduler is disabled");
	}

	// Initialize and start cleanup scheduler
	if (watchConfig.cleanup.enabled) {
		watchCleanupScheduler = new WatchCleanupScheduler(watchConfig.cleanup);
		watchCleanupScheduler.start();
		serverLogger.info("✅ Watch cleanup scheduler started");
	} else {
		serverLogger.info("⏸️ Watch cleanup scheduler is disabled");
	}
}

/**
 * Gracefully shutdown the server and cleanup resources
 * Stops the scheduler, disconnects database, and performs cleanup
 */
export async function gracefulShutdown(
	signal: string,
	timeout: number = 10000,
): Promise<void> {
	const startTime = Date.now();

	serverLogger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

	// Set up timeout to force exit if graceful shutdown takes too long
	const timeoutHandle = setTimeout(() => {
		serverLogger.error(
			`⏰ Graceful shutdown timeout (${timeout}ms) exceeded. Forcing exit.`,
		);
		process.exit(1);
	}, timeout);

	try {
		// Step 1: Stop the crawler scheduler gracefully
		serverLogger.info("📍 Step 1/4: Stopping crawler scheduler gracefully...");
		try {
			await destroyScheduler(30000); // Wait up to 30 seconds for in-progress crawls
			serverLogger.info("✅ Crawler scheduler stopped gracefully");
		} catch (error) {
			serverLogger.error({ err: error }, "⚠️ Error stopping crawler scheduler");
		}

		// Step 2: Stop watch schedulers
		serverLogger.info("📍 Step 2/4: Stopping watch schedulers...");
		try {
			watchEvaluationScheduler?.stop();
			watchCleanupScheduler?.stop();
			serverLogger.info("✅ Watch schedulers stopped");
		} catch (error) {
			serverLogger.error({ err: error }, "⚠️ Error stopping watch schedulers");
		}

		// Step 3: Disconnect from database
		serverLogger.info("📍 Step 3/4: Disconnecting database...");
		try {
			await disconnectDatabase();
			serverLogger.info("✅ Database disconnected");
		} catch (error) {
			serverLogger.error({ err: error }, "⚠️ Error disconnecting database");
		}

		// Step 4: Additional cleanup (if needed)
		serverLogger.info("📍 Step 4/4: Performing final cleanup...");
		// Add any additional cleanup here (e.g., close HTTP servers, etc.)

		const duration = Date.now() - startTime;
		serverLogger.info(
			`✅ Graceful shutdown completed in ${duration}ms. Goodbye!`,
		);

		clearTimeout(timeoutHandle);
		process.exit(0);
	} catch (error) {
		serverLogger.error({ err: error }, "❌ Error during graceful shutdown");
		clearTimeout(timeoutHandle);
		process.exit(1);
	}
}

/**
 * Setup signal handlers for graceful shutdown
 * Call this once during server initialization
 */
export function setupShutdownHandlers(): void {
	// Prevent multiple shutdown attempts
	let isShuttingDown = false;

	const handleShutdown = (signal: string) => {
		if (isShuttingDown) {
			serverLogger.warn(`⚠️ Already shutting down. Ignoring ${signal}`);
			return;
		}

		isShuttingDown = true;
		gracefulShutdown(signal).catch((error) => {
			serverLogger.error({ err: error }, "❌ Unexpected error during shutdown");
			process.exit(1);
		});
	};

	// Handle termination signals
	process.on("SIGTERM", () => handleShutdown("SIGTERM"));
	process.on("SIGINT", () => handleShutdown("SIGINT"));

	// Handle uncaught exceptions
	process.on("uncaughtException", (error) => {
		serverLogger.error({ err: error }, "❌ Uncaught exception");
		handleShutdown("uncaughtException");
	});

	// Handle unhandled promise rejections
	process.on("unhandledRejection", (reason, _promise) => {
		serverLogger.error({ err: reason }, "❌ Unhandled rejection");
		handleShutdown("unhandledRejection");
	});

	serverLogger.info("✅ Shutdown handlers registered");
}

// Auto-initialize on import (for server-side)
// Note: This is fire-and-forget. For critical startup, await ensureSchedulerInitialized() explicitly
if (typeof window === "undefined") {
	ensureSchedulerInitialized().catch((error) => {
		console.error("❌ Server initialization failed:", error); // Keep console.error here as last resort
		process.exit(1);
	});

	// Setup graceful shutdown handlers
	setupShutdownHandlers();
}
