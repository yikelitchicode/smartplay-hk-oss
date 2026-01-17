import {
	AlertCircle,
	Bell,
	CheckCircle2,
	Clock,
	Loader2,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getWatcherHits } from "@/server-functions/watch/watcher";

interface WatchHit {
	id: string;
	checkedAt: string; // Serialized date from server
	available: boolean;
	notificationSent: boolean;
	notificationError: string | null;
}

interface WatcherHitsModalProps {
	watcherId: string | null;
	open: boolean;
	onClose: () => void;
}

export function WatcherHitsModal({
	watcherId,
	open,
	onClose,
}: WatcherHitsModalProps) {
	const { t } = useTranslation(["scheduler"]);
	const [hits, setHits] = useState<WatchHit[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadHits = useCallback(async (id: string) => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await getWatcherHits({
				data: { watcherId: id, limit: 20 },
			});
			if (result.success) {
				const hitsData = result.data ?? [];
				setHits(
					// biome-ignore lint/suspicious/noExplicitAny: Dealing with serialized dates
					hitsData.map((h: any) => ({
						...h,
						checkedAt: new Date(h.checkedAt).toISOString(),
					})),
				);
			} else {
				setError(result.error ?? "Failed to load hits");
			}
		} catch (_e) {
			setError("An error occurred");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (open && watcherId) {
			loadHits(watcherId);
		} else {
			setHits([]);
		}
	}, [open, watcherId, loadHits]);

	const formatDate = (dateStr: string) => {
		return new Intl.DateTimeFormat("en-HK", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}).format(new Date(dateStr));
	};

	return (
		<Modal open={open} onClose={onClose} showCloseButton={true} size="md">
			<div className="space-y-4">
				<div className="border-b border-border/40 pb-4">
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<ActivityIcon />
						{t("scheduler:hits_history", "Hit History")}
					</h3>
					<p className="text-sm text-muted-foreground">
						{t("scheduler:hits_desc", "Recent checks for this watcher.")}
					</p>
				</div>

				<div className="min-h-[200px] max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
					{isLoading ? (
						<div className="flex justify-center items-center h-40">
							<Loader2 className="w-8 h-8 animate-spin text-pacific-blue-500" />
						</div>
					) : error ? (
						<div className="flex flex-col items-center justify-center h-40 text-destructive text-center p-4">
							<AlertCircle className="w-8 h-8 mb-2" />
							<p>{error}</p>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => watcherId && loadHits(watcherId)}
							>
								{t("scheduler:retry", "Retry")}
							</Button>
						</div>
					) : hits.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
							<Clock className="w-8 h-8 mb-2 opacity-50" />
							<p>{t("scheduler:no_hits_yet", "No hits recorded yet.")}</p>
						</div>
					) : (
						<div className="space-y-3">
							{hits.map((hit) => (
								<div
									key={hit.id}
									className="flex items-start justify-between p-3 rounded-lg bg-muted/20 border border-border/50 text-sm"
								>
									<div className="flex items-start gap-3">
										{hit.available ? (
											<CheckCircle2 className="w-4 h-4 text-meadow-green-500 mt-0.5" />
										) : (
											<XCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
										)}
										<div>
											<p
												className={`font-medium ${hit.available ? "text-meadow-green-700" : "text-muted-foreground"}`}
											>
												{hit.available
													? t("scheduler:status_available", "Available")
													: t("scheduler:status_unavailable", "Unavailable")}
											</p>
											<p className="text-xs text-muted-foreground/70">
												{formatDate(hit.checkedAt)}
											</p>
										</div>
									</div>

									{hit.notificationSent && (
										<div className="flex items-center gap-1.5 text-xs text-pacific-blue-600 bg-pacific-blue-50 px-2 py-1 rounded-full">
											<Bell className="w-3 h-3" />
											<span>{t("scheduler:status_notified", "Notified")}</span>
										</div>
									)}
									{hit.notificationError && (
										<div
											className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full"
											title={hit.notificationError}
										>
											<AlertCircle className="w-3 h-3" />
											<span>{t("scheduler:status_failed", "Failed")}</span>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				<div className="flex justify-end pt-2">
					<Button variant="ghost" onClick={onClose}>
						{t("common.close", "Close")}
					</Button>
				</div>
			</div>
		</Modal>
	);
}

function ActivityIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="text-pacific-blue-500"
		>
			<title>Activity</title>
			<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
		</svg>
	);
}
