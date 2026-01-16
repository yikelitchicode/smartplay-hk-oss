/**
 * React Error Boundary with Logging
 *
 * Catches React component errors and logs them with full context
 */

import { Component, type ReactNode } from "react";
import { browserLogger } from "./browser-logger";
import type { LogContext } from "./types";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

/**
 * Error Boundary Component with automatic logging
 */
export class LoggingErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log the error with full context
		const context: LogContext = {
			componentStack: errorInfo.componentStack,
			errorBoundary: "LoggingErrorBoundary",
			timestamp: new Date().toISOString(),
			userAgent:
				typeof window !== "undefined" ? navigator.userAgent : undefined,
			url: typeof window !== "undefined" ? window.location.href : undefined,
		};

		browserLogger.error("React Error Boundary caught an error", error, context);

		// Call custom error handler if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div
					style={{
						padding: "2rem",
						margin: "1rem",
						border: "1px solid #ef4444",
						borderRadius: "0.5rem",
						backgroundColor: "#fef2f2",
					}}
				>
					<h2
						style={{
							color: "#dc2626",
							marginBottom: "1rem",
							fontSize: "1.5rem",
						}}
					>
						Something went wrong
					</h2>
					{this.state.error && (
						<div
							style={{
								backgroundColor: "#fee2e2",
								padding: "1rem",
								borderRadius: "0.375rem",
								marginBottom: "1rem",
							}}
						>
							<p
								style={{
									margin: "0 0 0.5rem 0",
									fontWeight: "bold",
									color: "#991b1b",
								}}
							>
								Error: {this.state.error.message}
							</p>
							{this.state.error.stack && (
								<details
									style={{
										marginTop: "0.5rem",
										color: "#7f1d1d",
									}}
								>
									<summary
										style={{ cursor: "pointer", marginBottom: "0.5rem" }}
									>
										Stack trace
									</summary>
									<pre
										style={{
											whiteSpace: "pre-wrap",
											fontSize: "0.875rem",
											margin: 0,
										}}
									>
										{this.state.error.stack}
									</pre>
								</details>
							)}
						</div>
					)}
					<p style={{ marginBottom: "1rem", color: "#7f1d1d" }}>
						This error has been logged. Please refresh the page and try again.
					</p>
					<button
						type="button"
						onClick={() => window.location.reload()}
						style={{
							padding: "0.5rem 1rem",
							backgroundColor: "#dc2626",
							color: "white",
							border: "none",
							borderRadius: "0.375rem",
							cursor: "pointer",
							fontSize: "1rem",
						}}
					>
						Reload Page
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * Hook-based error boundary alternative (React 16.8+)
 * Use this for functional components that need error handling
 */
export function useErrorHandler() {
	return (error: Error, errorInfo?: React.ErrorInfo) => {
		const context: LogContext = {
			componentStack: errorInfo?.componentStack,
			errorBoundary: "useErrorHandler",
			timestamp: new Date().toISOString(),
		};

		browserLogger.error("Error caught by error handler", error, context);
	};
}

/**
 * Default error fallback component
 */
export function DefaultErrorFallback({
	error,
	resetError,
}: {
	error?: Error;
	resetError?: () => void;
}) {
	return (
		<div
			style={{
				padding: "2rem",
				margin: "1rem",
				border: "1px solid #ef4444",
				borderRadius: "0.5rem",
				backgroundColor: "#fef2f2",
				textAlign: "center",
			}}
		>
			<h2
				style={{
					color: "#dc2626",
					marginBottom: "1rem",
					fontSize: "1.5rem",
				}}
			>
				Something went wrong
			</h2>
			{error && (
				<p style={{ color: "#991b1b", marginBottom: "1rem" }}>
					{error.message}
				</p>
			)}
			{resetError && (
				<button
					type="button"
					onClick={resetError}
					style={{
						padding: "0.5rem 1rem",
						backgroundColor: "#dc2626",
						color: "white",
						border: "none",
						borderRadius: "0.375rem",
						cursor: "pointer",
						fontSize: "1rem",
					}}
				>
					Try Again
				</button>
			)}
		</div>
	);
}
