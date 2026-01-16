import { Bell, Calendar, Clock, MapPin } from "lucide-react";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";
import { resolveLocalizedName } from "@/lib/i18n-utils";

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
	if (!session || !venue) return null;

	return (
		<Modal open={true} onClose={onClose} showCloseButton={false} size="md">
			<div className="-m-6">
				{/* Header - Using Meadow Green for distinct look */}
				<div className="relative h-32 bg-meadow-green-600 flex items-center justify-center rounded-t-lg">
					<div className="text-center space-y-2">
						<div className="flex justify-center">
							<div className="p-2 bg-white/20 rounded-full">
								<Bell className="w-8 h-8 text-white" />
							</div>
						</div>
						<h2 className="text-2xl font-bold text-white tracking-tight">
							{t("booking:watcher_modal.title", "Add Availability Watcher")}
						</h2>
					</div>
				</div>

				<div className="p-6 space-y-6">
					<div className="space-y-4">
						<p className="text-center text-gray-600">
							{t(
								"booking:watcher_modal.desc",
								"We will notify you immediately when this session becomes available.",
							)}
						</p>

						<div className="flex items-start gap-4">
							<div
								className="p-2 bg-meadow-green-100 text-meadow-green-700 rounded-lg"
								aria-hidden="true"
							>
								<MapPin size={24} />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900">
									{resolveLocalizedName(
										{
											name: venue.name,
											nameEn: venue.nameEn,
											nameTc: venue.nameTc,
											nameSc: venue.nameSc,
										},
										i18n.language,
									)}
								</h3>
								<p className="text-sm text-gray-500">
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
								<p className="text-sm text-meadow-green-700 font-medium mt-1">
									{(() => {
										// Look up the facility for localized names
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
								</p>
							</div>
						</div>

						<dl className="flex items-center gap-4 p-4 bg-porcelain-50 rounded-xl border border-porcelain-200">
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
							variant="primary" // We might want to override the color if primary is blue
							size="lg"
							className="w-full bg-meadow-green-600 hover:bg-meadow-green-700 text-white border-transparent"
							onClick={onConfirm}
							disabled={session.isPassed}
						>
							{t("booking:watcher_modal.confirm", "Start Watching")}
						</Button>
						<Button
							variant="ghost"
							size="lg"
							className="w-full bg-white border border-porcelain-200 hover:bg-porcelain-50"
							onClick={onClose}
						>
							{t("booking:cancel")}
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	);
}
