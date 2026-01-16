/**
 * Watch Scheduler Module
 *
 * Main entry point for the watch scheduler system.
 * Exports all services, schedulers, and configuration.
 */

// Configuration
export {
	defaultConfig,
	getConfigWithOverrides,
	loadConfig,
	validateConfig,
} from "./config";
export { WatchCleanupScheduler } from "./schedulers/cleanup-scheduler";
// Schedulers
export { WatchEvaluationScheduler } from "./schedulers/evaluation-scheduler";
export { CleanupService } from "./services/cleanup-service";
export { NotificationService } from "./services/notification-service";
// Services
export { TurnstileVerifier } from "./services/turnstile-verifier";
export { WatchEvaluator } from "./services/watch-evaluator";
export { WatchManager } from "./services/watch-manager";
// Types
export type {
	CleanupConfig,
	CleanupStats,
	CreateWatcherOptions,
	EvaluationConfig,
	NotificationConfig,
	ScheduleConfig,
	TurnstileConfig,
	TurnstileVerifyResponse,
	WatchConfig,
	WatchCriteria,
	WatchEvaluationResult,
	WebhookConfig,
	WebhookPayload,
} from "./types";
