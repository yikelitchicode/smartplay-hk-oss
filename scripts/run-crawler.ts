/**
 * Manual Crawler Trigger
 * Usage: npx tsx scripts/run-crawler.ts [--date=YYYY-MM-DD]
 */

import { loadConfig } from "../src/lib/crawler/config";
import { CrawlerOrchestrator } from "../src/lib/crawler/orchestrator";

async function main() {
	const args = process.argv.slice(2);
	const dateArg = args.find((a) => a.startsWith("--date="))?.split("=")[1];

	const config = loadConfig(dateArg ? { playDate: dateArg } : undefined);
	const orchestrator = new CrawlerOrchestrator(config);

	try {
		console.log("Starting manual crawler run...");
		await orchestrator.runCrawl();
		console.log("Manual run completed.");
		process.exit(0);
	} catch (error) {
		console.error("Manual run failed:", error);
		process.exit(1);
	}
}

main();
