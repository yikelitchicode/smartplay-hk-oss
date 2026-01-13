/**
 * Server initialization module
 * Import this in a server function to ensure the crawler scheduler starts
 * This will be automatically initialized when the server starts
 */

import { initScheduler } from "@/lib/crawler";

// Initialize the scheduler on server start
let initialized = false;

export function ensureSchedulerInitialized() {
	if (!initialized) {
		console.log("🚀 Initializing Crawler Scheduler...");

		try {
			const scheduler = initScheduler();

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
		}
	}
}

// Auto-initialize on import (for server-side)
if (typeof window === "undefined") {
	ensureSchedulerInitialized();
}
