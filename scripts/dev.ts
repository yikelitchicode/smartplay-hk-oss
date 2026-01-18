import { spawn } from "node:child_process";

/**
 * Development Server Wrapper
 *
 * This script wraps the vite dev server to provide custom CLI arguments.
 * Currently supports:
 *   --scheduler    Enable the crawler scheduler during development
 *   --watcher      Enable the watcher scheduler during development
 *
 * Usage:
 *   pnpm dev                         # Starts dev server with both DISABLED
 *   pnpm dev --scheduler             # Starts dev server with scheduler ENABLED
 *   pnpm dev --watcher               # Starts dev server with watcher ENABLED
 *   pnpm dev --scheduler --watcher   # Starts dev server with both ENABLED
 */

const args = process.argv.slice(2);
const hasSchedulerArg = args.includes("--scheduler");
const hasWatcherArg = args.includes("--watcher");
// filter out our custom args before passing to vite
const viteArgs = args.filter(
	(arg) => arg !== "--scheduler" && arg !== "--watcher",
);

// Set env vars in the parent process BEFORE dynamic imports
// This ensures server-init.ts reads the correct values when imported
process.env.ENABLE_SCHEDULER = hasSchedulerArg ? "true" : "false";
process.env.ENABLE_WATCHER = hasWatcherArg ? "true" : "false";

console.log("--------------------------------------------------");
console.log(`🚀 SmartPlay HK OSS - Development Server`);
console.log(
	`📡 Crawler Scheduler: ${hasSchedulerArg ? "✅ ENABLED" : "❌ DISABLED"}`,
);
console.log(
	`👁️ Watcher Scheduler: ${hasWatcherArg ? "✅ ENABLED" : "❌ DISABLED"}`,
);
if (!hasSchedulerArg || !hasWatcherArg) {
	const tips: string[] = [];
	if (!hasSchedulerArg) tips.push("--scheduler");
	if (!hasWatcherArg) tips.push("--watcher");
	console.log(
		`💡 Tip: Use 'pnpm dev ${tips.join(" ")}' to enable disabled features`,
	);
}
console.log("--------------------------------------------------\n");

const env = {
	...process.env,
	ENABLE_SCHEDULER: hasSchedulerArg ? "true" : "false",
	ENABLE_WATCHER: hasWatcherArg ? "true" : "false",
};

// Track if we've already initialized schedulers
let schedulersInitialized = false;

/**
 * Initialize schedulers after Vite server is ready
 */
async function initializeSchedulers() {
	if (schedulersInitialized) return;
	schedulersInitialized = true;

	// Only initialize if at least one is enabled
	if (!hasSchedulerArg && !hasWatcherArg) return;

	// Small delay to ensure Vite's SSR is fully ready
	await new Promise((resolve) => setTimeout(resolve, 2000));

	try {
		// Load environment variables from .env.local manually (avoids dotenv dependency)
		const { readFileSync, existsSync } = await import("node:fs");
		const { resolve } = await import("node:path");

		const envPath = resolve(process.cwd(), ".env.local");
		if (existsSync(envPath)) {
			const envContent = readFileSync(envPath, "utf-8");
			for (const line of envContent.split("\n")) {
				const trimmed = line.trim();
				// Skip empty lines and comments
				if (!trimmed || trimmed.startsWith("#")) continue;
				const eqIndex = trimmed.indexOf("=");
				if (eqIndex > 0) {
					const key = trimmed.slice(0, eqIndex).trim();
					let value = trimmed.slice(eqIndex + 1).trim();
					// Remove surrounding quotes if present
					if (
						(value.startsWith('"') && value.endsWith('"')) ||
						(value.startsWith("'") && value.endsWith("'"))
					) {
						value = value.slice(1, -1);
					}
					// Only set if not already defined
					if (!(key in process.env)) {
						process.env[key] = value;
					}
				}
			}
		}

		// Dynamic import using tsx's runtime resolution
		const { ensureSchedulerInitialized } = await import(
			"../src/lib/server-init"
		);
		await ensureSchedulerInitialized();
	} catch (error) {
		console.error("❌ Failed to initialize schedulers:", error);
	}
}

const child = spawn(
	"pnpm",
	["exec", "vite", "dev", "--port", "3000", ...viteArgs],
	{
		stdio: ["inherit", "pipe", "inherit"],
		env,
	},
);

// Pass stdout through but also watch for "ready" message
child.stdout?.on("data", (data: Buffer) => {
	const output = data.toString();
	process.stdout.write(output);

	// When Vite is ready, initialize schedulers
	if (output.includes("ready in") && !schedulersInitialized) {
		initializeSchedulers();
	}
});

child.on("exit", (code) => {
	process.exit(code || 0);
});
