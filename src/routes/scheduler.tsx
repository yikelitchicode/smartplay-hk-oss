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
import { getWatchers, updateWatcher } from "@/server-functions/watch/watcher";
import {
	getWebhookSettings,
	setWebhookUrl,
	testWebhook,
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
	head: () => ({
		meta: [
			{
				title: "Scheduler | SmartPlay HK OSS",
			},
			{
				name: "description",
				content:
					"Configure auto-fetch watchers for sports facility availability.",
			},
		],
	}),
});

function SchedulerPage(): JSX.Element {
	const { t } = useTranslation(["common", "scheduler"]);
	const { watchersData, settingsData } = Route.useLoaderData();
	const router = useRouter();

	const [selectedWatcherId, setSelectedWatcherId] = useState<string | null>(
		null,
	);

	// Webhook State
	const [webhookUrlInput, setWebhookUrlInput] = useState("");
	const [isSavingWebhook, setIsSavingWebhook] = useState(false);
	const [isTestingWebhook, setIsTestingWebhook] = useState(false);
	const [webhookStatus, setWebhookStatus] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	// Initialize webhook input from loader data
	useEffect(() => {
		if (settingsData.success && settingsData.data?.webhookUrl) {
			setWebhookUrlInput(settingsData.data.webhookUrl);
		}
	}, [settingsData]);

	const activeWatchers =
		watchersData.success && watchersData.data ? watchersData.data : [];

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
					message: t("scheduler.config_saved", "Configuration saved"),
				});
				router.invalidate();
			} else {
				setWebhookStatus({
					success: false,
					message: result.error ?? "Failed to save",
				});
			}
		} catch (_e) {
			setWebhookStatus({ success: false, message: "An error occurred" });
		} finally {
			setIsSavingWebhook(false);
		}
	};

	const handleTestWebhook = async () => {
		setIsTestingWebhook(true);
		setWebhookStatus(null);
		try {
			const result = await testWebhook({
				data: { webhookUrl: webhookUrlInput },
			});
			if (result.success) {
				setWebhookStatus({
					success: true,
					message: t("scheduler.test_sent", "Test notification sent!"),
				});
			} else {
				setWebhookStatus({
					success: false,
					message: result.error ?? "Test failed",
				});
			}
		} catch (_e) {
			setWebhookStatus({ success: false, message: "Test failed" });
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
							{t("scheduler.title", "Watch Scheduler")}
							<Badge variant="primary" size="sm">
								Beta
							</Badge>
						</h1>
						<p className="text-muted-foreground mt-1 text-lg">
							{t("scheduler.subtitle", "Manage your availability watchers")}
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
											{t("scheduler.active_watchers", "Active Watchers")}
										</CardTitle>
										<CardDescription className="mt-1">
											{t(
												"scheduler.active_desc",
												"Monitoring sessions for you",
											)}
										</CardDescription>
									</div>
									<Badge variant="success" className="animate-pulse">
										System Operational
									</Badge>
								</div>
							</CardHeader>

							<div className="flex-1 p-0">
								{activeWatchers.length > 0 ? (
									<div className="divide-y divide-border/40">
										{activeWatchers.map((watcher) => (
											<div
												key={watcher.id}
												className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group"
											>
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<h3 className="font-medium text-foreground">
															{watcher.targetSession?.venue?.name
																? `${watcher.targetSession.venue.name} (${watcher.targetSession.facilityTypeName})`
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
															{watcher.status}
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
															{t("scheduler.hits", "Hits")}
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
															title={t("scheduler.pause", "Pause")}
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
															title={t("scheduler.resume", "Resume")}
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
														title={t("scheduler.delete", "Delete")}
													>
														<Trash2 size={18} />
													</Button>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
										<AlertCircle className="w-12 h-12 mb-4 opacity-50" />
										<p className="text-lg font-medium">No active watchers</p>
										<p className="text-sm">
											Add a watcher via the Booking page to start monitoring.
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
										"scheduler.notification_settings",
										"Notification Settings",
									)}
								</CardTitle>
								<CardDescription>
									{t(
										"scheduler.webhook_desc",
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
										{t("scheduler.webhook_label", "Discord Webhook URL")}
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
											"scheduler.webhook_hint",
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
										t("scheduler.save", "Save")
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
										t("scheduler.test", "Test")
									)}
								</Button>
							</CardFooter>
						</Card>

						{/* Info Card */}
						<Card className="bg-muted/30 border-dashed border-2">
							<CardContent className="pt-6 text-center text-muted-foreground space-y-2">
								<p className="text-sm">
									To add new watchers, please visit the <strong>Booking</strong>{" "}
									page and select a session to monitor.
								</p>
								<Link to="/booking">
									<Button
										variant="ghost"
										className="text-pacific-blue-600 hover:bg-pacific-blue-50"
									>
										Go to Booking
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
