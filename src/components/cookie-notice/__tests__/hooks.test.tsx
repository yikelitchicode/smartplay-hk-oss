import { act, renderHook } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "../CookieConsentProvider";
import { useCookieConsent } from "../hooks";

describe("CookieNotice Hooks", () => {
	const localStorageMock = (() => {
		let store: Record<string, string> = {};
		return {
			getItem: (key: string) => store[key] || null,
			setItem: (key: string, value: string) => {
				store[key] = value.toString();
			},
			removeItem: (key: string) => {
				delete store[key];
			},
			clear: () => {
				store = {};
			},
		};
	})();

	Object.defineProperty(window, "localStorage", {
		value: localStorageMock,
	});

	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
		<CookieConsentProvider expiryDays={365}>{children}</CookieConsentProvider>
	);

	describe("useCookieConsent", () => {
		it("should provide consent context", () => {
			const { result } = renderHook(() => useCookieConsent(), { wrapper });

			expect(result.current).toBeDefined();
			expect(result.current.consent).toBeNull();
			expect(result.current.hasConsented).toBe(false);
			expect(result.current.isLoading).toBe(false);
		});

		it("should update consent", () => {
			const { result } = renderHook(() => useCookieConsent(), { wrapper });

			act(() => {
				result.current.updateConsent({
					necessary: true,
					analytics: true,
					marketing: false,
					preferences: false,
				});
			});

			expect(result.current.consent).toEqual({
				necessary: true,
				analytics: true,
				marketing: false,
				preferences: false,
			});
			expect(result.current.hasConsented).toBe(true);
		});

		it("should reset consent", () => {
			const { result } = renderHook(() => useCookieConsent(), { wrapper });

			act(() => {
				result.current.updateConsent({
					necessary: true,
					analytics: true,
					marketing: true,
					preferences: true,
				});
			});

			expect(result.current.hasConsented).toBe(true);

			act(() => {
				result.current.resetConsent();
			});

			expect(result.current.consent).toBeNull();
			expect(result.current.hasConsented).toBe(false);
		});
	});

	describe("useCookieConsentProvider", () => {
		it("should load consent from localStorage on mount", async () => {
			const savedConsent = {
				version: "1.0",
				timestamp: Date.now(),
				categories: {
					necessary: true,
					analytics: false,
					marketing: false,
					preferences: true,
				},
				consentDate: new Date().toISOString(),
			};

			localStorage.setItem(
				"smartplay_cookie_consent",
				JSON.stringify(savedConsent),
			);

			const onAccept = vi.fn();

			const Wrapper = ({ children }: { children: React.ReactNode }) => (
				<CookieConsentProvider expiryDays={365} onAccept={onAccept}>
					{children}
				</CookieConsentProvider>
			);

			const { result } = renderHook(() => useCookieConsent(), {
				wrapper: Wrapper,
			});

			expect(result.current.consent).toEqual(savedConsent.categories);
		});

		it("should handle expired consent", () => {
			const expiredTimestamp = Date.now() - 400 * 24 * 60 * 60 * 1000;
			localStorage.setItem(
				"smartplay_cookie_consent",
				JSON.stringify({
					version: "1.0",
					timestamp: expiredTimestamp,
					categories: {
						necessary: true,
						analytics: false,
						marketing: false,
						preferences: false,
					},
					consentDate: new Date(expiredTimestamp).toISOString(),
				}),
			);

			const Wrapper = ({ children }: { children: React.ReactNode }) => (
				<CookieConsentProvider expiryDays={365}>
					{children}
				</CookieConsentProvider>
			);

			const { result } = renderHook(() => useCookieConsent(), {
				wrapper: Wrapper,
			});

			expect(result.current.consent).toBeNull();
			expect(localStorage.getItem("smartplay_cookie_consent")).toBeNull();
		});

		it("should handle version mismatch", () => {
			localStorage.setItem(
				"smartplay_cookie_consent",
				JSON.stringify({
					version: "0.9",
					timestamp: Date.now(),
					categories: {
						necessary: true,
						analytics: false,
						marketing: false,
						preferences: false,
					},
					consentDate: new Date().toISOString(),
				}),
			);

			const Wrapper = ({ children }: { children: React.ReactNode }) => (
				<CookieConsentProvider expiryDays={365}>
					{children}
				</CookieConsentProvider>
			);

			const { result } = renderHook(() => useCookieConsent(), {
				wrapper: Wrapper,
			});

			expect(result.current.consent).toBeNull();
			expect(localStorage.getItem("smartplay_cookie_consent")).toBeNull();
		});

		it("should save consent to localStorage", () => {
			const Wrapper = ({ children }: { children: React.ReactNode }) => (
				<CookieConsentProvider expiryDays={365}>
					{children}
				</CookieConsentProvider>
			);

			const { result } = renderHook(() => useCookieConsent(), {
				wrapper: Wrapper,
			});

			act(() => {
				result.current.updateConsent({
					necessary: true,
					analytics: true,
					marketing: false,
					preferences: true,
				});
			});

			const stored = localStorage.getItem("smartplay_cookie_consent");
			expect(stored).toBeDefined();

			const data = JSON.parse(stored as string);
			expect(data.version).toBe("1.0");
			expect(data.categories).toEqual({
				necessary: true,
				analytics: true,
				marketing: false,
				preferences: true,
			});
			expect(data.timestamp).toBeDefined();
			expect(data.consentDate).toBeDefined();
		});
	});
});
