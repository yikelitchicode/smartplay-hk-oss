import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

const isServer = typeof window === "undefined";

const i18nConfig = {
	fallbackLng: "en",
	supportedLngs: ["en", "zh", "cn"],
	ns: ["common", "home", "booking"],
	defaultNS: "common",
	interpolation: {
		escapeValue: false,
	},
	backend: {
		loadPath: "/locales/{{lng}}/{{ns}}.json",
	},
	react: {
		useSuspense: true,
	},
};

// Bind react-i18next
i18n.use(initReactI18next);

// Use backend and detector
i18n.use(HttpBackend);
if (!isServer) {
	i18n.use(LanguageDetector);
}

// Synchronous-ish initialization (returns the instance)
i18n.init(i18nConfig).catch((err) => {
	console.error("❌ i18n initialization error:", err);
});

export async function ensureI18nInitialized(): Promise<void> {
	if (i18n.isInitialized) {
		return;
	}

	return new Promise((resolve) => {
		i18n.on("initialized", () => resolve());
		// If already initialized by the time we attach, resolve immediately
		if (i18n.isInitialized) resolve();
	});
}

export default i18n;
