/**
 * Watch Server Functions
 *
 * Main entry point for watch-related server functions.
 */

export {
	createWatcher,
	getWatcherHits,
	getWatchers,
	updateWatcher,
} from "./watcher";
export { getWebhookSettings, setWebhookUrl, testWebhook } from "./webhook";
