/**
 * useTurnstile Hook
 *
 * Custom React hook for Cloudflare Turnstile integration.
 * Uses the official Cloudflare Turnstile script for maximum compatibility.
 *
 * Features:
 * - Singleton script loading (loads once globally)
 * - Automatic retry on failure
 * - Proper cleanup and memory leak prevention
 * - SSR-safe (checks for window)
 * - TypeScript with strict types
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTurnstileOptions {
	siteKey: string;
	onSuccess?: (token: string) => void;
	onError?: (error: string) => void;
	onExpire?: () => void;
	maxRetries?: number;
	retryDelay?: number;
}

interface TurnstileInstance {
	render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
	reset: (widgetId: string) => void;
	remove: (widgetId: string) => void;
	getResponse?: (widgetId?: string) => string;
}

interface TurnstileRenderOptions {
	sitekey: string;
	callback: (token: string) => void;
	"error-callback": (error: string) => void;
	"expired-callback": () => void;
	theme?: "light" | "dark" | "auto";
	retry?: "never" | "auto";
	"retry-interval"?: number;
	"refresh-expired"?: "auto" | "manual";
	"refresh-timeout"?: "auto" | "manual";
}

declare global {
	interface Window {
		turnstile?: TurnstileInstance;
	}
}

// Global script loading state (singleton pattern)
let scriptLoadPromise: Promise<void> | null = null;
let isScriptLoaded = false;

/**
 * Load Turnstile script globally (singleton)
 * Prevents duplicate script tags
 */
function loadTurnstileScript(): Promise<void> {
	if (isScriptLoaded) return Promise.resolve();
	if (scriptLoadPromise) return scriptLoadPromise;

	scriptLoadPromise = new Promise((resolve, reject) => {
		if (typeof window === "undefined") {
			resolve();
			return;
		}

		// Check if script already exists
		if (document.querySelector('script[src*="turnstile"]')) {
			isScriptLoaded = !!window.turnstile;
			resolve();
			return;
		}

		const script = document.createElement("script");
		script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
		script.async = true;
		script.crossOrigin = "anonymous";

		script.onload = () => {
			isScriptLoaded = true;
			resolve();
		};

		script.onerror = () => {
			reject(new Error("Failed to load Turnstile script"));
		};

		document.head.appendChild(script);
	});

	return scriptLoadPromise;
}

export function useTurnstile(options: UseTurnstileOptions) {
	const {
		siteKey,
		onSuccess,
		onError,
		onExpire,
		maxRetries = 3,
		retryDelay = 1000,
	} = options;

	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);
	const retryCountRef = useRef(0);
	const [token, setToken] = useState<string | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Store callbacks in refs to prevent unnecessary re-renders
	const callbacks = useRef({ onSuccess, onError, onExpire });
	useEffect(() => {
		callbacks.current = { onSuccess, onError, onExpire };
	}, [onSuccess, onError, onExpire]);

	// Load Turnstile script globally
	useEffect(() => {
		let mounted = true;

		loadTurnstileScript()
			.then(() => {
				if (mounted) {
					setIsLoaded(true);
				}
			})
			.catch((err) => {
				if (mounted) {
					console.error("Failed to load Turnstile:", err);
					setError(err instanceof Error ? err.message : "Failed to load");
				}
			});

		return () => {
			mounted = false;
		};
	}, []);

	// Render widget when script is loaded
	useEffect(() => {
		if (!isLoaded || !containerRef.current || !window.turnstile || !siteKey) {
			return;
		}

		// If widget already exists, don't render again
		if (widgetIdRef.current) return;

		const renderWidget = () => {
			if (!containerRef.current || !window.turnstile) return;

			try {
				const id = window.turnstile.render(containerRef.current, {
					sitekey: siteKey,
					callback: (newToken: string) => {
						setError(null);
						setToken(newToken);
						retryCountRef.current = 0; // Reset retry count on success
						callbacks.current.onSuccess?.(newToken);
					},
					"error-callback": (errorMessage: string) => {
						setError(errorMessage);
						setToken(null);
						callbacks.current.onError?.(errorMessage);

						// Auto-retry on error if under max retries
						if (retryCountRef.current < maxRetries) {
							retryCountRef.current++;
							setTimeout(() => {
								if (widgetIdRef.current && window.turnstile) {
									window.turnstile.reset(widgetIdRef.current);
								}
							}, retryDelay);
						}
					},
					"expired-callback": () => {
						setToken(null);
						setError("Verification expired");
						callbacks.current.onExpire?.();
					},
					theme: "auto",
					retry: "auto",
					"refresh-expired": "auto",
				});
				widgetIdRef.current = id;
			} catch (err) {
				console.error("Failed to render Turnstile widget:", err);
				setError("Failed to initialize widget");
			}
		};

		renderWidget();

		// Cleanup function
		return () => {
			if (widgetIdRef.current && window.turnstile) {
				try {
					window.turnstile.remove(widgetIdRef.current);
				} catch (err) {
					console.error("Error removing Turnstile widget:", err);
				}
				widgetIdRef.current = null;
			}
		};
	}, [isLoaded, siteKey, maxRetries, retryDelay]);

	/**
	 * Reset the widget to get a new token
	 */
	const reset = useCallback(() => {
		setError(null);
		setToken(null);
		retryCountRef.current = 0;

		if (widgetIdRef.current && window.turnstile) {
			try {
				window.turnstile.reset(widgetIdRef.current);
			} catch (err) {
				console.error("Error resetting Turnstile widget:", err);
				setError("Failed to reset widget");
			}
		}
	}, []);

	/**
	 * Get current token synchronously
	 */
	const getToken = useCallback((): string | null => {
		return token;
	}, [token]);

	/**
	 * Check if token is expired (for managed challenges)
	 */
	const isExpired = useCallback((): boolean => {
		return !token;
	}, [token]);

	return {
		containerRef,
		token,
		isLoaded,
		error,
		reset,
		getToken,
		isExpired,
	};
}
