/**
 * Crawler Test CLI
 * Validates crawler functionality without requiring full database setup
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { CrawlerDataProcessor } from "../src/lib/crawler/data-processor";
import { SmartPlayHttpClient } from "../src/lib/crawler/http-client";
import { loadConfig } from "../src/lib/crawler/config";
import type { FacilityApiResponse } from "../src/lib/crawler/types";
import { TestLogger } from "./utils/logger";
import { validateApiResponse, validateProcessedData } from "./utils/validator";
import { writeFileSync, mkdirSync } from "node:fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function main() {
	const args = process.argv.slice(2);
	const options = {
		component: args.find((a) => !a.startsWith("-")) as "http" | "processor" | "all" || "all",
		dryRun: args.includes("--dry-run"),
		liveApi: args.includes("--live"),
		verbose: args.includes("--verbose"),
		playDate: args.find((a) => a.startsWith("--play-date="))?.split("=")[1],
		fixture: args.find((a) => a.startsWith("--fixture="))?.split("=")[1] || "mock-response.json",
	};

	const logger = new TestLogger(options.verbose);
	logger.section("Crawler Test Suite");
	logger.info(`Options: ${JSON.stringify(options)}`);

	const config = loadConfig(options.playDate ? { playDate: options.playDate } : undefined);

	let exitCode = 0;
	let response: FacilityApiResponse | undefined;

	try {
		// 1. Config Validation
		logger.info("Validating configuration...");
		if (!config.api.baseUrl || !config.api.endpoint) {
			logger.error("Invalid configuration: API base URL or endpoint missing");
			exitCode = 1;
		} else {
			logger.success("Configuration is valid");
		}

		// 2. HTTP Client Test
		if (options.component === "all" || options.component === "http") {
			logger.divider();
			logger.info("Testing HTTP Client...");
			
			const httpClient = new SmartPlayHttpClient(config);

			if (options.liveApi) {
				logger.info(`Fetching live data from ${config.api.baseUrl}...`);
				const startTime = Date.now();
				
				const responses: FacilityApiResponse[] = [];
				for (const faCode of config.parameters.faCode) {
					logger.info(`[${faCode}] Fetching...`);
					const response = await httpClient.fetchWithRetry({
						distCode: config.parameters.distCode.join(","),
						faCode: [faCode],
						playDate: config.parameters.playDate,
					});
					responses.push(response);
				}
				
				const duration = (Date.now() - startTime) / 1000;
				logger.success(`All HTTP Requests successful (${duration.toFixed(1)}s)`);
				// Use the first one for validation in the simplified test script for now
				response = responses[0];

				if (options.verbose) {
					const logDir = join(__dirname, "logs");
					if (!existsSync(logDir)) mkdirSync(logDir);
					const logPath = join(logDir, `response-${Date.now()}.json`);
					const latestPath = join(logDir, "last-response.json");
					
					writeFileSync(logPath, JSON.stringify(responses, null, 2));
					writeFileSync(latestPath, JSON.stringify(responses, null, 2));
					logger.info(`Live responses saved to ${logPath} and ${latestPath}`);
				}
			} else {
				logger.info(`Using mock response fixture: ${options.fixture}...`);
				const fixturePath = join(__dirname, "fixtures", options.fixture);
				if (!existsSync(fixturePath)) {
					throw new Error(`Fixture not found at ${fixturePath}`);
				}
				response = JSON.parse(readFileSync(fixturePath, "utf-8"));
				logger.success("Mock FIXTURE loaded");
			}

			const validation = response ? validateApiResponse(response) : { valid: false, errors: ["No response received"] };
			if (response && validation.valid) {
				logger.success("API Response structure is valid");
				logger.table({
					code: response.code,
					message: response.message,
					totalSessions: (validation as any).summary.totalSessions,
					totalVenues: (validation as any).summary.totalVenues,
				});
			} else {
				logger.error("API Response validation failed:");
				validation.errors.forEach((err) => logger.error(`  - ${err}`));
				exitCode = 1;
			}
		}

		// 3. Data Processor Test
		if (options.component === "all" || options.component === "processor") {
			logger.divider();
			logger.info("Testing Data Processor...");
			
			const processor = new CrawlerDataProcessor();
			let rawResponse: FacilityApiResponse;

			// If we have a response from step 2 (live or fixture), use it.
			// Otherwise load from fixture (case where we skipped step 2 or it failed silently?)
			if (typeof response !== 'undefined') {
				logger.info(options.liveApi ? "Using LIVE data from previous step..." : `Using fixture data from previous step (${options.fixture})...`);
				rawResponse = response;
			} else {
				const fixturePath = join(__dirname, "fixtures", options.fixture);
				logger.info(`Loading fixture for processor test: ${options.fixture}`);
				rawResponse = JSON.parse(readFileSync(fixturePath, "utf-8"));
			}
			
			const processedData = processor.processRawResponse(rawResponse, "test-job-id");
			const validation = validateProcessedData(processedData);

			if (validation.valid) {
				logger.success("Data Processing successful");
				const summary = processor.extractSummary(processedData);
				logger.table({
					totalVenues: summary.totalVenues,
					totalSessions: summary.totalSessions,
					availableSessions: summary.availableSessions,
					...summary.periodBreakdown,
				});
				
				if (options.verbose) {
					logger.info("District Breakdown:");
					logger.table(summary.districtBreakdown);
				}
			} else {
				logger.error("Data Processing validation failed:");
				validation.errors.forEach((err) => logger.error(`  - ${err}`));
				exitCode = 1;
			}
		}

		logger.divider();
		if (exitCode === 0) {
			logger.success("All tests passed!");
		} else {
			logger.error("Some tests failed.");
		}

	} catch (error) {
		logger.divider();
		logger.error("Test execution failed with error:", error);
		exitCode = 1;
	}

	process.exit(exitCode);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
