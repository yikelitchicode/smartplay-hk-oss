import { useCallback, useEffect, useMemo, useState } from "react";
import { getWatchers } from "@/server-functions/watch/watcher";

export function useWatcherSync() {
	const [liveWatcherIds, setLiveWatcherIds] = useState<Set<string>>(new Set());

	const watchedSessionIds = useMemo(() => {
		return new Set(liveWatcherIds);
	}, [liveWatcherIds]);

	const fetchWatchers = useCallback(async () => {
		try {
			const liveRes = await getWatchers({ data: {} });

			if (liveRes?.success && liveRes.data) {
				const ids = new Set(
					liveRes.data
						.map((w) => w.targetSessionId)
						.filter((id): id is string => id !== null),
				);
				setLiveWatcherIds(ids);
			}
		} catch (error) {
			console.error("Failed to fetch watchers:", error);
		}
	}, []);

	useEffect(() => {
		fetchWatchers();
		const handleFocus = () => fetchWatchers();
		window.addEventListener("focus", handleFocus);
		return () => window.removeEventListener("focus", handleFocus);
	}, [fetchWatchers]);

	return { watchedSessionIds, fetchWatchers };
}
