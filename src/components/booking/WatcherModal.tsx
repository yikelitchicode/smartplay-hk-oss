import { Bell, Calendar, Clock, MapPin } from "lucide-react";
import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";
import { resolveLocalizedName } from "@/lib/i18n-utils";
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

	if (!session || !venue) return null;

	const handleTurnstileVerify = async (token: string) => {
		setStatus("submitting");
		setErrorMessage(null);

		try {
			const { createWatcher } = await import("@/server-functions/watch");

			const result = await createWatcher({
				data: {
					targetSessionId: session.id,
					turnstileToken: token,
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
					: "Failed to create watcher. Please try again.",
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
									<>
										{status === "error" && (
											<div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg text-center font-medium animate-in shake-1">
												{errorMessage}
											</div>
										)}
										<Button
											variant="danger"
											size="lg"
											className="w-full text-base font-bold h-14 rounded-xl shadow-lg shadow-tangerine-dream-600/20"
											onClick={() => setStatus("verifying")}
											disabled={session.isPassed}
										>
											{t("booking:watcher_modal.confirm", "Start Watching")}
										</Button>
										<Button
											variant="ghost"
											size="lg"
											className="w-full h-12 text-gray-500 font-medium hover:bg-porcelain-50 rounded-xl"
											onClick={onClose}
										>
											{t("booking:cancel")}
										</Button>
									</>
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
														"Security check failed. Please try again.",
													);
												}}
											/>
										</div>
										{status === "submitting" && (
											<p className="text-center text-sm text-primary font-black animate-pulse">
												ACTIVATING WATCHER...
											</p>
										)}
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</Modal>
	);
}
