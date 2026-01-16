/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascade failures by fast-failing operations when the database is down.
 * Transitions between CLOSED, OPEN, and HALF_OPEN states based on failure rates.
 */

import type {
	CircuitBreakerConfig,
	CircuitBreakerState,
	CircuitBreakerStats,
} from "./types";

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG = {
	failureThreshold: 5,
	resetTimeout: 30000,
	monitoringPeriod: 60000,
	onStateChange: () => {},
};

/**
 * Circuit Breaker Class
 *
 * Implements the circuit breaker pattern to prevent cascade failures.
 * Tracks consecutive failures and opens the circuit when threshold is exceeded.
 */
export class DatabaseCircuitBreaker {
	private state: CircuitBreakerState = "CLOSED";
	private failureCount = 0;
	private successCount = 0;
	private lastFailureTime: Date | null = null;
	private lastStateChange: Date | null = null;
	private failureHistory: Date[] = []; // Timestamps of recent failures

	private config: CircuitBreakerConfig;

	constructor(config: CircuitBreakerConfig = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.lastStateChange = new Date();
	}

	/**
	 * Execute operation with circuit breaker protection
	 *
	 * In CLOSED state: executes normally
	 * In OPEN state: fast fails without executing
	 * In HALF_OPEN state: allows single request to test recovery
	 *
	 * @param operation - Operation to execute
	 * @returns Result of the operation
	 * @throws Error if circuit is open or operation fails
	 */
	async execute<T>(operation: () => Promise<T>): Promise<T> {
		// Check if circuit is open and if we should attempt recovery
		if (this.state === "OPEN") {
			const timeSinceLastChange = this.lastStateChange?.getTime() ?? 0;
			const now = Date.now();

			if (
				this.config.resetTimeout &&
				now - timeSinceLastChange >= this.config.resetTimeout
			) {
				// Transition to HALF_OPEN to test recovery
				this.transitionTo("HALF_OPEN");
			} else {
				// Circuit is still open, fast fail
				throw new Error(
					"Circuit breaker is OPEN. Database is known to be unavailable.",
				);
			}
		}

		try {
			const result = await operation();

			// Operation succeeded
			this.recordSuccess();

			return result;
		} catch (error) {
			// Operation failed
			this.recordFailure();

			throw error;
		}
	}

	/**
	 * Get current circuit breaker state
	 *
	 * @returns Current state (CLOSED, OPEN, or HALF_OPEN)
	 */
	getState(): CircuitBreakerState {
		return this.state;
	}

	/**
	 * Get detailed circuit breaker statistics
	 *
	 * @returns Statistics including state, counts, and timestamps
	 */
	getStats(): CircuitBreakerStats {
		return {
			state: this.state,
			failureCount: this.failureCount,
			successCount: this.successCount,
			lastFailureTime: this.lastFailureTime ?? undefined,
			lastStateChange: this.lastStateChange ?? undefined,
		};
	}

	/**
	 * Check if circuit is currently open
	 *
	 * @returns true if circuit is OPEN (should fail fast)
	 */
	isOpen(): boolean {
		return this.state === "OPEN";
	}

	/**
	 * Manually reset circuit breaker to CLOSED state
	 *
	 * Useful for manual recovery or testing.
	 */
	reset(): void {
		this.transitionTo("CLOSED");
		this.failureCount = 0;
		this.successCount = 0;
		this.failureHistory = [];
		this.lastFailureTime = null;
	}

	/**
	 * Record a successful operation
	 *
	 * Resets failure count and transitions to CLOSED if in HALF_OPEN.
	 */
	private recordSuccess(): void {
		this.successCount++;

		if (this.state === "HALF_OPEN") {
			// Recovery successful, close the circuit
			this.transitionTo("CLOSED");
			this.failureCount = 0;
			this.failureHistory = [];
			this.lastFailureTime = null;
		}
	}

	/**
	 * Record a failed operation
	 *
	 * Increments failure count and potentially opens the circuit.
	 */
	private recordFailure(): void {
		const now = new Date();
		this.failureCount++;
		this.lastFailureTime = now;

		// Clean old failures outside monitoring period
		if (this.config.monitoringPeriod) {
			const monitoringPeriodCutoff = new Date(
				now.getTime() - this.config.monitoringPeriod,
			);
			this.failureHistory = this.failureHistory.filter(
				(timestamp) => timestamp > monitoringPeriodCutoff,
			);
		}
		this.failureHistory.push(now);

		// Check if we should open the circuit
		if (
			this.state === "CLOSED" &&
			this.config.failureThreshold &&
			this.failureCount >= this.config.failureThreshold
		) {
			this.transitionTo("OPEN");
		} else if (this.state === "HALF_OPEN") {
			// Recovery failed, open the circuit again
			this.transitionTo("OPEN");
		}
	}

	/**
	 * Transition to a new state with logging
	 *
	 * @param newState - The state to transition to
	 */
	private transitionTo(newState: CircuitBreakerState): void {
		const oldState = this.state;
		this.state = newState;
		this.lastStateChange = new Date();

		console.info(
			`Circuit breaker state transition: ${oldState} → ${newState}`,
			{
				failureCount: this.failureCount,
				successCount: this.successCount,
				timestamp: this.lastStateChange,
			},
		);

		// Call state change callback if provided
		if (this.config.onStateChange) {
			this.config.onStateChange(newState);
		}
	}
}

// Export singleton instance
export const circuitBreaker = new DatabaseCircuitBreaker();
