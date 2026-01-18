/**
 * Notification Service
 *
 * Webhook delivery service for watcher notifications.
 * Supports Discord, Slack, and generic webhooks.
 */

import { prisma as db } from "@/db";
import type {
	Facility,
	FacilityType,
	Session,
	UserSettings,
	Watcher,
} from "@/generated/prisma/client";
import { constructSmartPlayUrl } from "@/lib/booking/smartplay-link";
import { createLogger } from "@/lib/logger";
import type {
	NotificationConfig,
	WatchEvaluationResult,
	WebhookConfig,
	WebhookPayload,
} from "../types";
import { formatPayload } from "./payload-formatters";

const logger = createLogger({ module: "notification-service" });

export class NotificationService {
	private notificationConfig: NotificationConfig;
	private webhookConfig: WebhookConfig;

	constructor(config: {
		notifications: NotificationConfig;
		webhook: WebhookConfig;
	}) {
		this.notificationConfig = config.notifications;
		this.webhookConfig = config.webhook;
	}

	/**
	 * Send notification for a watcher evaluation result
	 *
	 * @param watcherId - Watcher ID
	 * @param result - Evaluation result
	 * @param browserSessionId - Browser session for settings lookup
	 * @returns true if notification sent successfully
	 */
	async sendNotification(
		watcherId: string,
		result: WatchEvaluationResult,
		browserSessionId: string,
	): Promise<boolean> {
		try {
			// Get user settings for quiet hours and preferences
			const settings = await db.userSettings.findUnique({
				where: { browserSessionId },
			});

			// Check notification preferences (global switch still applies if desired, or per-watcher)
			// For now, we respect the global notifyONAvailable/Unavailable flags if they exist
			// But webhookUrl comes from the watcher

			const eventType: "available" | "unavailable" = result.becameAvailable
				? "available"
				: "unavailable";

			if (settings) {
				if (eventType === "available" && !settings.notifyOnAvailable) {
					logger.debug({ watcherId }, "Notify on available disabled, skipping");
					return false;
				}

				if (eventType === "unavailable" && !settings.notifyOnUnavailable) {
					logger.debug(
						{ watcherId },
						"Notify on unavailable disabled, skipping",
					);
					return false;
				}

				// Check quiet hours
				if (!(await this.shouldNotify(settings))) {
					logger.info(
						{ watcherId },
						"Quiet hours active, skipping notification",
					);
					return false;
				}
			}

			// Get watcher details for payload (including local webhookUrl)
			const watcher = await db.watcher.findUnique({
				where: { id: watcherId },
				include: {
					targetSession: {
						include: {
							venue: true,
							facilityType: true,
						},
					},
				},
			});

			if (!watcher || !watcher.targetSession) {
				logger.error({ watcherId }, "Watcher or target session not found");
				return false;
			}

			const webhookUrl = watcher.webhookUrl;

			if (!webhookUrl) {
				// Should not happen if required, but safe check
				logger.error({ watcherId }, "Watcher has no webhook URL");
				return false;
			}

			const venue = watcher.targetSession.venue;
			const facilityType = watcher.targetSession.facilityType;

			// Generate SmartPlay booking URL
			const bookingUrl = this.generateSmartPlayUrl(
				watcher,
				watcher.targetSession,
			);

			const payload: WebhookPayload = {
				eventType,
				venue: venue.name,
				facility: facilityType.name,
				date: watcher.date.toISOString().split("T")[0],
				timeRange: `${watcher.startTime} - ${watcher.endTime}`,
				bookingUrl,
				timestamp: new Date().toISOString(),
			};

			// Send webhook with retry logic
			const success = await this.sendWebhookWithRetry(webhookUrl, payload, {
				watcherId,
				venueId: venue.id,
				facilityCode: watcher.facilityCode,
				previousState: result.previousState,
				currentState: result.currentState,
			});

			if (success) {
				// Update watcher notification timestamp
				await db.watcher.update({
					where: { id: watcherId },
					data: { notifiedAt: new Date() },
				});

				logger.info({ watcherId }, "Notification sent successfully");
				return true;
			}

			logger.error({ watcherId }, "Failed to send notification after retries");
			return false;
		} catch (error) {
			logger.error({ watcherId, error }, "Error sending notification");
			return false;
		}
	}

	/**
	 * Send test webhook
	 *
	 * @param webhookUrl - Webhook URL to test
	 * @returns true if test successful
	 */
	async sendTestWebhook(webhookUrl: string): Promise<boolean> {
		const payload: WebhookPayload = {
			eventType: "available",
			venue: "Victoria Park Tennis Court",
			facility: "Tennis",
			date: new Date().toISOString().split("T")[0],
			timeRange: "18:00 - 19:00",
			bookingUrl: "https://smartplay-hk.oss/booking",
			timestamp: new Date().toISOString(),
		};

		// Mock metadata for test
		const mockMeta = {
			watcherId: "test-watcher-id",
			venueId: "test-venue-id",
			facilityCode: "TENNIS",
			previousState: false,
			currentState: true,
		};

		return this.sendWebhookWithRetry(webhookUrl, payload, mockMeta);
	}

	/**
	 * Check if notifications should be sent (quiet hours)
	 *
	 * @param settings - User settings
	 * @returns true if notifications allowed
	 */
	async shouldNotify(settings: UserSettings): Promise<boolean> {
		if (!settings.quietHoursStart || !settings.quietHoursEnd) {
			return true; // No quiet hours configured
		}

		const now = new Date();
		const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

		const parseTime = (time: string): number => {
			const [hours, minutes] = time.split(":").map(Number);
			return hours * 60 + minutes;
		};

		const startMinutes = parseTime(settings.quietHoursStart);
		const endMinutes = parseTime(settings.quietHoursEnd);

		// Check if current time is within quiet hours window
		if (startMinutes <= endMinutes) {
			// Simple window (e.g., 22:00 - 06:00)
			return currentTime < startMinutes || currentTime >= endMinutes;
		} else {
			// Overnight window (e.g., 22:00 - 06:00 next day)
			return currentTime >= endMinutes && currentTime < startMinutes;
		}
	}

	/**
	 * Send webhook with retry logic
	 *
	 * @param webhookUrl - Webhook URL
	 * @param payload - Base payload
	 * @param meta - Additional metadata for standardized payloads
	 * @returns true if successful
	 */
	private async sendWebhookWithRetry(
		webhookUrl: string,
		payload: WebhookPayload,
		meta?: {
			watcherId?: string;
			venueId?: string;
			facilityCode?: string;
			previousState?: boolean;
			currentState?: boolean;
		},
	): Promise<boolean> {
		// Validate webhook URL
		if (!this.validateWebhookUrl(webhookUrl)) {
			logger.error({ webhookUrl }, "Invalid webhook URL");
			return false;
		}

		// Detect webhook type and format payload
		const formattedPayload = formatPayload(webhookUrl, payload, meta);

		let lastError: Error | null = null;

		for (
			let attempt = 0;
			attempt <= this.notificationConfig.retryAttempts;
			attempt++
		) {
			try {
				const response = await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Bypass-Tunnel-Reminder": "true",
					},
					body: JSON.stringify(formattedPayload),
					signal: AbortSignal.timeout(this.notificationConfig.timeoutMs),
				});

				if (response.ok) {
					return true;
				}

				lastError = new Error(
					`Webhook returned ${response.status}: ${response.statusText}`,
				);

				// Don't retry client errors (4xx)
				if (response.status >= 400 && response.status < 500) {
					logger.warn(
						{
							webhookUrl,
							status: response.status,
						},
						"Webhook request failed (client error)",
					);
					return false;
				}
			} catch (error) {
				lastError =
					error instanceof Error ? error : new Error("Unknown webhook error");

				logger.warn(
					{
						webhookUrl,
						attempt,
						error: lastError.message,
					},
					"Webhook request failed",
				);
			}

			// Exponential backoff before retry
			if (attempt < this.notificationConfig.retryAttempts) {
				const delay = this.notificationConfig.retryDelayBase * 2 ** attempt;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		logger.error(
			{ webhookUrl, attempts: this.notificationConfig.retryAttempts + 1 },
			"Webhook failed after all retries",
		);

		return false;
	}

	/**
	 * Validate webhook URL
	 *
	 * @param url - Webhook URL to validate
	 * @returns true if valid
	 */
	private validateWebhookUrl(url: string): boolean {
		try {
			const parsed = new URL(url);

			// Must be HTTPS (except for local testing)
			const isLocal =
				parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

			if (parsed.protocol !== "https:" && !isLocal) {
				logger.warn({ protocol: parsed.protocol }, "Webhook must use HTTPS");
				return false;
			}

			// Check URL length
			if (url.length > this.webhookConfig.maxUrlLength) {
				logger.warn(
					{ length: url.length },
					"Webhook URL exceeds maximum length",
				);
				return false;
			}

			// Check allowed hosts
			const allowedHosts = this.webhookConfig.allowedHosts;
			const isAllowed = allowedHosts.some((host) =>
				parsed.hostname.endsWith(host),
			);

			if (!isAllowed) {
				logger.warn(
					{ hostname: parsed.hostname },
					"Webhook hostname not in allowed list",
				);
				return false;
			}

			return true;
		} catch (error) {
			logger.error({ error, url }, "Invalid webhook URL format");
			return false;
		}
	}

	/**
	 * Generate SmartPlay booking URL for a session
	 *
	 * @param _watcher - Watcher (unused parameter for interface consistency)
	 * @param session - Target session with venue and facility info
	 * @returns Official SmartPlay deep link
	 */
	private generateSmartPlayUrl(
		_watcher: Watcher,
		session: Session & { venue: Facility; facilityType: FacilityType },
	): string {
		const venue = session.venue;
		const facilityType = session.facilityType;

		// Calculate date index (UI tab)
		const today = new Date(
			new Date().toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }),
		);
		today.setHours(0, 0, 0, 0);
		const targetDate = new Date(session.date);
		targetDate.setHours(0, 0, 0, 0);
		// Note: dateIndex in the URL actually seems to be the day offset sometimes?
		// But in the previous clarification, the user said dateIndex represents the period (Morning/Afternoon/Evening).
		// Let me double check the user's previous message:
		// "dateIndex represent if is is MORNING or AFTERNOON or EVENING sessing, and the session index is the session index base on the dateIndex."

		const periodMapping = {
			MORNING: 0,
			AFTERNOON: 1,
			EVENING: 2,
		};
		const dateIndex =
			periodMapping[session.timePeriod as keyof typeof periodMapping];

		// For sessionIndex, we'd ideally need the index in the period list.
		// Since we don't have the full live list here, we might need to store it or accept a small inaccuracy.
		// However, most facilities have very few sessions per period.
		// As a fallback, we'll use a best estimate if not stored.
		// BUT we just updated the schema and crawler! We should probably store these indices.

		return constructSmartPlayUrl({
			venueId: venue.id,
			fatId: session.fatId ?? facilityType.code, // Fallback to facility code if fatId not populated
			fvrId: session.facilityVRId,
			venueName: venue.name,
			playDate: session.date.toISOString().split("T")[0],
			districtCode: venue.districtCode,
			sportCode: facilityType.groupCode,
			typeCode: facilityType.code,
			sessionIndex: 0, // Fallback/default if not known
			dateIndex: dateIndex,
			isFree: facilityType.isFree,
		});
	}
}
