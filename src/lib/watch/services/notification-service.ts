/**
 * Notification Service
 *
 * Webhook delivery service for watcher notifications.
 * Supports Discord, Slack, and generic webhooks.
 */

import { prisma as db } from "@/db";
import type { UserSettings, Watcher } from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";
import type {
	NotificationConfig,
	WatchEvaluationResult,
	WebhookConfig,
	WebhookPayload,
} from "../types";

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
			// Get user settings
			const settings = await db.userSettings.findUnique({
				where: { browserSessionId },
			});

			if (!settings || !settings.webhookEnabled || !settings.webhookUrl) {
				logger.debug(
					{ watcherId },
					"Webhook not configured or disabled, skipping notification",
				);
				return false;
			}

			// Check notification preferences
			const eventType: "available" | "unavailable" = result.becameAvailable
				? "available"
				: "unavailable";

			if (eventType === "available" && !settings.notifyOnAvailable) {
				logger.debug({ watcherId }, "Notify on available disabled, skipping");
				return false;
			}

			if (eventType === "unavailable" && !settings.notifyOnUnavailable) {
				logger.debug({ watcherId }, "Notify on unavailable disabled, skipping");
				return false;
			}

			// Check quiet hours
			if (!(await this.shouldNotify(settings))) {
				logger.info({ watcherId }, "Quiet hours active, skipping notification");
				return false;
			}

			// Get watcher details for payload
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

			// Generate webhook payload
			const venue = watcher.targetSession.venue;
			const facilityType = watcher.targetSession.facilityType;

			const payload: WebhookPayload = {
				eventType,
				venue: venue.name,
				facility: facilityType.name,
				date: watcher.date.toISOString().split("T")[0],
				timeRange: `${watcher.startTime} - ${watcher.endTime}`,
				bookingUrl: this.generateBookingUrl(watcher as Watcher),
				timestamp: new Date().toISOString(),
			};

			// Send webhook with retry logic
			const success = await this.sendWebhookWithRetry(
				settings.webhookUrl,
				payload,
			);

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
			timeRange: "18:00 - 20:00",
			bookingUrl: "https://smartplay-hk.oss/booking",
			timestamp: new Date().toISOString(),
		};

		return this.sendWebhookWithRetry(webhookUrl, payload);
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
	 * @param payload - Webhook payload
	 * @returns true if successful
	 */
	private async sendWebhookWithRetry(
		webhookUrl: string,
		payload: WebhookPayload,
	): Promise<boolean> {
		// Validate webhook URL
		if (!this.validateWebhookUrl(webhookUrl)) {
			logger.error({ webhookUrl }, "Invalid webhook URL");
			return false;
		}

		// Detect webhook type and format payload
		const formattedPayload = this.formatPayload(webhookUrl, payload);

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

			// Must be HTTPS
			if (parsed.protocol !== "https:") {
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
	 * Format webhook payload based on URL (Discord/Slack/Generic)
	 *
	 * @param webhookUrl - Webhook URL
	 * @param payload - Base payload
	 * @returns Formatted payload
	 */
	private formatPayload(webhookUrl: string, payload: WebhookPayload): unknown {
		const hostname = new URL(webhookUrl).hostname;

		// Discord webhook
		if (hostname.includes("discord")) {
			return {
				username: "SmartPlay HK Bot",
				avatar_url: "https://smartplay-hk.oss/logo.png",
				embeds: [
					{
						title:
							payload.eventType === "available"
								? "🎾 Facility Available!"
								: "❌ Facility No Longer Available",
						color: payload.eventType === "available" ? 5814783 : 16007990,
						fields: [
							{
								name: "Venue",
								value: payload.venue,
								inline: true,
							},
							{
								name: "Date",
								value: payload.date,
								inline: true,
							},
							{
								name: "Time",
								value: payload.timeRange,
								inline: true,
							},
							{
								name: "Facility",
								value: payload.facility,
								inline: true,
							},
						],
						url: payload.bookingUrl,
						timestamp: payload.timestamp,
					},
				],
			};
		}

		// Slack webhook
		if (hostname.includes("slack")) {
			return {
				text:
					payload.eventType === "available"
						? "🎾 Facility Available!"
						: "❌ Facility No Longer Available",
				attachments: [
					{
						color: payload.eventType === "available" ? "#00BCD4" : "#FF5722",
						fields: [
							{
								title: "Venue",
								value: payload.venue,
								short: true,
							},
							{
								title: "Date & Time",
								value: `${payload.date} ${payload.timeRange}`,
								short: true,
							},
							{
								title: "Facility",
								value: payload.facility,
								short: true,
							},
						],
						actions: [
							{
								type: "button",
								text: "Book Now",
								url: payload.bookingUrl,
								style: "primary",
							},
						],
					},
				],
			};
		}

		// Generic webhook
		return {
			event: `session.${payload.eventType}`,
			timestamp: payload.timestamp,
			data: {
				venue: payload.venue,
				facility: payload.facility,
				date: payload.date,
				startTime: payload.timeRange.split(" - ")[0],
				endTime: payload.timeRange.split(" - ")[1],
				bookingUrl: payload.bookingUrl,
			},
		};
	}

	/**
	 * Generate booking URL for a session
	 *
	 * @param watcher - Watcher with target session
	 * @returns Booking URL
	 */
	private generateBookingUrl(watcher: Watcher): string {
		const baseUrl = process.env.APP_URL || "https://smartplay-hk.oss";
		const date = watcher.date.toISOString().split("T")[0];
		return `${baseUrl}/booking?date=${date}&venue=${watcher.venueId}`;
	}
}
