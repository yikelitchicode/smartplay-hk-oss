import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "webhook-validator" });

export interface WebhookVerificationResult {
	success: boolean;
	error?: string;
}

/**
 * Verify connectivity and compatibility of a webhook URL.
 * Supports:
 * - Automation CLI (Ping-Challenge)
 * - Discord/Slack (Test message)
 * - Generic Webhooks (Status 2xx check)
 */
export async function verifyWebhookConnectivity(
	url: string,
): Promise<WebhookVerificationResult> {
	try {
		const isDiscord =
			url.includes("discord.com") || url.includes("discordapp.com");
		const isSlack = url.includes("slack.com");

		if (isDiscord || isSlack) {
			return await verifyPlatformWebhook(url, isDiscord ? "Discord" : "Slack");
		}

		return await verifyAutomationWebhook(url);
	} catch (error) {
		logger.error({ error, url }, "Webhook connectivity check failed");
		return {
			success: false,
			error:
				"Connection failed. Please ensure the URL is correct and accessible.",
		};
	}
}

/**
 * Verify a platform webhook (Discord/Slack) by sending a test message.
 */
async function verifyPlatformWebhook(
	url: string,
	platform: "Discord" | "Slack",
): Promise<WebhookVerificationResult> {
	const payload =
		platform === "Discord"
			? {
					content: "🔌 **SmartPlay HK Tracker** connected successfully!",
					embeds: [
						{
							title: "Webhook Verified",
							description:
								"This webhook is now ready to receive notifications.",
							color: 5814783, // Primary color
						},
					],
				}
			: {
					text: "🔌 *SmartPlay HK Tracker* connected successfully! This webhook is now ready to receive notifications.",
				};

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"bypass-tunnel-reminder": "true",
		},
		body: JSON.stringify(payload),
	});

	if (response.ok) {
		return { success: true };
	}

	const errorText = await response.text();
	logger.warn(
		{ platform, status: response.status, errorText },
		"Platform webhook verification failed",
	);
	return {
		success: false,
		error: `Failed to verify ${platform} webhook. Status: ${response.status}`,
	};
}

/**
 * Verify a custom/automation webhook by sending an infra.ping event.
 */
async function verifyAutomationWebhook(
	url: string,
): Promise<WebhookVerificationResult> {
	const challenge = Math.random().toString(36).substring(2, 15);
	const pingPayload = {
		id: crypto.randomUUID(),
		event: "infra.ping",
		timestamp: new Date().toISOString(),
		challenge,
	};

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"bypass-tunnel-reminder": "true",
		},
		body: JSON.stringify(pingPayload),
	});

	if (!response.ok) {
		logger.warn(
			{ status: response.status, url },
			"Automation webhook ping failed",
		);

		let error = `Webhook returned error status: ${response.status}`;
		if (
			response.status === 530 ||
			response.status === 502 ||
			response.status === 401
		) {
			error =
				"Webhook unreachable (Tunnel Error). Please ensure your automation CLI is running and the URL is correct.";
		} else if (response.status === 404) {
			error =
				"Webhook endpoint not found (404). Please ensure you are using the correct URL (ending in /webhook).";
		}

		return { success: false, error };
	}

	const data = await response.json().catch(() => ({}));

	// If it responds with the challenge, it's definitely a compatible automation server
	if (data.status === "pong" && data.challenge === challenge) {
		return { success: true };
	}

	// If it doesn't support ping-challenge but returned 200, we consider it "connected"
	// but might not be our automation project.
	logger.info(
		{ url },
		"Webhook connected but no ping-challenge response received. Accepting as generic.",
	);
	return { success: true };
}
