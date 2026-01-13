import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { facilityApiResponseSchema } from "../src/lib/crawler/schemas";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const logPath = join(__dirname, "logs", "last-response.json");

async function main() {
	console.log("# Schema Validation Test");
	console.log("========================");

	if (!existsSync(logPath)) {
		console.error(`❌ Log file not found at ${logPath}`);
		console.log("Please run `pnpm test:crawler --live --verbose` first.");
		process.exit(1);
	}

	try {
		const rawContent = readFileSync(logPath, "utf-8");
		const data = JSON.parse(rawContent);

		// The mock-response file might be an array of responses if it was saved by test-crawler
		const responses = Array.isArray(data) ? data : [data];

		console.log(`ℹ Validating ${responses.length} responses...`);

		for (const [index, response] of responses.entries()) {
			console.log(`\n--- Response #${index + 1} ---`);
			const result = facilityApiResponseSchema.safeParse(response);

			if (result.success) {
				console.log("✅ Validation successful");
				console.log(`   Items: ${result.data.data.morning.distList.length} districts in morning`);
			} else {
				console.error("❌ Validation failed");
				console.error(JSON.stringify(result.error.format(), null, 2));
				process.exit(1);
			}
		}

		console.log("\n✅ All schemas are valid!");
	} catch (error) {
		console.error("❌ Fatal error during validation:");
		console.error(error);
		process.exit(1);
	}
}

main();
