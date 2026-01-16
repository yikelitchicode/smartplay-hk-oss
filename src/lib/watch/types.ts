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
