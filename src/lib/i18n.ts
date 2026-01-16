import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

const isServer = typeof window === "undefined";

// Preload all translation files using Vite's import.meta.glob
// We use eager: true to make them available immediately
const locales = import.meta.glob("../locales/**/*.json", { eager: true });

import type { Resource } from "i18next";

const resources: Resource = {};

for (const path in locales) {
	// Path format: ../locales/en/common.json
	const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
	if (match) {
		const [_, lng, ns] = match;
		if (!resources[lng]) {
			resources[lng] = {};
		}
		// locales[path] is the module, we want the default export (JSON content)
		resources[lng][ns] = (
			locales[path] as { default: Record<string, string> }
		).default;
	}
}

/**
 * Detect language from Accept-Language header or other sources
 */
export function detectLanguage(acceptLanguage: string | null): string {
	if (!acceptLanguage) return "en";

	const languages = acceptLanguage
		.split(",")
		.map((s) => s.split(";")[0].trim());

	for (const lang of languages) {
		const normalized = lang.toLowerCase();
		if (normalized.startsWith("zh-hk") || normalized.startsWith("zh-tw"))
			return "zh";
		if (normalized.startsWith("zh-cn") || normalized === "cn") return "cn";
		if (normalized.startsWith("zh")) return "zh";
		if (normalized.startsWith("en")) return "en";
	}

	return "en";
}

let initPromise: Promise<void> | null = null;

/**
 * Initialize i18n with a specific language.
 * On the server, call this with the detected language BEFORE rendering.
 * On the client, this will be called without a language to use the browser detector.
 */
export async function initializeI18n(lng?: string): Promise<void> {
	// If already initialized, just ensure the language is correct
	if (i18n.isInitialized) {
		if (lng && i18n.language !== lng) {
			await i18n.changeLanguage(lng);
		}
		return;
	}

	// If initialization is in progress, wait for it
	if (initPromise) {
		await initPromise;
		if (lng && i18n.language !== lng) {
			await i18n.changeLanguage(lng);
		}
		return;
	}

	const config = {
		resources,
		lng, // Use provided lang (from server or undefined for detection)
		fallbackLng: "en",
		supportedLngs: ["en", "zh", "cn"],
		ns: ["common", "home", "booking"],
		defaultNS: "common",
		interpolation: {
			escapeValue: false,
		},
		react: {
			useSuspense: false,
		},
	};

	// Bind react-i18next
	i18n.use(initReactI18next);

	// Use detector on client only, and ONLY if no language is explicitly provided
	if (!isServer && !lng) {
		i18n.use(LanguageDetector);
	}

	initPromise = i18n.init(config).then(() => undefined);

	await initPromise;
}

// Client-side: initialize explicitly in app/client.tsx
// Server-side: defer initialization to beforeLoad to get the correct language

export default i18n;
