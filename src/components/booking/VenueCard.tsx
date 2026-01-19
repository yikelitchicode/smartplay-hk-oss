import { Bell, Eye, Flame, Trophy } from "lucide-react";
import { type JSX, memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";
import { resolveLocalizedName } from "@/lib/i18n-utils";
import { VenueThumbnail } from "./VenueThumbnail";

interface VenueCardProps {
	venue: NormalizedVenue;
	onSessionClick: (venue: NormalizedVenue, session: NormalizedSession) => void;
	onWatchClick: (venue: NormalizedVenue, session: NormalizedSession) => void;
	watchedSessionIds: Set<string>;
}

export const VenueCard = memo(function VenueCard({
	venue,
	onSessionClick,
	onWatchClick,
	watchedSessionIds,
}: VenueCardProps): JSX.Element {
	const { t, i18n } = useTranslation(["booking"]);

	const sortedFacilities = useMemo(() => {
		return Object.entries(venue.facilities).sort(([, a], [, b]) => {
			const nameA = resolveLocalizedName(
				{
					name: a.name,
					nameEn: a.nameEn,
					nameTc: a.nameTc,
					nameSc: a.nameSc,
				},
				i18n.language,
			);
			const nameB = resolveLocalizedName(
				{
					name: b.name,
					nameEn: b.nameEn,
					nameTc: b.nameTc,
					nameSc: b.nameSc,
				},
				i18n.language,
			);
			return nameA.localeCompare(nameB);
		});
	}, [venue.facilities, i18n.language]);

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
			{/* Venue Header */}
			<div className="flex flex-col md:flex-row">
				{/* Image Section */}
				<VenueThumbnail venue={venue} />

				{/* Content Section */}
				<div className="p-5 flex-1 min-w-0">
					<h3 className="text-xl font-bold text-gray-900 mb-1 truncate">
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

					<div className="mt-4 space-y-6">
						{sortedFacilities.map(([facKey, facility]) => {
							if (facility.sessions.length === 0) return null;

							return (
								<div key={facKey} className="space-y-3">
									<div className="flex items-center gap-2 text-sm font-semibold text-pacific-blue-800 bg-pacific-blue-50 px-3 py-1.5 rounded-lg w-fit">
										<Trophy size={14} className="text-primary" />
										{resolveLocalizedName(
											{
												name: facility.name,
												nameEn: facility.nameEn,
												nameTc: facility.nameTc,
												nameSc: facility.nameSc,
											},
											i18n.language,
										)}
									</div>

									<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
										{facility.sessions.map((session) => {
											const isWatched = watchedSessionIds.has(session.id);
											const getSessionStyles = () => {
												if (session.isPassed) {
													return "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed grayscale";
												}
												if (session.available) {
													return "bg-white border-pacific-blue-200 text-pacific-blue-700 hover:bg-primary hover:text-white hover:border-primary shadow-sm";
												}
												if (session.isProjected) {
													return "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 border-dashed";
												}
												// Watched session styling - use orange to indicate monitoring (not available)
												if (isWatched) {
													return "bg-tangerine-dream-50 border-tangerine-dream-300 text-tangerine-dream-700 cursor-not-allowed";
												}
												return "bg-porcelain-50 border-porcelain-100 text-porcelain-300 cursor-not-allowed";
											};

											return (
												<div key={session.id} className="relative group">
													<button
														type="button"
														disabled={
															(!session.available && !session.isProjected) ||
															session.isPassed
														}
														onClick={() =>
															session.isProjected
																? onWatchClick(venue, session)
																: onSessionClick(venue, session)
														}
														aria-label={`${session.startTime} - ${
															session.available
																? "Available"
																: isWatched
																	? "Watched"
																	: "Booked"
														}${session.isPassed ? " (Passed)" : ""}`}
														className={`w-full flex flex-col items-center justify-center p-2 rounded-lg text-sm font-medium border transition-all ${getSessionStyles()}`}
													>
														<span className="text-sm font-bold mb-0.5">
															{session.startTime}
														</span>
														{session.peakHour && session.available && (
															<div
																className="absolute -top-1.5 -right-1.5"
																aria-hidden="true"
															>
																<Flame className="w-3.5 h-3.5 text-warning fill-warning animate-pulse" />
															</div>
														)}
														{isWatched && !session.isPassed && (
															<div
																className="absolute -top-1.5 -right-1.5"
																aria-hidden="true"
															>
																<Eye className="w-3.5 h-3.5 text-tangerine-dream-500" />
															</div>
														)}
														{!session.available &&
															!session.isPassed &&
															!isWatched &&
															!session.isProjected && (
																<span className="absolute inset-0 flex items-center justify-center bg-porcelain-50/50 rounded-lg">
																	<span className="sr-only">Fully Booked</span>
																</span>
															)}
														{session.isPassed && (
															<span className="absolute inset-0 flex items-center justify-center bg-gray-50/50 rounded-lg">
																<span className="text-[9px] uppercase tracking-tighter font-bold text-gray-400 bg-gray-100/80 px-1 rounded shadow-sm border border-gray-200">
																	{t("booking:passed")}
																</span>
															</span>
														)}
													</button>

													{/* Watcher Button (Only for future booked sessions NOT already watched) */}
													{!session.isPassed &&
														!session.available &&
														!isWatched && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	onWatchClick(venue, session);
																}}
																className="absolute -top-2 -right-2 w-6 h-6 md:w-5 md:h-5 md:-top-1.5 md:-right-1.5 bg-white border border-pacific-blue-200 text-pacific-blue-500 rounded-full flex items-center justify-center shadow-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 hover:bg-pacific-blue-50 hover:text-pacific-blue-600 md:hover:scale-110"
																title={t(
																	"booking:watch",
																	"Notify on availability",
																)}
															>
																<Bell className="w-3 h-3 md:w-2.5 md:h-2.5 fill-current" />
															</button>
														)}

													{/* Watched Indicator (Only for watched sessions) */}
													{isWatched && !session.isPassed && (
														<div
															className="absolute -top-2 -right-2 w-6 h-6 md:w-5 md:h-5 md:-top-1.5 md:-right-1.5 bg-tangerine-dream-500 border-2 border-white rounded-full flex items-center justify-center shadow-xs z-10"
															title={t(
																"booking:watching",
																"You are watching this session",
															)}
														>
															<Eye className="w-3 h-3 md:w-2.5 md:h-2.5 fill-white text-white" />
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
});
