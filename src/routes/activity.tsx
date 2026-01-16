import { PreviewCard } from "@base-ui/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/Card";

export const Route = createFileRoute("/activity")({
	component: ActivityPage,
	head: () => ({
		meta: [
			{
				title: "Activity Calendar | SmartPlay HK OSS",
			},
			{
				name: "description",
				content: "View your upcoming sports sessions and activities.",
			},
		],
	}),
});

function ActivityPage() {
	const { t } = useTranslation(["common", "scheduler"]);

	// Generate some mock calendar days (Moved from scheduler.tsx)
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
							{t("nav.activity", "Activity Calendar")}
							<Badge variant="primary" size="sm">
								Beta
							</Badge>
						</h1>
						<p className="text-muted-foreground mt-1 text-lg">
							{t(
								"scheduler.calendar.desc",
								"Visual overview of your scheduled sessions.",
							)}
						</p>
					</div>
					<Link to="/">
						<Button variant="ghost" size="sm" className="gap-2 shrink-0">
							<ArrowLeft size={16} /> {t("nav.home")}
						</Button>
					</Link>
				</div>

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
			</div>
		</div>
	);
}
