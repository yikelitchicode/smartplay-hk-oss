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
		// Validate URL structure before parsing
		const parsedUrl = new URL(url);

		// Safe domain extraction using parsed URL object
		const hostname = parsedUrl.hostname.toLowerCase();

		// Exact domain matching to prevent bypass attacks
		// Prevents: evil-discord.com, discord.com.evil.com, etc.
		const isDiscord =
			hostname === "discord.com" ||
			hostname === "discordapp.com" ||
			hostname.endsWith(".discord.com") ||
			hostname.endsWith(".discordapp.com");
		const isSlack = hostname === "slack.com" || hostname.endsWith(".slack.com");

		if (isDiscord || isSlack) {
			return await verifyPlatformWebhook(url, isDiscord ? "Discord" : "Slack");
		}

		return await verifyAutomationWebhook(url);
	} catch (error) {
		// Catch URL parsing errors or network failures
		const errorMessage =
			error instanceof Error && error.name === "TypeError"
				? "Invalid URL format. Please enter a valid webhook URL."
				: "Connection failed. Please ensure the URL is correct and accessible.";

		logger.error({ error, url }, "Webhook connectivity check failed");
		return {
			success: false,
			error: errorMessage,
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
 * Strictly requires the endpoint to echo the challenge back.
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

	let response: Response;
	try {
		response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"bypass-tunnel-reminder": "true",
			},
			body: JSON.stringify(pingPayload),
			signal: AbortSignal.timeout(5000), // 5 second timeout
		});
	} catch (error) {
		if (error instanceof Error && error.name === "TimeoutError") {
			logger.warn({ url }, "Webhook validation timed out");
			return {
				success: false,
				error:
					"Webhook validation timed out. Please ensure your endpoint responds within 5 seconds.",
			};
		}
		throw error;
	}

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

	// Strictly require the challenge to be echoed back
	if (data.status === "pong" && data.challenge === challenge) {
		return { success: true };
	}

	// Reject if challenge not echoed correctly
	logger.warn(
		{ url, expectedChallenge: challenge, receivedData: data },
		"Webhook did not echo challenge correctly",
	);
	return {
		success: false,
		error:
			"Webhook must respond with the challenge token. Expected response: { status: 'pong', challenge: '<token>' }",
	};
}
