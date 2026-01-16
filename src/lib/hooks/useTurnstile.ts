/**
 * useTurnstile Hook
 *
 * Custom React hook for Cloudflare Turnstile integration.
 * Uses the official Cloudflare Turnstile script for maximum compatibility.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTurnstileOptions {
	siteKey: string;
	onSuccess?: (token: string) => void;
	onError?: (error: string) => void;
	onExpire?: () => void;
}

interface TurnstileInstance {
	render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
	reset: (widgetId: string) => void;
	remove: (widgetId: string) => void;
}

interface TurnstileRenderOptions {
	sitekey: string;
	callback: (token: string) => void;
	"error-callback": (error: string) => void;
	"expired-callback": () => void;
	theme?: "light" | "dark" | "auto";
	size?: "normal" | "compact" | "invisible";
}

declare global {
	interface Window {
		turnstile?: TurnstileInstance;
	}
}

export function useTurnstile(options: UseTurnstileOptions) {
	const { siteKey, onSuccess, onError, onExpire } = options;
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);

	// Load Turnstile script
	useEffect(() => {
		if (typeof window === "undefined") return;

		// Check if script already loaded
		if (document.querySelector('script[src*="turnstile"]')) {
			setIsLoaded(!!window.turnstile);
			return;
		}

		const script = document.createElement("script");
		script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
		script.async = true;
		script.onload = () => setIsLoaded(true);
		document.head.appendChild(script);

		return () => {
			// Cleanup widget on unmount
			if (widgetIdRef.current && window.turnstile) {
				window.turnstile.remove(widgetIdRef.current);
			}
		};
	}, []);

	// Render widget when script is loaded
	useEffect(() => {
		if (!isLoaded || !containerRef.current || !window.turnstile) return;

		widgetIdRef.current = window.turnstile.render(containerRef.current, {
			sitekey: siteKey,
			callback: (newToken: string) => {
				setToken(newToken);
				onSuccess?.(newToken);
			},
			"error-callback": (error: string) => {
				setToken(null);
				onError?.(error);
			},
			"expired-callback": () => {
				setToken(null);
				onExpire?.();
			},
			theme: "auto",
			size: "normal",
		});
	}, [isLoaded, siteKey, onSuccess, onError, onExpire]);

	const reset = useCallback(() => {
		if (widgetIdRef.current && window.turnstile) {
			window.turnstile.reset(widgetIdRef.current);
			setToken(null);
		}
	}, []);

	return { containerRef, token, isLoaded, reset };
}
