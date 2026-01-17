/**
 * Watch Scheduler Types
 *
 * TypeScript interfaces and types for the watch scheduler system.
 */

export interface WatchConfig {
	schedule: ScheduleConfig;
	cleanup: CleanupConfig;
	evaluation: EvaluationConfig;
	notifications: NotificationConfig;
	turnstile: TurnstileConfig;
	webhook: WebhookConfig;
	refreshStrategy: RefreshStrategyConfig;
}

export interface ScheduleConfig {
	enabled: boolean;
	interval: string; // Cron expression
	timezone: string;
}

export interface CleanupConfig {
	enabled: boolean;
	interval: string; // Cron expression
	expiredWatcherRetentionDays: number;
	watchHitRetentionDays: number;
	staleSessionRetentionDays: number;
}

export interface EvaluationConfig {
	batchSize: number;
	maxConcurrentEvaluations: number;
	evaluationTimeoutMs: number;
}

export interface NotificationConfig {
	enabled: boolean;
	timeoutMs: number;
	retryAttempts: number;
	retryDelayBase: number;
	rateLimitPerMinute: number;
}

export interface TurnstileConfig {
	enabled: boolean;
	verifyUrl: string;
	siteKey?: string;
	secretKey?: string;
	minScore: number;
}

export interface WebhookConfig {
	allowedHosts: string[];
	maxUrlLength: number;
}

export interface WatchCriteria {
	targetSessionId: string; // References Session.id (facility booking)
	venueId: string;
	facilityCode: string;
	date: Date;
	startTime: string;
	endTime: string;
}

export type RefreshTier = "ACTIVE" | "PENDING" | "DORMANT";

export interface RefreshStrategyConfig {
	activeIntervalMs: number;
	pendingIntervalMs: number;
	dormantIntervalMs: number;
	bookingWindowDays: number;
	pendingWindowDays: number;
}

export interface CreateWatcherOptions {
	browserSessionId: string; // Anonymous user's browser session
	turnstileToken: string; // Cloudflare Turnstile token
	criteria: WatchCriteria;
}

export interface WatchEvaluationResult {
	watcherId: string;
	sessionId: string;
	previousState: boolean;
	currentState: boolean;
	becameAvailable: boolean;
}

export interface WebhookPayload {
	eventType: "available" | "unavailable";
	venue: string;
	facility: string;
	date: string;
	timeRange: string;
	bookingUrl: string;
	timestamp: string;
}

export interface TurnstileVerifyResponse {
	success: boolean;
	"error-codes"?: string[];
	challenge_ts?: string;
	hostname?: string;
	score?: number; // 0.0 - 1.0 (only for managed challenges)
}

export interface CleanupStats {
	expiredWatchersMarked: number;
	expiredWatchersDeleted: number;
	watchHitsDeleted: number;
	staleBrowserSessionsDeleted: number;
	orphanedSettingsDeleted: number;
	totalDurationMs: number;
}

// ============================================
// Webhook Payload Types
// ============================================

export interface GenericWebhookPayload {
	version: "1.0";
	id: string; // Unique event ID
	event: "session.available" | "session.unavailable";
	created_at: string; // ISO 8601
	data: {
		watcher_id: string;
		venue: {
			id: string;
			name: string;
		};
		facility: {
			code: string;
			name: string;
		};
		session: {
			date: string; // YYYY-MM-DD
			start_time: string; // HH:MM
			end_time: string; // HH:MM
		};
		availability: {
			previous_state: boolean;
			current_state: boolean;
		};
		booking_url: string;
	};
}

export interface DiscordEmbedField {
	name: string; // Max 256 chars
	value: string; // Max 1024 chars
	inline?: boolean;
}

export interface DiscordEmbed {
	title: string; // Max 256 chars
	description?: string; // Max 4096 chars
	url?: string;
	color?: number; // Integer color code
	timestamp?: string; // ISO 8601
	author?: {
		name: string;
		url?: string;
		icon_url?: string;
	};
	thumbnail?: {
		url: string;
	};
	fields?: DiscordEmbedField[]; // Max 25 fields
	footer?: {
		text: string;
		icon_url?: string;
	};
}

export interface DiscordWebhookPayload {
	username?: string;
	avatar_url?: string;
	content?: string;
	embeds?: DiscordEmbed[]; // Max 10 embeds
}

export interface SlackWebhookPayload {
	text: string;
	attachments?: Array<{
		color?: string;
		pretext?: string;
		fields?: Array<{
			title: string;
			value: string;
			short?: boolean;
		}>;
		actions?: Array<{
			type: string;
			text: string;
			url: string;
			style?: string;
		}>;
	}>;
}

export type WebhookPayloadUnion =
	| GenericWebhookPayload
	| DiscordWebhookPayload
	| SlackWebhookPayload;
