import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import {
	Bell,
	Calendar,
	CheckCircle2,
	Clock,
	Loader2,
	MapPin,
	Settings,
} from "lucide-react";
import { type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";
import { resolveLocalizedName } from "@/lib/i18n-utils";
import { getWebhookSettings } from "@/server-functions/watch/webhook";
import { TurnstileWidget } from "./TurnstileWidget";

interface WatcherModalProps {
	session: NormalizedSession | null;
	venue: NormalizedVenue | null;
	onClose: () => void;
	onConfirm: () => void;
}

export function WatcherModal({
	session,
	venue,
	onClose,
	onConfirm,
}: WatcherModalProps): JSX.Element | null {
	const { t, i18n } = useTranslation(["booking"]);
	const [status, setStatus] = useState<
		"idle" | "verifying" | "submitting" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoadingWebhook, setIsLoadingWebhook] = useState(true);

	// TanStack Form definition
	const form = useForm({
		defaultValues: {
			webhookUrl: "",
		},
		validators: {
			onChange: z.object({
				webhookUrl: z.string().min(1, "Webhook URL is required"),
			}),
		},
		onSubmit: async () => {
			// On valid submit, verify with Turnstile
			setStatus("verifying");
		},
	});

	// Fetch webhook settings on mount
	useEffect(() => {
		const fetchSettings = async () => {
			setIsLoadingWebhook(true);
			try {
				const result = await getWebhookSettings();
				if (result.success && result.data?.webhookUrl) {
					form.setFieldValue("webhookUrl", result.data.webhookUrl);
				}
			} catch (error) {
				console.error("Failed to fetch webhook settings", error);
			} finally {
				setIsLoadingWebhook(false);
			}
		};
		fetchSettings();
	}, [form]);

	if (!session || !venue) return null;

	const handleTurnstileVerify = async (token: string) => {
		// Use form values directly
		const webhookUrl = form.getFieldValue("webhookUrl");

		if (!webhookUrl) {
			setErrorMessage(t("booking:watcher_modal.error_webhook_url"));
			setStatus("error");
			return;
		}

		setStatus("submitting");
		setErrorMessage(null);

		try {
			const { createWatcher } = await import("@/server-functions/watch");

			const result = await createWatcher({
				data: {
					targetSessionId: session.id,
					turnstileToken: token,
					webhookUrl,
				},
			});

			if ("error" in result) {
				throw new Error(result.error);
			}

			setStatus("success");
			// Delay closing/confirming to show success state
			setTimeout(() => {
				onConfirm(); // This will close the modal and trigger any parent callbacks
			}, 1500);
		} catch (err) {
			console.error("Failed to create watcher:", err);
			setStatus("error");
			setErrorMessage(
				err instanceof Error
					? err.message
					: t("booking:watcher_modal.error_create_failed"),
			);
		}
	};

	return (
		<Modal
			open={true}
			onClose={onClose}
			showCloseButton={status !== "submitting"}
			floatingCloseButton={true}
			closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10"
			size="md"
		>
			<div className="-m-6">
				{/* Header - Using Meadow Green for distinct look */}
				<div
					className={`relative h-32 flex flex-col justify-center px-6 rounded-t-lg transition-all duration-300 ${
						status === "success"
							? "bg-meadow-green-600"
							: "bg-tangerine-dream-600"
					}`}
				>
					{status === "success" ? (
						<div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
							<div className="p-2 bg-white/20 rounded-full mb-2">
								<div className="w-6 h-6 text-white flex items-center justify-center font-bold text-lg">
									✓
								</div>
							</div>
							<h2 className="text-xl font-bold text-white tracking-tight">
								{t("booking:watcher_modal.success", "Watcher Activated!")}
							</h2>
						</div>
					) : (
						<div className="flex flex-col">
							<div className="flex gap-1.5 font-sans mb-4">
								{session.peakHour && (
									<span className="px-2 py-0.5 rounded-sm bg-vanilla-custard-500 text-vanilla-custard-950 text-[10px] font-black tracking-wider shadow-sm">
										PEAK
									</span>
								)}
								{(() => {
									const facility = Object.values(venue.facilities).find(
										(f) => f.code === session.facilityId,
									);
									return facility?.priceType ? (
										<span
											className={`px-2 py-0.5 rounded-sm text-white text-[10px] font-black tracking-wider shadow-sm ${
												facility.priceType === "Free"
													? "bg-meadow-green-500"
													: "bg-icy-blue-500"
											}`}
										>
											{facility.priceType.toUpperCase()}
										</span>
									) : null;
								})()}
							</div>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1.5 opacity-60">
									<Bell size={10} className="text-white" />
									<span className="text-white text-xs font-black uppercase tracking-[0.2em]">
										{t("booking:watcher_modal.availability_watcher")}
									</span>
								</div>
								<h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
									{(() => {
										const facility = Object.values(venue.facilities).find(
											(f) => f.code === session.facilityId,
										);
										return resolveLocalizedName(
											facility
												? {
														name: facility.name,
														nameEn: facility.nameEn,
														nameTc: facility.nameTc,
														nameSc: facility.nameSc,
													}
												: { name: session.facilityName },
											i18n.language,
										);
									})()}
								</h2>
							</div>
						</div>
					)}
				</div>

				<div className="p-8 space-y-8">
					{status === "success" ? (
						<div className="text-center space-y-6 py-4 animate-in fade-in zoom-in">
							<p className="text-gray-600 font-medium text-lg">
								{t(
									"booking:watcher_modal.success_desc",
									"You will receive a notification as soon as this session becomes available.",
								)}
							</p>
							<Button
								variant="primary"
								className="w-full bg-meadow-green-600 hover:bg-meadow-green-700 text-white h-14 rounded-xl font-bold text-base shadow-lg shadow-meadow-green-600/20"
								onClick={onConfirm}
							>
								{t("booking:close", "Close")}
							</Button>
						</div>
					) : (
						<>
							<div className="space-y-8">
								<p className="text-center text-sm text-gray-400 font-medium px-4">
									{t(
										"booking:watcher_modal.desc",
										"We will notify you immediately when this session becomes available.",
									)}
								</p>

								{/* 1. Time - Most Prominent */}
								<div className="flex flex-col items-center justify-center py-2 border-b border-porcelain-100 pb-8">
									<div className="flex items-center gap-3 text-tangerine-dream-600 mb-1">
										<Clock size={20} strokeWidth={2.5} />
										<span className="text-sm font-black uppercase tracking-widest opacity-60">
											{t("booking:session_time")}
										</span>
									</div>
									<div className="text-5xl font-black text-gray-900 tracking-tighter tabular-nums flex items-center justify-center gap-1 w-full">
										<span className="flex-1 text-right">
											{session.startTime}
										</span>
										<span className="text-3xl text-gray-200 font-light mx-4 italic flex items-center justify-center">
											|
										</span>
										<span className="flex-1 text-left">{session.endTime}</span>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-8 pt-2">
									<div className="space-y-4 border-r border-porcelain-100 pr-4">
										<div className="flex items-center gap-2 text-gray-400">
											<Calendar size={18} />
											<span className="text-xs font-bold uppercase tracking-widest">
												{t("booking:date")}
											</span>
										</div>
										<div className="space-y-1">
											<p className="text-xl font-bold text-gray-900 leading-none">
												{session.date}
											</p>
											<p className="text-xs font-medium text-gray-500">
												{new Intl.DateTimeFormat(
													i18n.language === "en"
														? "en-US"
														: i18n.language === "zh"
															? "zh-HK"
															: "zh-CN",
													{
														weekday: "long",
													},
												).format(new Date(session.date))}
											</p>
										</div>
									</div>

									{/* 3. Location */}
									<div className="space-y-4">
										<div className="flex items-center gap-2 text-gray-400">
											<MapPin size={18} />
											<span className="text-xs font-bold uppercase tracking-widest">
												{t("booking:location")}
											</span>
										</div>
										<div className="space-y-1">
											<p className="text-lg font-bold text-gray-900 leading-tight">
												{resolveLocalizedName(
													{
														name: venue.name,
														nameEn: venue.nameEn,
														nameTc: venue.nameTc,
														nameSc: venue.nameSc,
													},
													i18n.language,
												)}
											</p>
											<p className="text-xs font-medium text-gray-500">
												{resolveLocalizedName(
													{
														name: venue.districtName,
														nameEn: venue.districtNameEn,
														nameTc: venue.districtNameTc,
														nameSc: venue.districtNameSc,
													},
													i18n.language,
												)}
											</p>
										</div>
									</div>
								</div>
							</div>

							<div className="space-y-3 pt-4">
								{status === "idle" || status === "error" ? (
									<form
										onSubmit={(e) => {
											e.preventDefault();
											e.stopPropagation();
											form.handleSubmit();
										}}
									>
										<form.Subscribe
											selector={(state) => [state.values.webhookUrl]}
										>
											{([webhookUrl]) => (
												<div className="space-y-3 pb-2">
													<div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
														<span className="flex items-center gap-1">
															{t(
																"booking:watcher_modal.webhook_url_label",
																"Webhook URL",
															)}
															<span className="text-destructive">*</span>
														</span>
														{webhookUrl && !isLoadingWebhook && (
															<Link
																to="/scheduler"
																className="flex items-center gap-1 text-[10px] text-pacific-blue-600 hover:text-pacific-blue-700 font-medium normal-case tracking-normal"
																target="_blank"
															>
																<Settings size={12} />
																{t(
																	"booking:watcher_modal.configure",
																	"Configure",
																)}
															</Link>
														)}
													</div>

													{isLoadingWebhook ? (
														<div className="w-full h-12 rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
															<Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
														</div>
													) : webhookUrl ? (
														<div className="w-full px-4 py-3 rounded-xl border border-meadow-green-200 bg-meadow-green-50 flex items-center gap-3">
															<div className="bg-meadow-green-100 p-1.5 rounded-full shrink-0">
																<CheckCircle2
																	size={16}
																	className="text-meadow-green-600"
																/>
															</div>
															<div className="flex-1 min-w-0">
																<p className="text-xs font-medium text-meadow-green-800 truncate">
																	{t(
																		"booking:watcher_modal.using_configured_webhook",
																		"Using configured webhook from Scheduler",
																	)}
																</p>
																<p className="text-[10px] text-meadow-green-600 truncate font-mono opacity-80">
																	{webhookUrl}
																</p>
															</div>
														</div>
													) : (
														<div className="w-full p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-center gap-2">
															<p className="text-sm text-gray-600 font-medium">
																{t(
																	"booking:watcher_modal.no_webhook_configured",
																	"No webhook configured",
																)}
															</p>
															<p className="text-xs text-gray-500 mb-2">
																{t(
																	"booking:watcher_modal.configure_webhook_hint",
																	"You need to set up a notification webhook in the Scheduler to use this feature.",
																)}
															</p>
															<Link to="/scheduler">
																<Button
																	variant="secondary"
																	size="sm"
																	className="h-8 gap-2"
																>
																	<Settings size={14} />
																	{t(
																		"booking:watcher_modal.go_to_scheduler",
																		"Go to Scheduler",
																	)}
																</Button>
															</Link>
														</div>
													)}
												</div>
											)}
										</form.Subscribe>

										{status === "error" && (
											<div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg text-center font-medium animate-in shake-1 mb-4">
												{errorMessage}
											</div>
										)}
										<form.Subscribe
											selector={(state) => [
												state.canSubmit,
												state.isSubmitting,
												state.values.webhookUrl,
											]}
										>
											{([canSubmit, isSubmitting, webhookUrl]) => (
												<Button
													type="submit"
													variant="danger"
													size="lg"
													className="w-full text-base font-bold h-14 rounded-xl shadow-lg shadow-tangerine-dream-600/20"
													disabled={
														!canSubmit ||
														!!isSubmitting ||
														!!session.isPassed ||
														!webhookUrl
													}
												>
													{t("booking:watcher_modal.confirm", "Start Watching")}
												</Button>
											)}
										</form.Subscribe>
									</form>
								) : (
									<div className="pt-4 border-t border-porcelain-100">
										<p className="text-xs text-center text-gray-400 font-bold uppercase tracking-widest mb-4">
											{t(
												"booking:watcher_modal.security_check",
												"Security Verification",
											)}
										</p>
										<div className="flex justify-center mb-4">
											<TurnstileWidget
												onVerify={handleTurnstileVerify}
												onError={(err) => {
													console.error(err);
													setStatus("error");
													setErrorMessage(
														t("booking:watcher_modal.error_security_check"),
													);
												}}
											/>
										</div>
										{status === "submitting" && (
											<p className="text-center text-sm text-primary font-black animate-pulse">
												{t("booking:watcher_modal.activating")}
											</p>
										)}
									</div>
								)}

								{(status === "idle" || status === "error") && (
									<Button
										variant="ghost"
										size="lg"
										className="w-full h-12 text-gray-500 font-medium hover:bg-porcelain-50 rounded-xl"
										onClick={onClose}
									>
										{t("booking:cancel")}
									</Button>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</Modal>
	);
}
