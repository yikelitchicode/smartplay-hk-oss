
import { initScheduler } from "../src/lib/crawler/scheduler";
import { loadConfig } from "../src/lib/crawler/config";

const config = loadConfig();
const scheduler = initScheduler(config);

console.log("Starting Crawler Scheduler...");
scheduler.start();

console.log("Scheduler is active. Press Ctrl+C to stop.");
