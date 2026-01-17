/**
 * Webhook Payload Formatters
 *
 * Handles the transformation of internal event data into platform-specific
 * webhook payloads (Discord, Slack, Generic).
 */

import { v4 as uuidv4 } from "uuid";
import type {
	DiscordWebhookPayload,
	GenericWebhookPayload,
	SlackWebhookPayload,
	WebhookPayload,
	WebhookPayloadUnion,
} from "../types";

export enum WebhookType {
	DISCORD = "DISCORD",
	SLACK = "SLACK",
	GENERIC = "GENERIC",
}

/**
 * Detect webhook type from URL
 */
export function detectWebhookType(url: string): WebhookType {
	try {
		const hostname = new URL(url).hostname;
		if (
			hostname.endsWith("discord.com") ||
			hostname.endsWith("discordapp.com")
		) {
			return WebhookType.DISCORD;
		}
		if (hostname.endsWith("slack.com")) {
			return WebhookType.SLACK;
		}
		return WebhookType.GENERIC;
	} catch {
		return WebhookType.GENERIC;
	}
}

/**
 * Format payload for Discord
 * Follows Discord Embed Limits: https://discord.com/developers/docs/resources/message#embed-object-embed-limits
 */
export function formatDiscordPayload(
	payload: WebhookPayload,
	_meta?: {
		watcherId?: string;
		venueId?: string;
		previousState?: boolean;
		currentState?: boolean;
	},
): DiscordWebhookPayload {
	const isAvailable = payload.eventType === "available";
	const color = isAvailable ? 0x2ecc71 : 0xe74c3c; // Green for available, Red for unavailable
	const title = isAvailable
		? "🎾 Facility Available!"
		: "❌ Facility No Longer Available";

	return {
		username: "SmartPlay HK Watcher",
		avatar_url: "https://smartplay-hk.oss/logo.png",
		embeds: [
			{
				title: title.substring(0, 256), // Max 256 chars
				color,
				url: payload.bookingUrl,
				timestamp: payload.timestamp,
				author: {
					name: "SmartPlay HK OSS",
					url: "https://smartplay-hk.oss",
					icon_url: "https://smartplay-hk.oss/logo.png",
				},
				thumbnail: {
					// Use a sport-specific icon if available, otherwise generic
					url: "https://smartplay-hk.oss/icons/sports-tennis.png",
				},
				fields: [
					{
						name: "Venue",
						value: payload.venue.substring(0, 1024), // Max 1024 chars
						inline: true,
					},
					{
						name: "Date",
						value: payload.date.substring(0, 1024),
						inline: true,
					},
					{
						name: "Time",
						value: payload.timeRange.substring(0, 1024),
						inline: true,
					},
					{
						name: "Facility",
						value: payload.facility.substring(0, 1024),
						inline: false, // Full width for visibility
					},
				],
				footer: {
					text: "Click title to book now • SmartPlay HK OSS",
				},
			},
		],
	};
}

/**
 * Format payload for Slack
 */
export function formatSlackPayload(
	payload: WebhookPayload,
): SlackWebhookPayload {
	const isAvailable = payload.eventType === "available";
	const color = isAvailable ? "#2ECC71" : "#E74C3C";
	const title = isAvailable
		? "🎾 Facility Available!"
		: "❌ Facility No Longer Available";

	return {
		text: title,
		attachments: [
			{
				color,
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
						style: isAvailable ? "primary" : "danger",
					},
				],
			},
		],
	};
}

/**
 * Format payload for Generic Webhook (JSON)
 */
export function formatGenericPayload(
	payload: WebhookPayload,
	meta?: {
		watcherId?: string;
		venueId?: string;
		facilityCode?: string;
		previousState?: boolean;
		currentState?: boolean;
	},
): GenericWebhookPayload {
	const [startTime, endTime] = payload.timeRange
		.split("-")
		.map((t) => t.trim());

	return {
		version: "1.0",
		id: uuidv4(),
		event: `session.${payload.eventType}`,
		created_at: payload.timestamp,
		data: {
			watcher_id: meta?.watcherId || "",
			venue: {
				id: meta?.venueId || "",
				name: payload.venue,
			},
			facility: {
				code: meta?.facilityCode || "",
				name: payload.facility,
			},
			session: {
				date: payload.date,
				start_time: startTime || "",
				end_time: endTime || "",
			},
			availability: {
				previous_state: meta?.previousState ?? false, // Default if unknown
				current_state: meta?.currentState ?? true,
			},
			booking_url: payload.bookingUrl,
		},
	};
}

/**
 * Main dispatcher to format payload based on URL
 */
export function formatPayload(
	url: string,
	basePayload: WebhookPayload,
	meta?: {
		watcherId?: string;
		venueId?: string;
		facilityCode?: string;
		previousState?: boolean;
		currentState?: boolean;
	},
): WebhookPayloadUnion {
	const type = detectWebhookType(url);

	switch (type) {
		case WebhookType.DISCORD:
			return formatDiscordPayload(basePayload, meta);
		case WebhookType.SLACK:
			return formatSlackPayload(basePayload);
		default:
			return formatGenericPayload(basePayload, meta);
	}
}
