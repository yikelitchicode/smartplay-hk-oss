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

const child = spawn(
	"pnpm",
	["exec", "vite", "dev", "--port", "3000", ...viteArgs],
	{
		stdio: "inherit",
		env,
	},
);

child.on("exit", (code) => {
	process.exit(code || 0);
});
