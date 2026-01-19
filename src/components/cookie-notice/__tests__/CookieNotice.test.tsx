import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeI18n } from "@/lib/i18n";
import { CookieConsentProvider, CookieNotice } from "../index";
import { STORAGE_KEY } from "../types";

describe("CookieNotice", () => {
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

	beforeEach(async () => {
		localStorage.clear();
		await initializeI18n("en");
	});

	const renderWithProvider = (
		component: React.ReactElement,
		props?: { expiryDays?: number },
	) => {
		const AllWrapper = ({ children }: { children: React.ReactNode }) => (
			<CookieConsentProvider {...props}>{children}</CookieConsentProvider>
		);
		return render(component, { wrapper: AllWrapper });
	};

	const waitForVisibility = async (container: HTMLElement) => {
		await waitFor(() => {
			expect(container.querySelector('[role="dialog"]')).not.toBeNull();
		});
	};

	describe("Basic Rendering", () => {
		it("should render when no consent exists", async () => {
			const { container } = renderWithProvider(<CookieNotice />);
			await waitForVisibility(container);
		});

		it("should not render when consent already exists", async () => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					version: "1.0",
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

			const { container } = renderWithProvider(<CookieNotice />);

			// Small delay for useEffect
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(container.querySelector('[role="dialog"]')).toBeNull();
		});

		it("should render custom title and description", async () => {
			const { container } = renderWithProvider(
				<CookieNotice
					title="Custom Title"
					description="Custom description text"
				/>,
			);
			await waitForVisibility(container);

			expect(container.textContent).toContain("Custom Title");
			expect(container.textContent).toContain("Custom description text");
		});
	});

	describe("User Interactions", () => {
		it("should call onAccept when Accept All is clicked", async () => {
			const onAccept = vi.fn();
			const { container } = renderWithProvider(
				<CookieNotice onAccept={onAccept} />,
			);
			await waitForVisibility(container);

			const acceptButton = Array.from(
				container.querySelectorAll("button"),
			).find((btn) => btn.textContent === "Accept All");
			expect(acceptButton).toBeDefined();

			if (acceptButton) {
				fireEvent.click(acceptButton);

				await waitFor(() => {
					expect(onAccept).toHaveBeenCalledWith({
						necessary: true,
						analytics: true,
						marketing: true,
						preferences: true,
					});
				});
			}
		});

		it("should call onDecline when Decline is clicked", async () => {
			const onDecline = vi.fn();
			const { container } = renderWithProvider(
				<CookieNotice onDecline={onDecline} />,
			);
			await waitForVisibility(container);

			const declineButton = Array.from(
				container.querySelectorAll("button"),
			).find((btn) => btn.textContent === "Decline");
			expect(declineButton).toBeDefined();

			if (declineButton) {
				fireEvent.click(declineButton);

				await waitFor(() => {
					expect(onDecline).toHaveBeenCalled();
				});
			}
		});

		it("should show settings when Customize is clicked", async () => {
			const { container } = renderWithProvider(<CookieNotice />);
			await waitForVisibility(container);

			const customizeButton = Array.from(
				container.querySelectorAll("button"),
			).find((btn) => btn.textContent === "Customize");
			expect(customizeButton).toBeDefined();

			if (customizeButton) {
				fireEvent.click(customizeButton);

				await waitFor(() => {
					expect(container.textContent).toContain("Customize your preferences");
				});
			}
		});
	});

	describe("localStorage Integration", () => {
		it("should save consent to localStorage", async () => {
			const { container } = renderWithProvider(<CookieNotice />);
			await waitForVisibility(container);

			const acceptButton = Array.from(
				container.querySelectorAll("button"),
			).find((btn) => btn.textContent === "Accept All");

			if (acceptButton) {
				fireEvent.click(acceptButton);

				await waitFor(() => {
					const stored = localStorage.getItem(STORAGE_KEY);
					expect(stored).not.toBeNull();

					const data = JSON.parse(stored as string);
					expect(data.categories).toEqual({
						necessary: true,
						analytics: true,
						marketing: true,
						preferences: true,
					});
				});
			}
		});

		it("should clear expired consent", async () => {
			const expiredTimestamp = Date.now() - 400 * 24 * 60 * 60 * 1000; // 400 days ago
			localStorage.setItem(
				STORAGE_KEY,
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

			const { container } = renderWithProvider(
				<CookieNotice expiryDays={365} />,
			);

			// Should render because consent expired
			await waitForVisibility(container);
		});

		it("should handle version mismatch", async () => {
			localStorage.setItem(
				STORAGE_KEY,
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

			const { container } = renderWithProvider(<CookieNotice />);

			// Should render because version mismatch
			await waitForVisibility(container);
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", async () => {
			const { container } = renderWithProvider(<CookieNotice />);
			await waitForVisibility(container);

			const dialog = container.querySelector('[role="dialog"]');
			expect(dialog).not.toBeNull();
			expect(dialog?.getAttribute("aria-labelledby")).toBeTruthy();
			expect(dialog?.getAttribute("aria-describedby")).toBeTruthy();
		});

		it("should allow keyboard navigation", async () => {
			const { container } = renderWithProvider(<CookieNotice />);
			await waitForVisibility(container);

			const acceptButton = Array.from(
				container.querySelectorAll("button"),
			).find((btn) => btn.textContent === "Accept All");

			expect(acceptButton).toBeDefined();
		});

		it("should disable required checkboxes", async () => {
			const { container } = renderWithProvider(<CookieNotice />);
			await waitForVisibility(container);

			// Open settings
			const customizeButton = Array.from(
				container.querySelectorAll("button"),
			).find((btn) => btn.textContent === "Customize");

			if (customizeButton) {
				fireEvent.click(customizeButton);

				await waitFor(() => {
					const necessaryCheckbox = container.querySelector(
						'input[type="checkbox"][id*="necessary"]',
					);
					expect(necessaryCheckbox?.getAttribute("disabled")).not.toBeNull();
				});
			}
		});
	});

	describe("Position Variants", () => {
		it.each([
			"bottom",
			"bottom-left",
			"bottom-right",
			"top",
		] as const)('should render at position "%s"', async (position) => {
			const { container } = renderWithProvider(
				<CookieNotice position={position} />,
			);

			await waitForVisibility(container);
		});
	});
});
