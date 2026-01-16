import { StartClient } from "@tanstack/react-start/client";
import { hydrateRoot } from "react-dom/client";
import { initializeI18n } from "./lib/i18n";
import { getRouter } from "./router";

const router = getRouter();

// Initial log to confirm script execution
// console.log("[Client] Script loaded");

// Extend window interface for server-injected language detection
declare global {
	interface Window {
		__INITIAL_LANG__?: string;
	}
}

async function main() {
	try {
		const initialLang = window.__INITIAL_LANG__;
		await initializeI18n(initialLang);

		// @ts-expect-error - Router type mismatch with StartClient
		hydrateRoot(document, <StartClient router={router} />);
	} catch (error) {
		console.error("[Client] Failed to hydrate:", error);
	}
}

main();
