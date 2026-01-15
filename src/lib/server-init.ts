/**
 * Server initialization module
 * Import this in a server function to ensure the crawler scheduler starts
 * This will be automatically initialized when the server starts
 */

import { disconnectDatabase } from "@/db";
import { destroyScheduler } from "@/lib/crawler/scheduler";

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
		console.log("🚀 Initializing Crawler Scheduler...");

		try {
			const { initScheduler: _initScheduler } = await import("@/lib/crawler");
			const scheduler = _initScheduler();

			if (scheduler.isActive()) {
				console.log("✅ Crawler Scheduler is running");
			} else {
				console.log(
					"⏸️ Crawler Scheduler initialized but not started (disabled in config)",
				);
			}

			initialized = true;
		} catch (error) {
			console.error("❌ Failed to initialize Crawler Scheduler:", error);
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
 * Gracefully shutdown the server and cleanup resources
 * Stops the scheduler, disconnects database, and performs cleanup
 */
export async function gracefulShutdown(
	signal: string,
	timeout: number = 10000,
): Promise<void> {
	const startTime = Date.now();

	console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

	// Set up timeout to force exit if graceful shutdown takes too long
	const timeoutHandle = setTimeout(() => {
		console.error(
			`⏰ Graceful shutdown timeout (${timeout}ms) exceeded. Forcing exit.`,
		);
		process.exit(1);
	}, timeout);

	try {
		// Step 1: Stop the scheduler gracefully
		console.log("📍 Step 1/3: Stopping scheduler gracefully...");
		try {
			await destroyScheduler(30000); // Wait up to 30 seconds for in-progress crawls
			console.log("✅ Scheduler stopped gracefully");
		} catch (error) {
			console.error("⚠️ Error stopping scheduler:", error);
		}

		// Step 2: Disconnect from database
		console.log("📍 Step 2/3: Disconnecting database...");
		try {
			await disconnectDatabase();
			console.log("✅ Database disconnected");
		} catch (error) {
			console.error("⚠️ Error disconnecting database:", error);
		}

		// Step 3: Additional cleanup (if needed)
		console.log("📍 Step 3/3: Performing final cleanup...");
		// Add any additional cleanup here (e.g., close HTTP servers, etc.)

		const duration = Date.now() - startTime;
		console.log(`✅ Graceful shutdown completed in ${duration}ms. Goodbye!`);

		clearTimeout(timeoutHandle);
		process.exit(0);
	} catch (error) {
		console.error("❌ Error during graceful shutdown:", error);
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
			console.warn(`⚠️ Already shutting down. Ignoring ${signal}`);
			return;
		}

		isShuttingDown = true;
		gracefulShutdown(signal).catch((error) => {
			console.error("❌ Unexpected error during shutdown:", error);
			process.exit(1);
		});
	};

	// Handle termination signals
	process.on("SIGTERM", () => handleShutdown("SIGTERM"));
	process.on("SIGINT", () => handleShutdown("SIGINT"));

	// Handle uncaught exceptions
	process.on("uncaughtException", (error) => {
		console.error("❌ Uncaught exception:", error);
		handleShutdown("uncaughtException");
	});

	// Handle unhandled promise rejections
	process.on("unhandledRejection", (reason, promise) => {
		console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
		handleShutdown("unhandledRejection");
	});

	console.log("✅ Shutdown handlers registered");
}

// Auto-initialize on import (for server-side)
// Note: This is fire-and-forget. For critical startup, await ensureSchedulerInitialized() explicitly
if (typeof window === "undefined") {
	ensureSchedulerInitialized().catch((error) => {
		console.error("❌ Server initialization failed:", error);
		process.exit(1);
	});

	// Setup graceful shutdown handlers
	setupShutdownHandlers();
}
