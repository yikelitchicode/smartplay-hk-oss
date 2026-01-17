/**
 * Refresh Strategy Resolver
 *
 * Determines the refresh tier and next evaluation time for watchers
 * based on their target session date and configured strategies.
 */

import {
	addDays,
	differenceInMilliseconds,
	isBefore,
	startOfDay,
} from "date-fns";
import type { RefreshStrategyConfig, RefreshTier } from "../types";

export class RefreshStrategyResolver {
	private config: RefreshStrategyConfig;

	constructor(config: RefreshStrategyConfig) {
		this.config = config;
	}

	/**
	 * Determine the refresh tier for a watcher based on its target session date
	 *
	 * @param sessionDateTarget - The date of the session being watched
	 * @param now - Current reference time (default: Date.now())
	 * @returns The assigned RefreshTier
	 */
	resolveTier(sessionDateTarget: Date, now: Date = new Date()): RefreshTier {
		const today = startOfDay(now);
		const targetDate = startOfDay(sessionDateTarget);

		// LCSD booking window (usually 7 days)
		// If the session is within the booking window, it's ACTIVE
		const bookingWindowEnd = addDays(today, this.config.bookingWindowDays);

		if (
			isBefore(targetDate, bookingWindowEnd) ||
			targetDate.getTime() === bookingWindowEnd.getTime()
		) {
			return "ACTIVE";
		}

		// Pending window (usually 14 days)
		// If within pending window but outside booking window, it's PENDING
		const pendingWindowEnd = addDays(today, this.config.pendingWindowDays);

		if (
			isBefore(targetDate, pendingWindowEnd) ||
			targetDate.getTime() === pendingWindowEnd.getTime()
		) {
			return "PENDING";
		}

		// Otherwise, it's DORMANT (far future)
		return "DORMANT";
	}

	/**
	 * Calculate the interval for a given tier
	 */
	getIntervalForTier(tier: RefreshTier): number {
		switch (tier) {
			case "ACTIVE":
				return this.config.activeIntervalMs;
			case "PENDING":
				return this.config.pendingIntervalMs;
			case "DORMANT":
				return this.config.dormantIntervalMs;
			default:
				return this.config.activeIntervalMs;
		}
	}

	/**
	 * Check if a watcher is due for evaluation based on its last evaluation time and tier
	 *
	 * @param watcher - Watcher record with date and lastEvaluatedAt (or updatedAt as proxy)
	 * @param now - Current reference time
	 * @returns true if due for evaluation
	 */
	isDueForEvaluation(
		watcher: { date: Date; updatedAt: Date; lastEvaluatedAt?: Date | null },
		now: Date = new Date(),
	): boolean {
		const tier = this.resolveTier(watcher.date, now);
		const interval = this.getIntervalForTier(tier);

		// Use lastEvaluatedAt if available, otherwise fallback to updatedAt
		// If neither (new watcher), assume it's due (epoch 0)
		const lastCheck =
			watcher.lastEvaluatedAt || watcher.updatedAt || new Date(0);

		const timeSinceLastCheck = differenceInMilliseconds(now, lastCheck);

		return timeSinceLastCheck >= interval;
	}

	/**
	 * Group watchers by their resolved tier
	 * Useful for logging and metrics
	 */
	groupWatchersByTier(
		watchers: { id: string; date: Date }[],
	): Record<RefreshTier, string[]> {
		const groups: Record<RefreshTier, string[]> = {
			ACTIVE: [],
			PENDING: [],
			DORMANT: [],
		};

		const now = new Date();

		for (const watcher of watchers) {
			const tier = this.resolveTier(watcher.date, now);
			groups[tier].push(watcher.id);
		}

		return groups;
	}
}
