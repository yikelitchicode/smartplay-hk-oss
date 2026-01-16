import { spawn } from "node:child_process";

/**
 * Development Server Wrapper
 *
 * This script wraps the vite dev server to provide custom CLI arguments.
 * Currently supports:
 *   --scheduler    Enable the crawler scheduler during development
 *
 * Usage:
 *   pnpm dev               # Starts dev server with scheduler DISABLED
 *   pnpm dev --scheduler   # Starts dev server with scheduler ENABLED
 */

const args = process.argv.slice(2);
const hasSchedulerArg = args.includes("--scheduler");
// filter out our custom args before passing to vite
const viteArgs = args.filter((arg) => arg !== "--scheduler");

console.log("--------------------------------------------------");
console.log(`🚀 SmartPlay HK OSS - Development Server`);
console.log(
	`📡 Crawler Scheduler: ${hasSchedulerArg ? "✅ ENABLED" : "❌ DISABLED"}`,
);
if (!hasSchedulerArg) {
	console.log(
		"💡 Tip: Use 'pnpm dev --scheduler' to enable the background crawler",
	);
}
console.log("--------------------------------------------------\n");

const env = {
	...process.env,
	ENABLE_SCHEDULER: hasSchedulerArg ? "true" : "false",
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
