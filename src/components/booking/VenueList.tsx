import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { VenueCard, VenueListSkeleton } from "@/components/booking";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";

interface VenueListProps {
	venues: NormalizedVenue[];
	isLoading: boolean;
	onSessionClick: (venue: NormalizedVenue, session: NormalizedSession) => void;
	onWatchClick: (venue: NormalizedVenue, session: NormalizedSession) => void;
	watchedSessionIds: Set<string>;
}

export function VenueList({
	venues,
	isLoading,
	onSessionClick,
	onWatchClick,
	watchedSessionIds,
}: VenueListProps) {
	const { t } = useTranslation(["booking"]);

	if (isLoading) {
		return <VenueListSkeleton />;
	}

	if (venues.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-gray-400">
				<div className="mb-4 opacity-50">
					<CalendarDays size={48} />
				</div>
				<p className="text-lg font-medium">{t("booking:no_venues")}</p>
				<p className="text-sm">{t("booking:no_venues_hint")}</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-6">
			{venues.map((venue) => (
				<VenueCard
					key={venue.id}
					venue={venue}
					onSessionClick={onSessionClick}
					onWatchClick={onWatchClick}
					watchedSessionIds={watchedSessionIds}
				/>
			))}
		</div>
	);
}
