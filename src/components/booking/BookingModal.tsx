import { Calendar, Clock, MapPin } from "lucide-react";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";

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
	const { t } = useTranslation(["booking"]);
	if (!session || !venue) return null;

	return (
		<Modal open={true} onClose={onClose} showCloseButton={false} size="md">
			<div className="-m-6">
				<div className="relative h-32 bg-primary flex items-center justify-center rounded-t-lg">
					<h2 className="text-2xl font-bold text-white tracking-tight">
						{t("booking:confirm_booking")}
					</h2>
				</div>
				<div className="p-6 space-y-6">
					<div className="space-y-4">
						<div className="flex items-start gap-4">
							<div
								className="p-2 bg-pacific-blue-100 text-primary rounded-lg"
								aria-hidden="true"
							>
								<MapPin size={24} />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900">{venue.name}</h3>
								<p className="text-sm text-gray-500">{venue.districtName}</p>
								<p className="text-sm text-primary font-medium mt-1">
									{session.facilityName}
								</p>
							</div>
						</div>

						<dl className="flex items-center gap-4 p-4 bg-porcelain-50 rounded-xl">
							<div className="flex-1 text-center border-r border-porcelain-200">
								<dt className="sr-only">Date</dt>
								<dd className="flex flex-col items-center gap-1">
									<Calendar
										size={18}
										className="text-gray-400"
										aria-hidden="true"
									/>
									<span className="text-sm font-semibold text-gray-900">
										{session.date}
									</span>
								</dd>
							</div>
							<div className="flex-1 text-center">
								<dt className="sr-only">Time</dt>
								<dd className="flex flex-col items-center gap-1">
									<Clock
										size={18}
										className="text-gray-400"
										aria-hidden="true"
									/>
									<span className="text-sm font-semibold text-gray-900">
										{session.startTime} - {session.endTime}
									</span>
								</dd>
							</div>
						</dl>
					</div>

					<div className="space-y-3">
						<Button
							variant="primary"
							size="lg"
							className="w-full"
							onClick={onConfirm}
							disabled={session.isPassed}
							aria-describedby={
								session.isPassed ? "time-passed-hint" : undefined
							}
						>
							{session.isPassed
								? t("booking:time_slot_passed")
								: t("booking:confirm_booking")}
						</Button>
						<Button
							variant="secondary"
							size="lg"
							className="w-full bg-white border border-porcelain-200 hover:bg-porcelain-50"
							onClick={onClose}
						>
							{t("booking:cancel")}
						</Button>
						{session.isPassed && (
							<p
								id="time-passed-hint"
								className="text-sm text-gray-500 text-center"
							>
								{t("booking:passed_hint")}
							</p>
						)}
					</div>
				</div>
			</div>
		</Modal>
	);
}
