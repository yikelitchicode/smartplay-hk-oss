import { MapPin, Trophy } from "lucide-react";
import type React from "react";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";

interface VenueCardProps {
	venue: NormalizedVenue;
	onSessionClick: (session: NormalizedSession) => void;
}

const VenueCard: React.FC<VenueCardProps> = ({ venue, onSessionClick }) => {
	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
			{/* Venue Header */}
			<div className="flex flex-col md:flex-row">
				{/* Image Section */}
				<div className="w-full md:w-48 h-48 md:h-auto relative shrink-0 bg-gray-100">
					<img
						src={venue.imageUrl}
						alt={venue.name}
						className="w-full h-full object-cover"
						loading="lazy"
					/>
					<div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
						<MapPin size={12} />
						{venue.districtName}
					</div>
				</div>

				{/* Content Section */}
				<div className="p-5 flex-1 min-w-0">
					<h3 className="text-xl font-bold text-gray-900 mb-1 truncate">
						{venue.name}
					</h3>

					<div className="mt-4 space-y-6">
						{Object.keys(venue.facilities).map((facKey) => {
							const facility = venue.facilities[facKey];
							if (facility.sessions.length === 0) return null;

							return (
								<div key={facKey} className="space-y-3">
									<div className="flex items-center gap-2 text-sm font-semibold text-primary-800 bg-pacific-blue-50 px-3 py-1.5 rounded-lg w-fit">
										<Trophy size={14} className="text-primary" />
										{facility.name}
									</div>

									<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
										{facility.sessions.map((session) => (
											<button
												key={session.id}
												type="button"
												disabled={!session.available}
												onClick={() => onSessionClick(session)}
												className={`
                          relative group flex flex-col items-center justify-center p-2 rounded-lg text-sm font-medium border transition-all
                          ${
														session.available
															? "bg-white border-pacific-blue-200 text-primary-700 hover:bg-primary hover:text-white hover:border-primary shadow-sm"
															: "bg-porcelain-50 border-porcelain-100 text-porcelain-300 cursor-not-allowed"
													}
                        `}
											>
												<span className="text-xs mb-0.5">
													{session.startTime}
												</span>
												{session.peakHour && session.available && (
													<span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
														<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vanilla-custard-400 opacity-75"></span>
														<span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
													</span>
												)}
												{!session.available && (
													<span className="absolute inset-0 flex items-center justify-center bg-porcelain-50/50 rounded-lg">
														<span className="sr-only">Booked</span>
													</span>
												)}
											</button>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

export default VenueCard;
