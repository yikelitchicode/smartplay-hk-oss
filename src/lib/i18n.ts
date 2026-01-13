import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

const isServer = typeof window === "undefined";

i18n.use(HttpBackend).use(initReactI18next);

// Only use language detector on the client
if (!isServer) {
	i18n.use(LanguageDetector);
}

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

// Initialize i18n
if (!i18n.isInitialized) {
	i18n.init(i18nConfig);
}

export default i18n;
