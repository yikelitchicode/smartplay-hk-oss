/**
 * Test Webhook API Route
 *
 * Sends a mock notification to the specified URL to verify
 * connectivity and payload handling.
 *
 * @route POST /api/watch/test-webhook
 */

import { createFileRoute } from "@tanstack/react-router";
import { loadConfig } from "@/lib/watch/config";
import { NotificationService } from "@/lib/watch/services/notification-service";

const watchConfig = loadConfig();
const notificationService = new NotificationService({
	notifications: watchConfig.notifications,
	webhook: watchConfig.webhook,
});

export const Route = createFileRoute("/api/watch/test-webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: { webhookUrl?: string } | undefined;

				// Parse JSON body
				try {
					body = await request.json();
				} catch (_error) {
					return new Response(
						JSON.stringify({
							success: false,
							error: {
								code: "INVALID_JSON",
								message: "Invalid JSON body",
							},
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				try {
					const webhookUrl = body?.webhookUrl;

					// Validate required field
					if (!webhookUrl || typeof webhookUrl !== "string") {
						return new Response(
							JSON.stringify({
								success: false,
								error: {
									code: "INVALID_REQUEST",
									message: "webhookUrl is required and must be a string",
								},
							}),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					// Validate URL format
					try {
						const parsed = new URL(webhookUrl);
						const isLocal =
							parsed.hostname === "localhost" ||
							parsed.hostname === "127.0.0.1";

						if (parsed.protocol !== "https:" && !isLocal) {
							return new Response(
								JSON.stringify({
									success: false,
									error: {
										code: "INVALID_WEBHOOK_URL",
										message: "Webhook URL must use HTTPS",
									},
								}),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
					} catch {
						return new Response(
							JSON.stringify({
								success: false,
								error: {
									code: "INVALID_WEBHOOK_URL",
									message: "Invalid URL format",
								},
							}),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					// Send test webhook
					const success = await notificationService.sendTestWebhook(webhookUrl);

					if (success) {
						return new Response(
							JSON.stringify({
								success: true,
								message: "Mock notification sent successfully",
							}),
							{
								status: 200,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					return new Response(
						JSON.stringify({
							success: false,
							error: {
								code: "DELIVERY_FAILED",
								message: "Failed to deliver notification to the specified URL",
							},
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				} catch (error) {
					console.error("Error in test-webhook handler:", error);
					return new Response(
						JSON.stringify({
							success: false,
							error: {
								code: "INTERNAL_ERROR",
								message: "An unexpected error occurred",
							},
						}),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			},
		},
	},
});
