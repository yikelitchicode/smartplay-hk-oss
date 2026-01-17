import { describe, expect, it } from "vitest";
import type { WebhookPayload } from "../types";
import {
	detectWebhookType,
	formatDiscordPayload,
	formatGenericPayload,
	formatSlackPayload,
	WebhookType,
} from "./payload-formatters";

describe("Webhook Payload Formatters", () => {
	const mockPayload: WebhookPayload = {
		eventType: "available",
		venue: "Test Venue",
		facility: "Test Facility",
		date: "2023-10-27",
		timeRange: "10:00 - 11:00",
		bookingUrl: "https://example.com/book",
		timestamp: "2023-10-26T12:00:00Z",
	};

	const mockMeta = {
		watcherId: "watcher-123",
		venueId: "venue-456",
		facilityCode: "FAC-789",
		previousState: false,
		currentState: true,
	};

	describe("detectWebhookType", () => {
		it("should detect Discord URLs", () => {
			expect(
				detectWebhookType("https://discord.com/api/webhooks/123/abc"),
			).toBe(WebhookType.DISCORD);
			expect(
				detectWebhookType("https://discordapp.com/api/webhooks/123/abc"),
			).toBe(WebhookType.DISCORD);
		});

		it("should detect Slack URLs", () => {
			expect(
				detectWebhookType("https://hooks.slack.com/services/123/abc"),
			).toBe(WebhookType.SLACK);
		});

		it("should default to Generic for other URLs", () => {
			expect(detectWebhookType("https://example.com/webhook")).toBe(
				WebhookType.GENERIC,
			);
			expect(detectWebhookType("https://mysite.com/api/callback")).toBe(
				WebhookType.GENERIC,
			);
		});
	});

	describe("formatGenericPayload", () => {
		it("should format a correct generic payload", () => {
			const result = formatGenericPayload(mockPayload, mockMeta);

			expect(result.version).toBe("1.0");
			expect(result.event).toBe("session.available");
			expect(result.data.watcher_id).toBe(mockMeta.watcherId);
			expect(result.data.venue.name).toBe(mockPayload.venue);
			expect(result.data.session.start_time).toBe("10:00");
			expect(result.data.session.end_time).toBe("11:00");
			expect(result.data.availability.current_state).toBe(true);
		});

		it("should generate a unique ID", () => {
			const result1 = formatGenericPayload(mockPayload);
			const result2 = formatGenericPayload(mockPayload);
			expect(result1.id).not.toBe(result2.id);
		});
	});

	describe("formatDiscordPayload", () => {
		it("should format a valid Discord embed", () => {
			const result = formatDiscordPayload(mockPayload);

			expect(result.username).toBeDefined();
			expect(result.embeds).toHaveLength(1);
			const embed = result.embeds?.[0];
			if (!embed) {
				throw new Error("Embed should be defined");
			}

			expect(embed.title).toContain("Available");
			expect(embed.color).toBe(0x2ecc71); // Green
			expect(embed.fields).toHaveLength(4);
			expect(embed.fields?.[0].name).toBe("Venue");
			expect(embed.fields?.[0].inline).toBe(true);
		});
	});

	describe("formatSlackPayload", () => {
		it("should format a valid Slack payload", () => {
			const result = formatSlackPayload(mockPayload);

			expect(result.text).toContain("Available");
			expect(result.attachments).toHaveLength(1);
			const attachment = result.attachments?.[0];
			if (!attachment) {
				throw new Error("Attachment should be defined");
			}

			expect(attachment.color).toBe("#2ECC71");
			expect(attachment.actions).toHaveLength(1);
			expect(attachment.actions?.[0].url).toBe(mockPayload.bookingUrl);
		});
	});
});
