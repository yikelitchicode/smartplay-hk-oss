/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by automatically failing fast when an external service
 * is experiencing issues. After a threshold of failures, the circuit "opens" and
 * rejects requests immediately without attempting to execute them.
 *
 * States:
 * - CLOSED: Normal operation, requests execute normally
 * - OPEN: Service is failing, requests reject immediately
 * - HALF_OPEN: Testing if service has recovered, allows limited requests
 *
 * @see https://martinfowler.com/bliki/CircuitBreaker.html
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
	CLOSED = "CLOSED", // Normal operation
	OPEN = "OPEN", // Failing, reject requests
	HALF_OPEN = "HALF_OPEN", // Testing recovery
}

/**
 * Circuit breaker state information
 */
export interface CircuitBreakerState {
	state: CircuitState;
	failureCount: number;
	lastFailureTime: number;
	lastSuccessTime?: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
	/** Number of consecutive failures before opening circuit (default: 5) */
	threshold?: number;
	/** Milliseconds to stay open before attempting recovery (default: 60000 = 1 minute) */
	timeout?: number;
	/** Number of successful requests needed to close circuit in HALF_OPEN state (default: 3) */
	halfOpenAttempts?: number;
	/** Whether to log state transitions (default: true) */
	logging?: boolean;
}

/**
 * Circuit Breaker class for resilient external service calls
 */
export class CircuitBreaker {
	private state: CircuitState = CircuitState.CLOSED;
	private failureCount = 0;
	private lastFailureTime = 0;
	private lastSuccessTime = 0;
	private successCount = 0;

	private readonly threshold: number;
	private readonly timeout: number;
	private readonly halfOpenAttempts: number;
	private readonly logging: boolean;

	constructor(config: CircuitBreakerConfig = {}) {
		this.threshold = config.threshold ?? 5;
		this.timeout = config.timeout ?? 60000; // 1 minute
		this.halfOpenAttempts = config.halfOpenAttempts ?? 3;
		this.logging = config.logging ?? true;
	}

	/**
	 * Execute a function through the circuit breaker
	 *
	 * @param fn - The async function to execute
	 * @returns Promise with the function result
	 * @throws {Error} If circuit is OPEN or function execution fails
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Check if circuit should transition from OPEN to HALF_OPEN
		if (this.state === CircuitState.OPEN) {
			const timeSinceLastFailure = Date.now() - this.lastFailureTime;
			if (timeSinceLastFailure > this.timeout) {
				this.transitionTo(CircuitState.HALF_OPEN);
			} else {
				const waitTime = Math.ceil(
					(this.timeout - timeSinceLastFailure) / 1000,
				);
				throw new Error(
					`Circuit breaker is OPEN - rejecting requests. Retry in ${waitTime}s`,
				);
			}
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	/**
	 * Handle successful execution
	 */
	private onSuccess() {
		this.failureCount = 0;
		this.lastSuccessTime = Date.now();

		if (this.state === CircuitState.HALF_OPEN) {
			this.successCount++;
			if (this.successCount >= this.halfOpenAttempts) {
				this.transitionTo(CircuitState.CLOSED);
			}
		}
	}

	/**
	 * Handle failed execution
	 */
	private onFailure() {
		this.failureCount++;
		this.lastFailureTime = Date.now();

		if (
			this.state === CircuitState.CLOSED &&
			this.failureCount >= this.threshold
		) {
			this.transitionTo(CircuitState.OPEN);
		} else if (this.state === CircuitState.HALF_OPEN) {
			// If we fail in HALF_OPEN, go back to OPEN immediately
			this.transitionTo(CircuitState.OPEN);
		}
	}

	/**
	 * Transition to a new state with logging
	 */
	private transitionTo(newState: CircuitState) {
		const oldState = this.state;
		this.state = newState;

		if (this.logging) {
			const stateInfo = {
				from: oldState,
				to: newState,
				failureCount: this.failureCount,
				timeSinceLastFailure: this.lastFailureTime
					? `${Math.ceil((Date.now() - this.lastFailureTime) / 1000)}s ago`
					: "N/A",
			};

			switch (newState) {
				case CircuitState.OPEN:
					console.error(
						`🔴 Circuit breaker: OPEN (${this.failureCount} failures reached threshold)`,
					);
					break;
				case CircuitState.HALF_OPEN:
					console.log(
						`🔌 Circuit breaker: HALF_OPEN (testing recovery after ${stateInfo.timeSinceLastFailure})`,
					);
					break;
				case CircuitState.CLOSED:
					console.log(
						`✅ Circuit breaker: CLOSED (recovered after ${this.successCount} successful requests)`,
					);
					this.successCount = 0; // Reset success count after recovery
					break;
			}
		}
	}

	/**
	 * Get current circuit breaker state
	 */
	getState(): CircuitBreakerState {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime || undefined,
		};
	}

	/**
	 * Manually reset the circuit breaker to CLOSED state
	 *
	 * Useful for testing or manual recovery intervention
	 */
	reset() {
		this.state = CircuitState.CLOSED;
		this.failureCount = 0;
		this.lastFailureTime = 0;
		this.lastSuccessTime = 0;
		this.successCount = 0;

		if (this.logging) {
			console.log("🔄 Circuit breaker: manually reset to CLOSED");
		}
	}

	/**
	 * Check if circuit is currently operational (CLOSED or HALF_OPEN)
	 */
	isOperational(): boolean {
		return this.state !== CircuitState.OPEN;
	}
}

/**
 * Default circuit breaker instance for HTTP requests
 */
export const defaultCircuitBreaker = new CircuitBreaker({
	threshold: 5,
	timeout: 60000, // 1 minute
	halfOpenAttempts: 3,
	logging: true,
});
