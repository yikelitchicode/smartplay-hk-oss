import * as React from "react";
import {
	type AcceptedCategories,
	CONSENT_VERSION,
	type CookieConsentContextValue,
	type CookieConsentStorage,
	STORAGE_KEY,
} from "./types";

export const CookieConsentContext = React.createContext<
	CookieConsentContextValue | undefined
>(undefined);

export const useCookieConsent = () => {
	const context = React.useContext(CookieConsentContext);
	if (!context) {
		throw new Error(
			"useCookieConsent must be used within a CookieConsentProvider",
		);
	}
	return context;
};

export const useCookieConsentProvider = (
	expiryDays: number = 365,
	onAccept?: (categories: AcceptedCategories) => void,
) => {
	const [consent, setConsent] = React.useState<AcceptedCategories | null>(null);
	const [isLoading, setIsLoading] = React.useState(true);

	// Load consent from localStorage on mount
	React.useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const data: CookieConsentStorage = JSON.parse(stored);

				// Check version
				if (data.version !== CONSENT_VERSION) {
					// Version mismatch, clear old consent
					localStorage.removeItem(STORAGE_KEY);
					setIsLoading(false);
					return;
				}

				// Check expiry
				const now = Date.now();
				const expiryTime = data.timestamp + expiryDays * 24 * 60 * 60 * 1000;

				if (now > expiryTime) {
					// Consent expired
					localStorage.removeItem(STORAGE_KEY);
					setIsLoading(false);
					return;
				}

				// Valid consent found
				setConsent(data.categories);
				onAccept?.(data.categories);
			}
		} catch (error) {
			console.error("Error loading cookie consent:", error);
		} finally {
			setIsLoading(false);
		}
	}, [expiryDays, onAccept]);

	const updateConsent = (categories: AcceptedCategories) => {
		try {
			const storageData: CookieConsentStorage = {
				version: CONSENT_VERSION,
				timestamp: Date.now(),
				categories,
				consentDate: new Date().toISOString(),
			};

			localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
			setConsent(categories);
			onAccept?.(categories);
		} catch (error) {
			console.error("Error saving cookie consent:", error);
		}
	};

	const resetConsent = () => {
		try {
			localStorage.removeItem(STORAGE_KEY);
			setConsent(null);
		} catch (error) {
			console.error("Error resetting cookie consent:", error);
		}
	};

	const hasConsented = consent !== null;

	return {
		consent,
		isLoading,
		updateConsent,
		resetConsent,
		hasConsented,
	};
};
