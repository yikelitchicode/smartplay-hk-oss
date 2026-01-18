import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	Activity,
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Clock,
	Loader2,
	Pause,
	Play,
	Settings,
	Trash2,
} from "lucide-react";
import { type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WatcherHitsModal } from "@/components/booking/WatcherHitsModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { getWatchers, updateWatcher } from "@/server-functions/watch/watcher";
import {
	getWebhookSettings,
	setWebhookUrl,
} from "@/server-functions/watch/webhook";

export const Route = createFileRoute("/scheduler")({
	loader: async () => {
		const [watchersResult, settingsResult] = await Promise.all([
			getWatchers({ data: {} }),
			getWebhookSettings(),
		]);
		return {
			watchersData: watchersResult,
			settingsData: settingsResult,
		};
	},
	component: SchedulerPage,
	pendingComponent: SchedulerSkeleton,
	head: () => ({
		meta: [
			{
				title: "Scheduler | SmartPlay HK OSS",
			},
			{
				name: "description",
				content: "Manage your availability watchers",
			},
		],
	}),
});

function SchedulerPage(): JSX.Element {
	const { t, i18n, ready } = useTranslation(["common", "scheduler"]);
	const { watchersData, settingsData } = Route.useLoaderData();
	const router = useRouter();

	const [selectedWatcherId, setSelectedWatcherId] = useState<string | null>(
		null,
	);

	// Webhook State
	const [webhookUrlInput, setWebhookUrlInput] = useState(
		settingsData.success && settingsData.data?.webhookUrl
			? settingsData.data.webhookUrl
			: "",
	);
	const [isSavingWebhook, setIsSavingWebhook] = useState(false);
	const [isTestingWebhook, setIsTestingWebhook] = useState(false);
	const [webhookStatus, setWebhookStatus] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	// Sync webhook input if loader data changes (e.g. after refresh or invalidation)
	useEffect(() => {
		if (settingsData.success && settingsData.data?.webhookUrl) {
			setWebhookUrlInput(settingsData.data.webhookUrl);
		}
	}, [settingsData]);

	if (!ready) {
		return <SchedulerSkeleton />;
	}

	const activeWatchers =
		watchersData.success && watchersData.data
			? watchersData.data.filter((w) => w.status !== "DELETED")
			: [];

	const getLocalizedValue = (
		base: string,
		en: string | null | undefined,
		tc: string | null | undefined,
		sc: string | null | undefined,
	) => {
		if (i18n.language === "zh" && tc) return tc;
		if (i18n.language === "cn" && sc) return sc;
		if (i18n.language === "en" && en) return en;
		return base;
	};

	// Actions
	const handleSaveWebhook = async () => {
		setIsSavingWebhook(true);
		setWebhookStatus(null);
		try {
			const result = await setWebhookUrl({
				data: { webhookUrl: webhookUrlInput, enabled: true },
			});
			if (result.success) {
				setWebhookStatus({
					success: true,
					message: t("scheduler:config_saved", "Configuration saved"),
				});
				router.invalidate();
			} else {
				setWebhookStatus({
					success: false,
					message:
						result.error ?? t("scheduler:error_occurred", "An error occurred"),
				});
			}
		} catch (_e) {
			setWebhookStatus({
				success: false,
				message: t("scheduler:error_occurred", "An error occurred"),
			});
		} finally {
			setIsSavingWebhook(false);
		}
	};

	const handleTestWebhook = async () => {
		setIsTestingWebhook(true);
		setWebhookStatus(null);
		try {
			const response = await fetch("/api/watch/test-webhook", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ webhookUrl: webhookUrlInput }),
			});

			const result = await response.json();

			if (response.ok && result.success) {
				setWebhookStatus({
					success: true,
					message: t("scheduler:test_sent", "Test notification sent!"),
				});
			} else {
				setWebhookStatus({
					success: false,
					message:
						result.error?.message ??
						result.message ??
						t("scheduler:test_failed", "Test failed"),
				});
			}
		} catch (_e) {
			setWebhookStatus({
				success: false,
				message: t("scheduler:test_failed", "Test failed"),
			});
		} finally {
			setIsTestingWebhook(false);
		}
	};

	const handleUpdateWatcher = async (
		watcherId: string,
		action: "pause" | "resume" | "delete",
	) => {
		try {
			await updateWatcher({
				data: {
					watcherId,
					action,
				},
			});
			router.invalidate();
		} catch (error) {
			console.error("Failed to update watcher", error);
		}
	};

	return (
		<div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col font-sans">
			<div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
				{/* Header */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
							{t("scheduler:title", "Watch Scheduler")}
							<Badge variant="primary" size="sm">
								Beta
							</Badge>
						</h1>
						<p className="text-muted-foreground mt-1 text-lg">
							{t("scheduler:subtitle", "Manage your availability watchers")}
						</p>
					</div>
					<Link to="/">
						<Button variant="ghost" size="sm" className="gap-2 shrink-0">
							<ArrowLeft size={16} /> {t("nav.home")}
						</Button>
					</Link>
				</div>

				<div className="grid lg:grid-cols-3 gap-8">
					{/* Active Watchers Column */}
					<div className="lg:col-span-2 space-y-6">
						<Card className="h-full border-border shadow-sm flex flex-col">
							<CardHeader className="pb-4 border-b border-border/40">
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="text-xl flex items-center gap-2">
											<Activity className="w-5 h-5 text-meadow-green-500" />
											{t("scheduler:active_watchers", "Active Watchers")}
										</CardTitle>
										<CardDescription className="mt-1">
											{t(
												"scheduler:active_desc",
												"Monitoring sessions for you",
											)}
										</CardDescription>
									</div>
								</div>
							</CardHeader>

							<div className="flex-1 p-0">
								{activeWatchers.length > 0 ? (
									<div className="divide-y divide-border/40">
										{activeWatchers.map((watcher) => {
											const venueName = watcher.targetSession?.venue?.name
												? getLocalizedValue(
														watcher.targetSession.venue.name,
														watcher.targetSession.venue.nameEn ?? null,
														watcher.targetSession.venue.nameTc ?? null,
														watcher.targetSession.venue.nameSc ?? null,
													)
												: null;

											const facilityName = watcher.targetSession
												? getLocalizedValue(
														watcher.targetSession.facilityTypeName,
														watcher.targetSession.facilityTypeNameEn ?? null,
														watcher.targetSession.facilityTypeNameTc ?? null,
														watcher.targetSession.facilityTypeNameSc ?? null,
													)
												: null;

											return (
												<div
													key={watcher.id}
													className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group"
												>
													<div className="space-y-1">
														<div className="flex items-center gap-2">
															<h3 className="font-medium text-foreground">
																{venueName
																	? `${venueName} (${facilityName})`
																	: `Session @ ${watcher.venueId}`}
															</h3>
															<Badge
																variant={
																	watcher.status === "ACTIVE"
																		? "default"
																		: "secondary"
																}
																size="sm"
															>
																{t(
																	`scheduler:status_${watcher.status.toLowerCase()}`,
																	watcher.status,
																)}
															</Badge>
														</div>
														<div className="flex items-center gap-4 text-sm text-muted-foreground">
															<span className="flex items-center gap-1">
																<CheckCircle2 size={14} />{" "}
																{new Date(watcher.date).toLocaleDateString()}
															</span>
															<span className="flex items-center gap-1">
																<Clock size={14} /> {watcher.startTime} -{" "}
																{watcher.endTime}
															</span>
														</div>
													</div>

													<div className="flex items-center gap-2">
														<button
															type="button"
															className="text-right hidden sm:block mr-4 cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors bg-transparent border-none appearance-none"
															onClick={() => setSelectedWatcherId(watcher.id)}
														>
															<p className="text-2xl font-semibold text-pacific-blue-600">
																{watcher.totalHits}
															</p>
															<p className="text-xs text-muted-foreground uppercase tracking-wider">
																{t("scheduler:hits", "Hits")}
															</p>
														</button>

														{watcher.status === "ACTIVE" ? (
															<Button
																variant="ghost"
																size="sm"
																className="text-amber-500 hover:bg-amber-50 hover:text-amber-600"
																onClick={() =>
																	handleUpdateWatcher(watcher.id, "pause")
																}
																title={t("scheduler:pause", "Pause")}
															>
																<Pause size={18} />
															</Button>
														) : (
															<Button
																variant="ghost"
																size="sm"
																className="text-meadow-green-600 hover:bg-meadow-green-50"
																onClick={() =>
																	handleUpdateWatcher(watcher.id, "resume")
																}
																title={t("scheduler:resume", "Resume")}
															>
																<Play size={18} />
															</Button>
														)}

														<Button
															variant="ghost"
															size="sm"
															className="text-destructive hover:bg-destructive/10"
															onClick={() =>
																handleUpdateWatcher(watcher.id, "delete")
															}
															title={t("scheduler:delete", "Delete")}
														>
															<Trash2 size={18} />
														</Button>
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
										<AlertCircle className="w-12 h-12 mb-4 opacity-50" />
										<p className="text-lg font-medium">
											{t("scheduler:no_active_watchers", "No active watchers")}
										</p>
										<p className="text-sm">
											{t(
												"scheduler:add_watcher_hint",
												"Add a watcher via the Booking page to start monitoring.",
											)}
										</p>
									</div>
								)}
							</div>
						</Card>
					</div>

					{/* Settings Column */}
					<div className="lg:col-span-1 space-y-6">
						{/* Webhook Configuration */}
						<Card className="border-pacific-blue-100 shadow-sm relative overflow-hidden">
							{/* Decorative accent */}
							<div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pacific-blue-400 to-meadow-green-400" />

							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<Settings className="w-4 h-4 text-pacific-blue-500" />
									{t(
										"scheduler:notification_settings",
										"Notification Settings",
									)}
								</CardTitle>
								<CardDescription>
									{t(
										"scheduler:webhook_desc",
										"Configure where notifications are sent.",
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label
										htmlFor="webhook-url"
										className="text-sm font-medium text-foreground"
									>
										{t("scheduler:webhook_label", "Discord Webhook URL")}
									</label>
									<Input
										id="webhook-url"
										placeholder="https://discord.com/api/webhooks/..."
										value={webhookUrlInput}
										onChange={(e) => setWebhookUrlInput(e.target.value)}
										className="text-sm"
									/>
									<p className="text-xs text-muted-foreground">
										{t(
											"scheduler:webhook_hint",
											"Paste your Discord Channel Webhook URL here.",
										)}
									</p>
								</div>

								{webhookStatus && (
									<div
										className={`text-xs p-2 rounded flex items-center gap-1.5 ${webhookStatus.success ? "bg-meadow-green-50 text-meadow-green-700" : "bg-destructive/10 text-destructive"}`}
									>
										{webhookStatus.success ? (
											<CheckCircle2 size={12} />
										) : (
											<AlertCircle size={12} />
										)}
										{webhookStatus.message}
									</div>
								)}
							</CardContent>
							<CardFooter className="flex gap-2">
								<Button
									onClick={handleSaveWebhook}
									size="sm"
									variant="primary"
									className="flex-1 bg-pacific-blue-600 hover:bg-pacific-blue-700"
									disabled={isSavingWebhook}
								>
									{isSavingWebhook ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										t("scheduler:save", "Save")
									)}
								</Button>
								<Button
									onClick={handleTestWebhook}
									size="sm"
									variant="secondary"
									className="flex-1"
									disabled={isTestingWebhook || !webhookUrlInput}
								>
									{isTestingWebhook ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										t("scheduler:test", "Test")
									)}
								</Button>
							</CardFooter>
						</Card>

						{/* Info Card */}
						<Card className="bg-muted/30 border-dashed border-2">
							<CardContent className="pt-6 text-center text-muted-foreground space-y-2">
								<p className="text-sm">
									{t(
										"scheduler:info_card_text_1",
										"To add new watchers, please visit the",
									)}{" "}
									<strong>{t("scheduler:info_card_booking", "Booking")}</strong>{" "}
									{t(
										"scheduler:info_card_text_2",
										"page and select a session to monitor.",
									)}
								</p>
								<Link to="/booking">
									<Button
										variant="ghost"
										className="text-pacific-blue-600 hover:bg-pacific-blue-50"
									>
										{t("scheduler:go_to_booking", "Go to Booking")}
									</Button>
								</Link>
							</CardContent>
						</Card>
					</div>
				</div>

				<WatcherHitsModal
					watcherId={selectedWatcherId}
					open={!!selectedWatcherId}
					onClose={() => setSelectedWatcherId(null)}
				/>
			</div>
		</div>
	);
}

function SchedulerSkeleton() {
	// Initialize translation to trigger loading of namespaces proactively
	useTranslation(["common", "scheduler"]);
	return (
		<div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col font-sans">
			<div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
				{/* Header Skeleton */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div className="space-y-3">
						<Skeleton className="h-10 w-64" />
						<Skeleton className="h-6 w-96 opacity-60" />
					</div>
					<Skeleton className="h-9 w-24 shrink-0" />
				</div>

				<div className="grid lg:grid-cols-3 gap-8">
					{/* Watchers Column Skeleton */}
					<div className="lg:col-span-2 space-y-6">
						<div className="border border-border shadow-sm rounded-xl h-full flex flex-col bg-card text-card-foreground">
							<div className="p-6 pb-4 border-b border-border/40 space-y-3">
								<Skeleton className="h-7 w-48" />
								<Skeleton className="h-5 w-64 opacity-60" />
							</div>
							<div className="flex-1 p-0 divide-y divide-border/40">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className="p-4 flex items-center justify-between"
									>
										<div className="space-y-3">
											<Skeleton className="h-6 w-64" />
											<Skeleton className="h-4 w-48 opacity-60" />
										</div>
										<div className="flex gap-2">
											<Skeleton className="h-9 w-12 rounded-md" />
											<Skeleton className="h-9 w-9 rounded-md" />
											<Skeleton className="h-9 w-9 rounded-md" />
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Settings Column Skeleton */}
					<div className="lg:col-span-1 space-y-6">
						<div className="border border-pacific-blue-100 shadow-sm relative overflow-hidden rounded-xl bg-card text-card-foreground">
							<div className="absolute top-0 left-0 w-full h-1 bg-gray-200" />
							<div className="p-6 space-y-3">
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-full opacity-60" />
							</div>
							<div className="p-6 pt-0 space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-4 w-48 opacity-60" />
								</div>
							</div>
							<div className="p-6 pt-0 flex gap-2">
								<Skeleton className="h-9 w-full rounded-md" />
								<Skeleton className="h-9 w-full rounded-md" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
