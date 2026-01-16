/**
 * Database Health Check System - Type Definitions
 *
 * This module defines the types and interfaces for the database health check system,
 * including health status, circuit breaker states, and configuration options.
 */

/**
 * Database health check result status
 */
export interface DatabaseHealthStatus {
	healthy: boolean;
	latency?: number; // Last check latency in ms
	error?: string; // Error message if unhealthy
	poolStatus?: {
		activeConnections: number;
		idleConnections: number;
		totalConnections: number;
	};
	lastChecked: Date;
}

/**
 * Options for health check execution
 */
export interface HealthCheckOptions {
	timeout?: number; // Query timeout in ms (default 2000)
	retries?: number; // Retry attempts (default 1)
	cacheTTL?: number; // Cache TTL in ms (default 5000)
}

/**
 * Connection pool metrics
 */
export interface PoolMetrics {
	active: number;
	idle: number;
	total: number;
	maxCapacity: number;
	utilizationPercent: number;
	status: "healthy" | "warning" | "critical";
}

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
	failureThreshold?: number; // Failures before opening (default 5)
	resetTimeout?: number; // ms before half-open (default 30000)
	monitoringPeriod?: number; // ms to track failures (default 60000)
	onStateChange?: (state: CircuitBreakerState) => void;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
	state: CircuitBreakerState;
	failureCount: number;
	successCount: number;
	lastFailureTime?: Date;
	lastStateChange?: Date;
}

/**
 * Database error types for classification
 */
export enum DatabaseErrorType {
	CONNECTION_FAILED = "CONNECTION_FAILED",
	TIMEOUT = "TIMEOUT",
	QUERY_FAILED = "QUERY_FAILED",
	POOL_EXHAUSTED = "POOL_EXHAUSTED",
	UNKNOWN = "UNKNOWN",
}

/**
 * Enhanced error handling options
 */
export interface EnhancedDbErrorHandlingOptions {
	operationName: string;
	retryOnConnectionError?: boolean; // Auto-retry connection errors
	maxRetries?: number; // Max retry attempts (default 2)
	initialRetryDelay?: number; // Initial delay in ms (default 1000)
	fallbackValue?: unknown; // Fallback on connection failure
	onConnectionError?: (error: Error) => void; // Callback for monitoring
}
