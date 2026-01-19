import { useTranslation } from "react-i18next";

interface BookingResultsInfoProps {
	totalVenues: number;
	lastUpdate: Date | null;
}

export function BookingResultsInfo({
	totalVenues,
	lastUpdate,
}: BookingResultsInfoProps) {
	const { t } = useTranslation(["booking"]);

	return (
		<div className="flex flex-col gap-3 py-2">
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
				<div className="space-y-1">
					<h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
						{t("booking:available_venues")}
						<span className="text-sm font-bold text-pacific-blue-600 bg-pacific-blue-50 px-2.5 py-0.5 rounded-full border border-pacific-blue-100 uppercase tracking-widest cursor-default">
							{totalVenues}
						</span>
					</h2>
				</div>

				{lastUpdate && (
					<div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold text-gray-500 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm self-start sm:self-auto">
						<div className="w-2 h-2 rounded-full bg-meadow-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
						<time
							dateTime={lastUpdate.toISOString()}
							className="flex items-center gap-1.5 uppercase tracking-wider"
						>
							<span className="opacity-60">{t("booking:last_updated")}</span>
							<span className="text-gray-900 whitespace-nowrap">
								{new Date(lastUpdate)
									.toLocaleString("en-GB", {
										day: "2-digit",
										month: "2-digit",
										hour: "2-digit",
										minute: "2-digit",
										hour12: true,
										timeZone: "Asia/Hong_Kong",
									})
									.toLowerCase()
									.replace(",", "")}{" "}
								HKT
							</span>
						</time>
					</div>
				)}
			</div>
		</div>
	);
}
