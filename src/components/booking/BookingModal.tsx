import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, Calendar, Clock, Loader2, MapPin } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { constructSmartPlayUrl } from "@/lib/booking/smartplay-link";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";
import { resolveLocalizedName } from "@/lib/i18n-utils";

interface BookingModalProps {
	session: NormalizedSession | null;
	venue: NormalizedVenue | null;
	onClose: () => void;
	onConfirm: () => void;
}

export function BookingModal({
	session,
	venue,
	onClose,
	onConfirm,
}: BookingModalProps): JSX.Element | null {
	const { t, i18n } = useTranslation(["booking"]);
	const router = useRouter();
	const [status, setStatus] = useState<
		"idle" | "checking" | "available" | "unavailable" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	if (!session || !venue) return null;

	const handleConfirm = async () => {
		if (session.isPassed) return;

		// Open window immediately to avoid popup blockers on mobile
		const popup = window.open("", "_blank");
		if (popup) {
			popup.document.write(`
                <!DOCTYPE html>
                <html lang="${i18n.language}">
                    <head>
                        <title>${t("booking:availability_check.checking", "Verifying availability...")}</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            :root {
                                --color-bg: #f6f4ee; /* Porcelain 50 */
                                --color-text: #031e21; /* Pacific Blue 950 */
                                --color-primary: #10adbc; /* Pacific Blue 600 */
                                --color-muted: #665533; /* Porcelain 700 */
                            }
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                height: 100vh;
                                margin: 0;
                                background-color: var(--color-bg);
                                color: var(--color-text);
                                -webkit-font-smoothing: antialiased;
                            }
                            .spinner {
                                color: var(--color-primary);
                                margin-bottom: 1.5rem;
                            }
                            h2 {
                                font-size: 1.25rem;
                                font-weight: 700;
                                letter-spacing: -0.025em;
                                margin: 0 0 0.5rem 0;
                            }
                            p {
                                font-size: 0.875rem;
                                color: var(--color-muted);
                                margin: 0;
                                font-weight: 500;
                            }
                            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                        </style>
                    </head>
                    <body>
                        <div class="spinner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                            </svg>
                        </div>
                        <h2>${t("booking:availability_check.checking", "Verifying availability...")}</h2>
                        <p>${t("booking:please_wait", "Please wait while we secure your slot...")}</p>
                    </body>
                </html>
            `);
		}

		setStatus("checking");
		setErrorMessage(null);

		try {
			const { checkSessionAvailability } = await import(
				"@/server-functions/booking"
			);

			// Check real-time availability
			const result = await checkSessionAvailability({
				data: {
					venueId: venue.id,
					facilityCode: session.facilityId,
					date: session.date, // Already in YYYY-MM-DD format
					startTime: session.startTime,
					endTime: session.endTime,
				},
			});

			// Always invalidate router cache to refresh data, regardless of result
			await router.invalidate();

			if (result.success && result.data?.isAvailable) {
				setStatus("available");

				const details = result.data.details;

				if (details) {
					const redirectUrl = constructSmartPlayUrl({
						venueId: details.venueId,
						fatId: details.fatId,
						fvrId: details.fvrId,
						venueName: details.venueName,
						playDate: session.date,
						districtCode: venue.districtCode,
						sportCode: details.faGroupCode,
						typeCode: details.typeCode,
						sessionIndex: details.sessionIndex,
						dateIndex: details.dateIndex,
						isFree: venue.facilities[session.facilityId]?.priceType === "Free",
					});

					if (popup) {
						popup.location.href = redirectUrl;
					} else {
						// Fallback if popup blocked (unlikely with this flow) or window failed to open
						window.open(redirectUrl, "_blank");
					}
				} else {
					if (popup) popup.close();
				}

				// Proceed to booking after short delay to show success state
				setTimeout(() => {
					onConfirm(); // This shows the success toast in parent
					setStatus("idle");
				}, 1000);
			} else {
				if (popup) popup.close();
				setStatus("unavailable");
				setErrorMessage(
					t(
						"booking:availability_check.no_longer_available",
						"This session is no longer available",
					),
				);
			}
		} catch (error) {
			if (popup) popup.close();
			setStatus("error");
			setErrorMessage(
				error instanceof Error
					? error.message
					: t(
							"booking:availability_check.failed",
							"Failed to verify availability. Please try again.",
						),
			);
		}
	};

	return (
		<Modal
			open={true}
			onClose={onClose}
			showCloseButton={true}
			floatingCloseButton={true}
			closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10"
			size="md"
		>
			<div className="-m-6">
				<div className="relative h-32 bg-primary flex flex-col justify-center px-6 rounded-t-lg">
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
							<span className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">
								{t("booking:booking_request")}
							</span>
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
				</div>

				<div className="p-8 space-y-8">
					{/* 1. Time - Most Prominent */}
					<div className="flex flex-col items-center justify-center py-2 border-b border-porcelain-100 pb-8">
						<div className="flex items-center gap-3 text-primary mb-1">
							<Clock size={20} strokeWidth={2.5} />
							<span className="text-sm font-black uppercase tracking-widest opacity-60">
								{t("booking:session_time")}
							</span>
						</div>
						<div className="text-5xl font-black text-gray-900 tracking-tighter tabular-nums flex items-center justify-center gap-1 w-full">
							<span className="flex-1 text-right">{session.startTime}</span>
							<span className="text-3xl text-gray-200 font-light mx-4 italic flex items-center justify-center">
								|
							</span>
							<span className="flex-1 text-left">{session.endTime}</span>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-8 pt-2">
						<div className="space-y-4">
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

					<div className="space-y-4 pt-4">
						<div className="flex items-center justify-center gap-2 py-2">
							<AlertTriangle
								size={18}
								className="text-amber-500 shrink-0"
								strokeWidth={2.5}
							/>
							<p className="text-sm font-bold text-amber-600/90 leading-relaxed">
								{t("booking:official_source_disclaimer")}
							</p>
						</div>

						{/* Error Message */}
						{(status === "unavailable" || status === "error") &&
							errorMessage && (
								<div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg text-center font-medium animate-in slide-in-from-top-1">
									{errorMessage}
								</div>
							)}

						<div className="space-y-3">
							<Button
								variant="primary"
								size="lg"
								className="w-full text-base font-bold h-14 rounded-xl shadow-lg shadow-primary/20"
								onClick={handleConfirm}
								disabled={
									session.isPassed ||
									status === "checking" ||
									status === "unavailable"
								}
								aria-describedby={
									session.isPassed ? "time-passed-hint" : undefined
								}
							>
								{status === "checking" ? (
									<span className="flex items-center gap-2">
										<Loader2 size={18} className="animate-spin" />
										{t(
											"booking:availability_check.checking",
											"Verifying availability...",
										)}
									</span>
								) : status === "available" ? (
									<span className="flex items-center gap-2">
										✓ {t("booking:availability_check.available", "Available!")}
									</span>
								) : session.isPassed ? (
									t("booking:time_slot_passed")
								) : (
									t("booking:confirm_booking")
								)}
							</Button>
							<Button
								variant="ghost"
								size="lg"
								className="w-full h-12 text-gray-500 font-medium hover:bg-porcelain-50 rounded-xl"
								onClick={onClose}
								disabled={status === "checking"}
							>
								{t("booking:cancel")}
							</Button>
							{session.isPassed && (
								<p
									id="time-passed-hint"
									className="text-xs text-gray-400 text-center font-medium"
								>
									{t("booking:passed_hint")}
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</Modal>
	);
}
