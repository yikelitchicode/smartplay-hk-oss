import { disconnectDatabase } from "../src/db";
import { loadConfig } from "../src/lib/crawler/config";
import { destroyScheduler, initScheduler } from "../src/lib/crawler/scheduler";
import { initCleanupScheduler } from "../src/lib/crawler/session-cleanup";

const config = loadConfig();
const scheduler = initScheduler(config);
const cleanupScheduler = initCleanupScheduler();

console.log("Starting Crawler Scheduler...");
scheduler.start();

console.log("Starting Session Cleanup Scheduler...");
cleanupScheduler.start();

console.log("Services are active. Press Ctrl+C to stop.");

// Handle graceful shutdown
const handleShutdown = async (signal: string) => {
	console.log(`\n🛑 Received ${signal}. Shutting down services...`);

	// Stop schedulers
	await destroyScheduler();
	cleanupScheduler.stop();

	// Disconnect database
	await disconnectDatabase();

	console.log("✅ Shutdown complete.");
	process.exit(0);
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
