import { AlertCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { type JSX, useCallback } from "react";
import { useTurnstile } from "@/lib/hooks/useTurnstile";

interface TurnstileWidgetProps {
	onVerify: (token: string) => void;
	onError?: (error: string) => void;
	onExpire?: () => void;
	onReset?: () => void;
	theme?: "light" | "dark" | "auto";
	showResetButton?: boolean;
	maxRetries?: number;
}

export function TurnstileWidget({
	onVerify,
	onError,
	onExpire,
	onReset,
	showResetButton = true,
	maxRetries = 3,
}: TurnstileWidgetProps): JSX.Element {
	const siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;

	const {
		isLoaded,
		token,
		error: turnstileError,
		containerRef,
		reset,
	} = useTurnstile({
		siteKey: siteKey || "",
		onSuccess: (token) => {
			onVerify(token);
		},
		onError: (err) => {
			onError?.(err);
		},
		onExpire: () => {
			onExpire?.();
		},
		maxRetries,
		retryDelay: 1000,
	});

	const handleReset = useCallback(() => {
		reset();
		onReset?.();
	}, [reset, onReset]);

	// Missing site key error
	if (!siteKey) {
		return (
			<div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 text-sm border border-destructive/20">
				<AlertCircle className="w-4 h-4 flex-shrink-0" />
				<div>
					<p className="font-medium">Configuration Error</p>
					<p className="text-xs opacity-80">
						Missing Turnstile Site Key. Please contact support.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Turnstile Widget Container */}
			<section
				ref={containerRef}
				className="min-h-[65px] flex items-center justify-center bg-background rounded-lg border border-border transition-colors"
				aria-label="CAPTCHA verification"
			>
				{/* Loading State */}
				{!isLoaded && !turnstileError && (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader2 className="w-4 h-4 animate-spin" />
						<span>Loading security check...</span>
					</div>
				)}

				{/* Script Load Error */}
				{!isLoaded && turnstileError && (
					<div className="p-3 w-full">
						<div className="flex items-start gap-2 text-destructive text-sm">
							<AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
							<div>
								<p className="font-medium">Failed to load verification</p>
								<p className="text-xs opacity-80 mt-1">
									Please refresh the page or check your connection.
								</p>
							</div>
						</div>
					</div>
				)}
			</section>

			{/* Error Message */}
			{turnstileError && isLoaded && (
				<div className="flex items-center justify-between gap-2 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
					<div className="flex items-center gap-2 text-sm">
						<AlertCircle className="w-4 h-4 flex-shrink-0" />
						<span className="font-medium">{turnstileError}</span>
					</div>
					{showResetButton && (
						<button
							type="button"
							onClick={handleReset}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-destructive/20 hover:bg-destructive/30 transition-colors"
							aria-label="Retry verification"
						>
							<RefreshCw className="w-3 h-3" />
							Retry
						</button>
					)}
				</div>
			)}

			{/* Success State (token received, waiting for parent to use it) */}
			{token && !turnstileError && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
					<span>Verification complete</span>
				</div>
			)}
		</div>
	);
}
