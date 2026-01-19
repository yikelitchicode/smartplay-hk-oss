import { useEffect, useState } from "react";
import type {
	ServerError,
	ServerSuccess,
} from "@/lib/server-utils/error-handler";
import type { ProjectedSession } from "@/lib/watch/services/session-projector";
import { getProjectedSessions } from "@/server-functions/booking/projected-sessions";
import type { BookingDataPaginatedResult } from "@/services/booking.service";

interface UseProjectedSessionsParams {
	activeTab: "live" | "future";
	selectedDate: string;
	deferredCenter: string;
	deferredFacility: string;
	bookingData:
		| ServerError
		| ServerSuccess<BookingDataPaginatedResult>
		| undefined;
}

export function useProjectedSessions({
	activeTab,
	selectedDate,
	deferredCenter,
	deferredFacility,
	bookingData,
}: UseProjectedSessionsParams) {
	const [projectedSessions, setProjectedSessions] = useState<
		ProjectedSession[]
	>([]);
	const [isLoadingProjected, setIsLoadingProjected] = useState(false);

	useEffect(() => {
		if (activeTab !== "future") return;

		const fetchProjected = async () => {
			setIsLoadingProjected(true);
			try {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const targetDate = new Date(selectedDate);
				targetDate.setHours(0, 0, 0, 0);

				const diffTime = targetDate.getTime() - today.getTime();
				const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
				const dayOffset = Math.max(8, Math.min(60, diffDays));

				if (deferredCenter !== "All" && deferredFacility !== "All") {
					const res = await getProjectedSessions({
						data: {
							venueId: deferredCenter,
							facilityCode: deferredFacility,
							startDay: dayOffset,
							endDay: dayOffset,
						},
					});

					if (res.success && res.data) {
						setProjectedSessions(res.data);
					} else {
						setProjectedSessions([]);
					}
				} else {
					if (bookingData?.success && bookingData.data?.venues) {
						const visibleVenues = bookingData.data.venues;
						const targets: { venueId: string; facilityCode: string }[] = [];

						visibleVenues.forEach((venue) => {
							const facilitiesToFetch =
								deferredFacility !== "All"
									? [deferredFacility]
									: Object.keys(venue.facilities);

							facilitiesToFetch.forEach((code) => {
								targets.push({ venueId: venue.id, facilityCode: code });
							});
						});

						const uniqueTargets = targets.slice(0, 20);

						if (uniqueTargets.length === 0) {
							setProjectedSessions([]);
						} else {
							const results = await Promise.all(
								uniqueTargets.map((target) =>
									getProjectedSessions({
										data: {
											venueId: target.venueId,
											facilityCode: target.facilityCode,
											startDay: dayOffset,
											endDay: dayOffset,
										},
									})
										.then((res) => (res.success ? res.data : []))
										.catch(() => []),
								),
							);

							const allSessions = results.flat().filter((s) => !!s);
							const filteredSessions = allSessions.filter(
								(s) => String(s.date) === selectedDate,
							);
							setProjectedSessions(filteredSessions as ProjectedSession[]);
						}
					}
				}
			} catch (err) {
				console.error("Failed to fetch projected sessions", err);
			} finally {
				setIsLoadingProjected(false);
			}
		};

		fetchProjected();
	}, [activeTab, deferredCenter, deferredFacility, bookingData, selectedDate]);

	return { projectedSessions, isLoadingProjected };
}
