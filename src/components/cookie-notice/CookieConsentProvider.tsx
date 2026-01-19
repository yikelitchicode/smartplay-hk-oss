import type * as React from "react";
import { CookieConsentContext, useCookieConsentProvider } from "./hooks";
import type { AcceptedCategories } from "./types";

export interface CookieConsentProviderProps {
	children: React.ReactNode;
	expiryDays?: number;
	onAccept?: (categories: AcceptedCategories) => void;
}

export const CookieConsentProvider: React.FC<CookieConsentProviderProps> = ({
	children,
	expiryDays = 365,
	onAccept,
}) => {
	const value = useCookieConsentProvider(expiryDays, onAccept);

	return (
		<CookieConsentContext.Provider value={value}>
			{children}
		</CookieConsentContext.Provider>
	);
};
