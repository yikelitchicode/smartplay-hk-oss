import { AlertCircle, Loader2 } from "lucide-react";
import { type JSX, useEffect, useRef, useState } from "react";
import { useTurnstile } from "@/lib/hooks/useTurnstile";

interface TurnstileWidgetProps {
	onVerify: (token: string) => void;
	onError?: (error: unknown) => void;
	onExpire?: () => void;
	theme?: "light" | "dark" | "auto";
}

export function TurnstileWidget({
	onVerify,
	onError,
	onExpire,
}: TurnstileWidgetProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	// Get site key from env
	const siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;

	const { isLoaded, token } = useTurnstile({
		siteKey: siteKey || "", // Handle missing key gracefully
		onSuccess: (token) => {
			setError(null);
			onVerify(token);
		},
		onError: (err) => {
			setError("Verification failed. Please try again.");
			onError?.(err);
		},
		onExpire: () => {
			onExpire?.();
		},
	});

	// Reset error when token changes or resets
	useEffect(() => {
		if (!token) setError(null);
	}, [token]);

	if (!siteKey) {
		return (
			<div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 text-sm">
				<AlertCircle className="w-4 h-4" />
				Missing Turnstile Site Key configuration
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div
				ref={containerRef}
				className="min-h-[65px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-100"
			>
				{!isLoaded && !token && !error && (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader2 className="w-4 h-4 animate-spin" />
						Loading security check...
					</div>
				)}
			</div>
			{error && (
				<p className="text-xs text-destructive flex items-center gap-1">
					<AlertCircle className="w-3 h-3" />
					{error}
				</p>
			)}
		</div>
	);
}
