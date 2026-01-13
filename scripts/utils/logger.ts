/**
 * Simple logger for test scripts with color support
 */

const COLORS = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	underscore: "\x1b[4m",
	blink: "\x1b[5m",
	reverse: "\x1b[7m",
	hidden: "\x1b[8m",

	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",

	bgBlack: "\x1b[40m",
	bgRed: "\x1b[41m",
	bgGreen: "\x1b[42m",
	bgYellow: "\x1b[43m",
	bgBlue: "\x1b[44m",
	bgMagenta: "\x1b[45m",
	bgCyan: "\x1b[46m",
	bgWhite: "\x1b[47m",
};

export class TestLogger {
	private verbose: boolean;

	constructor(verbose = false) {
		this.verbose = verbose;
	}

	info(msg: string): void {
		console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`);
	}

	success(msg: string): void {
		console.log(`${COLORS.green}✅${COLORS.reset} ${msg}`);
	}

	error(msg: string, error?: unknown): void {
		console.error(`${COLORS.red}❌${COLORS.reset} ${msg}`);
		if (error && this.verbose) {
			console.error(error);
		}
	}

	warn(msg: string): void {
		console.warn(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`);
	}

	section(title: string): void {
		console.log(`\n${COLORS.bright}${COLORS.cyan}# ${title}${COLORS.reset}`);
		console.log(`${COLORS.cyan}${"=".repeat(title.length + 2)}${COLORS.reset}`);
	}

	divider(): void {
		console.log(`${COLORS.dim}${"─".repeat(50)}${COLORS.reset}`);
	}

	table(data: Record<string, unknown>): void {
		const keys = Object.keys(data);
		const maxKeyLength = Math.max(...keys.map((k) => k.length));

		for (const [key, value] of Object.entries(data)) {
			const padding = " ".repeat(maxKeyLength - key.length);
			console.log(
				`  ${COLORS.dim}${key}${padding}:${COLORS.reset} ${this.formatValue(value)}`,
			);
		}
	}

	private formatValue(value: unknown): string {
		if (typeof value === "boolean") {
			return value ? `${COLORS.green}true${COLORS.reset}` : `${COLORS.red}false${COLORS.reset}`;
		}
		if (typeof value === "number") {
			return `${COLORS.yellow}${value}${COLORS.reset}`;
		}
		if (value === null || value === undefined) {
			return `${COLORS.dim}${value}${COLORS.reset}`;
		}
		return String(value);
	}
}
