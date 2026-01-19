/**
 * Webhook Server Functions
 *
 * TanStack Start server functions for webhook management.
 * Provides API endpoints for configuring and testing webhooks.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma as db } from "@/db";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/lib/server-utils/error-handler";
import { loadConfig } from "@/lib/watch/config";
import { NotificationService } from "@/lib/watch/services/notification-service";

// ============================================
// Initialize Services
// ============================================

const watchConfig = loadConfig();
const notificationService = new NotificationService({
	notifications: watchConfig.notifications,
	webhook: watchConfig.webhook,
});

import { getOrCreateBrowserSessionId } from "@/lib/server-utils/session";

// ============================================
// Set Webhook URL
// ============================================

export const setWebhookUrl = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			webhookUrl: z.string().url(),
			enabled: z.boolean().optional().default(true),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const browserSessionId = await getOrCreateBrowserSessionId();

			// Validate webhook URL
			const parsedUrl = new URL(data.webhookUrl);

			// Must be HTTPS
			if (parsedUrl.protocol !== "https:") {
				return createErrorResponse(
					"Webhook URL must use HTTPS",
					"INVALID_WEBHOOK_URL",
				);
			}

			// Check allowed hosts
			const allowedHosts = watchConfig.webhook.allowedHosts;
			const isAllowed = allowedHosts.some((host) =>
				parsedUrl.hostname.endsWith(host),
			);

			if (!isAllowed) {
				return createErrorResponse(
					"Webhook hostname not allowed",
					"INVALID_WEBHOOK_HOST",
				);
			}

			// Upsert user settings
			await db.userSettings.upsert({
				where: { browserSessionId },
				create: {
					browserSessionId,
					webhookUrl: data.webhookUrl,
					webhookEnabled: data.enabled,
				},
				update: {
					webhookUrl: data.webhookUrl,
					webhookEnabled: data.enabled,
				},
			});

			return createSuccessResponse(null, "Webhook configured successfully");
		} catch (error) {
			console.error("Error setting webhook URL:", error);
			return createErrorResponse(
				"Failed to configure webhook",
				"SET_WEBHOOK_ERROR",
			);
		}
	});

// ============================================
// Get Webhook Settings
// ============================================

export const getWebhookSettings = createServerFn({
	method: "GET",
}).handler(async () => {
	try {
		const browserSessionId = await getOrCreateBrowserSessionId();

		const settings = await db.userSettings.findUnique({
			where: { browserSessionId },
			select: {
				webhookUrl: true,
				webhookEnabled: true,
				notifyOnAvailable: true,
				notifyOnUnavailable: true,
				quietHoursStart: true,
				quietHoursEnd: true,
			},
		});

		return createSuccessResponse(
			settings || {
				webhookUrl: null,
				webhookEnabled: false,
				notifyOnAvailable: true,
				notifyOnUnavailable: false,
				quietHoursStart: null,
				quietHoursEnd: null,
			},
		);
	} catch (error) {
		console.error("Error fetching webhook settings:", error);
		return createErrorResponse(
			"Failed to fetch webhook settings",
			"FETCH_WEBHOOK_ERROR",
		);
	}
});

// ============================================
// Test Webhook
// ============================================

import { verifyWebhookConnectivity } from "@/lib/watch/services/webhook-validator";

export const testWebhook = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			webhookUrl: z.string().url().optional(),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const browserSessionId = await getOrCreateBrowserSessionId();

			// Use provided URL or fetch from settings
			let webhookUrl = data.webhookUrl;

			if (!webhookUrl) {
				const settings = await db.userSettings.findUnique({
					where: { browserSessionId },
					select: { webhookUrl: true },
				});

				webhookUrl = settings?.webhookUrl ?? undefined;
			}

			if (!webhookUrl) {
				return createErrorResponse(
					"No webhook URL configured",
					"NO_WEBHOOK_URL",
				);
			}

			// Step 1: Verify connectivity with ping/challenge
			const verification = await verifyWebhookConnectivity(webhookUrl);
			if (!verification.success) {
				return createErrorResponse(
					verification.error || "Webhook connectivity test failed",
					"WEBHOOK_PING_FAILED",
				);
			}

			// Step 2: Send demo notification to show what alerts look like
			const success = await notificationService.sendTestWebhook(webhookUrl);

			if (success) {
				return createSuccessResponse(
					null,
					"Webhook verified and test notification sent",
				);
			} else {
				return createErrorResponse(
					"Webhook verified but test notification failed",
					"TEST_NOTIFICATION_FAILED",
				);
			}
		} catch (error) {
			console.error("Error testing webhook:", error);
			return createErrorResponse(
				"Failed to test webhook",
				"TEST_WEBHOOK_ERROR",
			);
		}
	});
