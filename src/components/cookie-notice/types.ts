export interface CookieCategory {
	id: "necessary" | "analytics" | "marketing" | "preferences";
	name: string;
	description: string;
	required?: boolean;
	defaultValue?: boolean;
}

export interface AcceptedCategories {
	necessary: boolean;
	analytics: boolean;
	marketing: boolean;
	preferences: boolean;
}

export interface CookieConsentStorage {
	version: string;
	timestamp: number;
	categories: AcceptedCategories;
	consentDate: string;
}

export interface CookieNoticeProps {
	// Display Configuration
	position?: "bottom" | "bottom-left" | "bottom-right" | "top";
	persistent?: boolean;
	expiryDays?: number;

	// Content Configuration
	title?: string;
	description?: string | React.ReactNode;
	privacyPolicyUrl?: string;
	learnMoreLabel?: string;

	// Cookie Categories
	categories?: CookieCategory[];

	// Styling
	className?: string;
	showOnMount?: boolean;

	// Callbacks
	onAccept?: (categories: AcceptedCategories) => void;
	onDecline?: () => void;
	onPartialAccept?: (categories: AcceptedCategories) => void;
}

export interface CookieConsentContextValue {
	consent: AcceptedCategories | null;
	isLoading: boolean;
	updateConsent: (categories: AcceptedCategories) => void;
	resetConsent: () => void;
	hasConsented: boolean;
}

export const STORAGE_KEY = "smartplay_cookie_consent";
export const CONSENT_VERSION = "1.0";

export const defaultCategories: CookieCategory[] = [
	{
		id: "necessary",
		name: "Strictly Necessary",
		description: "Required for the site to function properly",
		required: true,
		defaultValue: true,
	},
	{
		id: "analytics",
		name: "Analytics",
		description:
			"Help us improve our website by collecting anonymous usage data",
		required: false,
		defaultValue: false,
	},
	{
		id: "preferences",
		name: "Preferences",
		description: "Remember your settings and preferences",
		required: false,
		defaultValue: true,
	},
	{
		id: "marketing",
		name: "Marketing",
		description: "Help us measure the effectiveness of our campaigns",
		required: false,
		defaultValue: false,
	},
];
