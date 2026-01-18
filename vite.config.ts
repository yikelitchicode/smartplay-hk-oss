import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import type { Plugin } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Node.js-only packages that should not be bundled on the client.
 * These packages use Node.js APIs like Buffer, fs, crypto, fileURLToPath, etc.
 */
const serverOnlyPackages = [
	"@prisma/adapter-pg",
	"@prisma/client",
	"pg",
	"pino",
	"pino-pretty",
	"node-cron",
];

/**
 * Custom Vite plugin to provide empty stubs for server-only packages
 * when bundling for the browser. This prevents "Buffer is not defined"
 * and similar errors from packages that use Node.js APIs.
 */
function serverOnlyStubsPlugin(): Plugin {
	const stubContent = `
		/** Stubbed by serverOnlyStubsPlugin **/
		const createProxy = (name) => {
			const stub = new Proxy(() => {}, {
				get: (target, prop) => {
					if (prop === "then") return undefined;
					if (prop === Symbol.iterator) return undefined;
					return stub;
				},
				apply: () => stub,
				construct: () => stub,
			});
			return stub;
		};

		const stub = createProxy("stub");
		
		export const PrismaPg = stub;
		export const PrismaClient = stub;
		export const Pool = stub;
		export const Client = stub;
		export const prisma = stub;
		export const disconnectDatabase = () => Promise.resolve();
		export const Extensions = stub;
		export const Types = stub;
		export const sqltag = stub;
		export const empty = stub;
		export const join = stub;
		export const raw = stub;
		export const Sql = stub;
		export const Decimal = stub;
		export const PrismaClientKnownRequestError = stub;
		export const PrismaClientUnknownRequestError = stub;
		export const PrismaClientRustPanicError = stub;
		export const PrismaClientInitializationError = stub;
		export const PrismaClientValidationError = stub;
		export const NullTypes = stub;
		export const DbNull = stub;
		export const JsonNull = stub;
		export const AnyNull = stub;
		export const FieldRef = stub;
		export const ModelName = stub;

		export default stub;
	`;

	return {
		name: "server-only-stubs",
		enforce: "pre",
		resolveId(id, _importer, options) {
			if (options.ssr) return null;

			// 1. Stub npm packages
			for (const pkg of serverOnlyPackages) {
				if (id === pkg || id.startsWith(`${pkg}/`)) {
					return `\0virtual:server-only-stub:${id}`;
				}
			}

			// 2. Stub local database and generated prisma files
			const normalizedId = id.replace(/\\/g, "/");
			if (
				normalizedId.includes("src/db") ||
				normalizedId.includes("generated/prisma") ||
				normalizedId === "@/db"
			) {
				return `\0virtual:server-only-stub:${id}`;
			}

			return null;
		},
		load(id) {
			if (id.startsWith("\0virtual:server-only-stub:")) {
				return stubContent;
			}
			return null;
		},
		transform(_code, id, options) {
			if (options?.ssr) return null;

			const normalizedId = id.replace(/\\/g, "/");
			if (
				normalizedId.includes("src/db.ts") ||
				normalizedId.includes("generated/prisma/")
			) {
				return {
					code: stubContent,
					map: null,
				};
			}
			return null;
		},
	};
}

const config = defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	ssr: {
		// Externalize Node.js-only packages for SSR
		external: serverOnlyPackages,
	},
	optimizeDeps: {
		// Exclude these from client-side pre-bundling
		exclude: serverOnlyPackages,
	},
	build: {
		rollupOptions: {
			// Externalize Node.js-only packages from production client bundle
			external: serverOnlyPackages,
		},
	},
	plugins: [
		tanstackStart(),
		// Apply server-only stubs early but after tanstackStart
		serverOnlyStubsPlugin(),
		// devtools(),
		!process.env.VITEST && nitro(),
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		viteReact(),
	].filter(Boolean) as Plugin[],
	test: {
		globals: true,
		environment: "jsdom",
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,conf,config}.{js,ts}",
			"src/e2e/**",
		],
	},
});

export default config;
