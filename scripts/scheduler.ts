import { loadConfig } from "../src/lib/crawler/config";
import { initScheduler } from "../src/lib/crawler/scheduler";
import { initCleanupScheduler } from "../src/lib/crawler/session-cleanup";

const config = loadConfig();
const scheduler = initScheduler(config);
const cleanupScheduler = initCleanupScheduler();

console.log("Starting Crawler Scheduler...");
scheduler.start();

console.log("Starting Session Cleanup Scheduler...");
cleanupScheduler.start();

console.log("Services are active. Press Ctrl+C to stop.");
