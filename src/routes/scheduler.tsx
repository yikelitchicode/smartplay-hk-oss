import { PreviewCard } from "@base-ui/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	AlertCircle,
	ArrowLeft,
	Bell,
	Calendar as CalendarIcon,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

export const Route = createFileRoute("/scheduler")({
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

interface WatchTask {
	id: string;
	venue: string;
	date: string;
	timeRange: string;
	status: "active" | "paused";
	notifications: number;
}

function SchedulerPage() {
	const { t } = useTranslation(["common"]);

	// Mock state for draft
	const [webhookUrl, setWebhookUrl] = useState("");
	const [tasks, _setTasks] = useState<WatchTask[]>([
		{
			id: "1",
			venue: "Victoria Park Tennis Court",
			date: "2024-02-01",
			timeRange: "18:00 - 20:00",
			status: "active",
			notifications: 2,
		},
		{
			id: "2",
			venue: "Southorn Playground",
			date: "2024-02-05",
			timeRange: "19:00 - 21:00",
			status: "active",
			notifications: 5,
		},
	]);

	// Load from localStorage (Simulation)
	useEffect(() => {
		const savedUrl = localStorage.getItem("sp_webhook_url");
		if (savedUrl) setWebhookUrl(savedUrl);
	}, []);

	// Save to localStorage (Simulation)
	const handleSaveWebhook = () => {
		localStorage.setItem("sp_webhook_url", webhookUrl);
		// Show toast or feedback here
	};

	// Generate some mock calendar days
	const days = Array.from({ length: 35 }, (_, i) => {
		const day = i + 1 - 4; // Offset to start before 1st
		if (day <= 0 || day > 30) return null;
		// Mark some days as having activity
		const hasActivity = [1, 5, 12, 18, 25].includes(day);
		return { day, hasActivity };
	});

	return (
		<div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col font-sans">
			<div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
				{/* Header */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
							{t("scheduler.title")}
							<Badge variant="primary" size="sm">
								Public Beta
							</Badge>
						</h1>
						<p className="text-muted-foreground mt-1 text-lg">
							{t("scheduler.subtitle")}
						</p>
					</div>
					<Link to="/">
						<Button variant="ghost" size="sm" className="gap-2 shrink-0">
							<ArrowLeft size={16} /> {t("nav.home")}
						</Button>
					</Link>
				</div>

				{/* 1. Top Section: Activity Calendar */}
				<Card className="border-border shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
						<div className="space-y-1">
							<CardTitle className="text-xl flex items-center gap-2">
								<CalendarIcon className="w-5 h-5 text-pacific-blue-500" />
								{t("scheduler.calendar.upcoming_activity", "Upcoming Activity")}
							</CardTitle>
							<CardDescription>
								Sessions found by your active watchers.
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="secondary" size="sm" className="h-8 w-8 p-0">
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<span className="text-sm font-medium w-24 text-center">
								February 2024
							</span>
							<Button variant="secondary" size="sm" className="h-8 w-8 p-0">
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden bg-muted/20 border border-border">
							{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
								<div
									key={d}
									className="bg-muted/10 p-2 text-center text-xs font-semibold text-muted-foreground"
								>
									{d}
								</div>
							))}
							{days.map((item, idx) => (
								<div
									key={item?.day ?? `empty-${idx}`}
									className={`min-h-[100px] p-2 bg-background relative ${
										!item ? "bg-muted/5" : ""
									}`}
								>
									{item && (
										<>
											<span
												className={`text-sm font-medium ${
													item.hasActivity
														? "text-pacific-blue-600"
														: "text-muted-foreground"
												}`}
											>
												{item.day}
											</span>
											{item.hasActivity && (
												<div className="mt-2 space-y-1">
													<PreviewCard.Root>
														<PreviewCard.Trigger className="w-full text-left">
															<div className="cursor-pointer text-xs bg-pacific-blue-50 text-pacific-blue-700 px-1.5 py-1 rounded truncate border border-pacific-blue-200 hover:bg-pacific-blue-100 hover:border-pacific-blue-300 transition-colors shadow-xs">
																Tennis • 18:00
															</div>
														</PreviewCard.Trigger>
														<PreviewCard.Portal>
															<PreviewCard.Positioner
																sideOffset={8}
																side="right"
															>
																<PreviewCard.Popup className="z-50 rounded-md bg-popover p-4 text-popover-foreground shadow-lg border border-border outline-hidden w-64 animate-in fade-in-0 zoom-in-95">
																	<PreviewCard.Arrow className="fill-popover stroke-border" />
																	<div className="space-y-3">
																		<div className="flex items-center justify-between">
																			<h4 className="font-semibold text-sm">
																				Victoria Park
																			</h4>
																			<Badge variant="success" size="sm">
																				{t(
																					"scheduler.preview.status",
																					"Available",
																				)}
																			</Badge>
																		</div>
																		<div className="text-sm text-muted-foreground space-y-1">
																			<div className="flex items-center gap-2">
																				<CalendarIcon className="w-3.5 h-3.5" />
																				<span>Feb {item.day}, 2024</span>
																			</div>
																			<div className="flex items-center gap-2">
																				<Clock className="w-3.5 h-3.5" />
																				<span>18:00 - 20:00</span>
																			</div>
																		</div>
																		<div className="pt-2 border-t border-border">
																			<Link
																				to="/booking"
																				className="text-xs text-pacific-blue-600 hover:underline flex items-center gap-1"
																			>
																				{t(
																					"scheduler.preview.view_details",
																					"View Details",
																				)}
																				<ChevronRight className="w-3 h-3" />
																			</Link>
																		</div>
																	</div>
																</PreviewCard.Popup>
															</PreviewCard.Positioner>
														</PreviewCard.Portal>
													</PreviewCard.Root>

													{item.day === 5 && (
														<PreviewCard.Root>
															<PreviewCard.Trigger className="w-full text-left">
																<div className="cursor-pointer text-xs bg-pacific-blue-50 text-pacific-blue-700 px-1.5 py-1 rounded truncate border border-pacific-blue-200 hover:bg-pacific-blue-100 hover:border-pacific-blue-300 transition-colors shadow-xs">
																	Basket... • 19:00
																</div>
															</PreviewCard.Trigger>
															<PreviewCard.Portal>
																<PreviewCard.Positioner
																	sideOffset={8}
																	side="right"
																>
																	<PreviewCard.Popup className="z-50 rounded-md bg-popover p-4 text-popover-foreground shadow-lg border border-border outline-hidden w-64 animate-in fade-in-0 zoom-in-95">
																		<PreviewCard.Arrow className="fill-popover stroke-border" />
																		<div className="space-y-3">
																			<div className="flex items-center justify-between">
																				<h4 className="font-semibold text-sm">
																					Southorn Playground
																				</h4>
																				<Badge variant="success" size="sm">
																					{t(
																						"scheduler.preview.status",
																						"Available",
																					)}
																				</Badge>
																			</div>
																			<div className="text-sm text-muted-foreground space-y-1">
																				<div className="flex items-center gap-2">
																					<CalendarIcon className="w-3.5 h-3.5" />
																					<span>Feb {item.day}, 2024</span>
																				</div>
																				<div className="flex items-center gap-2">
																					<Clock className="w-3.5 h-3.5" />
																					<span>19:00 - 21:00</span>
																				</div>
																			</div>
																			<div className="pt-2 border-t border-border">
																				<Link
																					to="/booking"
																					className="text-xs text-pacific-blue-600 hover:underline flex items-center gap-1"
																				>
																					{t(
																						"scheduler.preview.view_details",
																						"View Details",
																					)}
																					<ChevronRight className="w-3 h-3" />
																				</Link>
																			</div>
																		</div>
																	</PreviewCard.Popup>
																</PreviewCard.Positioner>
															</PreviewCard.Portal>
														</PreviewCard.Root>
													)}
												</div>
											)}
										</>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* 2. Bottom Section: Watchers & Settings */}
				<div className="grid lg:grid-cols-3 gap-8">
					{/* Active Watchers (Takes up more space now) */}
					<div className="lg:col-span-2 space-y-6">
						<Card className="h-full border-border shadow-sm flex flex-col">
							<CardHeader className="pb-4 border-b border-border/40">
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="text-xl flex items-center gap-2">
											<Activity className="w-5 h-5 text-meadow-green-500" />
											{t("scheduler.active_watchers")}
										</CardTitle>
										<CardDescription className="mt-1">
											{t("scheduler.active_desc")}
										</CardDescription>
									</div>
									<Badge variant="success" className="animate-pulse">
										System Operational
									</Badge>
								</div>
							</CardHeader>

							<div className="flex-1 p-0">
								{tasks.length > 0 ? (
									<div className="divide-y divide-border/40">
										{tasks.map((task) => (
											<div
												key={task.id}
												className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group"
											>
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<h3 className="font-medium text-foreground">
															{task.venue}
														</h3>
														<Badge variant="default" size="sm">
															{task.status}
														</Badge>
													</div>
													<div className="flex items-center gap-4 text-sm text-muted-foreground">
														<span className="flex items-center gap-1">
															<CheckCircle2 size={14} /> {task.date}
														</span>
														<span className="flex items-center gap-1">
															<Clock size={14} /> {task.timeRange}
														</span>
													</div>
												</div>

												<div className="flex items-center gap-4">
													<div className="text-right hidden sm:block">
														<p className="text-2xl font-semibold text-pacific-blue-600">
															{task.notifications}
														</p>
														<p className="text-xs text-muted-foreground uppercase tracking-wider">
															{t("scheduler.hits")}
														</p>
													</div>
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive hover:bg-destructive/10"
													>
														<Trash2 size={16} />
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
											add a watcher via the Booking page to start monitoring.
										</p>
									</div>
								)}
							</div>
						</Card>
					</div>

					{/* Settings Column */}
					<div className="lg:col-span-1 space-y-6">
						{/* Webhook Configuration */}
						<Card className="border-pacific-blue-100 shadow-sm">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<Bell className="w-4 h-4 text-pacific-blue-500" />
									{t("scheduler.notification_settings")}
								</CardTitle>
								<CardDescription>{t("scheduler.webhook_desc")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label
										htmlFor="webhook-url"
										className="text-sm font-medium text-foreground"
									>
										{t("scheduler.webhook_label")}
									</label>
									<Input
										id="webhook-url"
										placeholder="https://discord.com/api/webhooks/..."
										value={webhookUrl}
										onChange={(e) => setWebhookUrl(e.target.value)}
										className="text-sm"
									/>
									<p className="text-xs text-muted-foreground">
										{t("scheduler.webhook_hint")}
									</p>
								</div>
							</CardContent>
							<CardFooter>
								<Button
									onClick={handleSaveWebhook}
									size="sm"
									variant="secondary"
									className="w-full"
								>
									{t("scheduler.save_config")}
								</Button>
							</CardFooter>
						</Card>

						{/* Info Card (formerly New Watcher placeholder) */}
						<Card className="bg-muted/30 border-dashed border-2">
							<CardContent className="pt-6 text-center text-muted-foreground space-y-2">
								<p className="text-sm">
									To add new watchers, please visit the <strong>Booking</strong>{" "}
									page and select a session to monitor.
								</p>
								<Link to="/booking">
									<Button variant="ghost" className="text-pacific-blue-600">
										Go to Booking
									</Button>
								</Link>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
