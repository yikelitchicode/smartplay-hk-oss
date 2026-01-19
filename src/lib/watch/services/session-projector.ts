import { addDays, format, getDay } from "date-fns";
import { prisma as db } from "@/db";

export interface ProjectedSession {
	id: string; // Virtual ID: `projected:${venueId}:${facilityCode}:${date}:${startTime}`
	venueId: string;
	facilityCode: string;
	date: string;
	startTime: string;
	endTime: string;
	dayOfWeek: number;
	dataSource: "projected";
	referenceSessionId?: string; // The live session this was projected from
	priceType: "Paid" | "Free";
	available: boolean;
}

interface SessionRecord {
	id: string;
	venueId: string;
	facilityCode: string;
	startTime: string;
	endTime: string;
	date: Date;
	available: boolean;
	facilityType: {
		isFree: boolean;
	};
}

export class SessionProjector {
	/**
	 * Project sessions for a specific venue/facility for a future date range
	 *
	 * @param venueId - Target venue ID
	 * @param facilityCode - Target facility code
	 * @param startDay - Start day offset from today (default 9)
	 * @param endDay - End day offset from today (default 28)
	 */
	async projectSessions(
		venueId: string,
		facilityCode: string,
		startDay: number = 9,
		endDay: number = 28,
	): Promise<ProjectedSession[]> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const startDate = addDays(today, startDay);
		const endDate = addDays(today, endDay);

		// Calculate needed weekdays
		const weekdaysNeeded = new Set<number>();
		let currentDate = startDate;
		while (currentDate <= endDate) {
			weekdaysNeeded.add(getDay(currentDate));
			currentDate = addDays(currentDate, 1);
		}

		const referenceSessionsByWeekday = await this.fetchReferenceSessions(
			venueId,
			facilityCode,
			Array.from(weekdaysNeeded),
		);

		const projectedSessions: ProjectedSession[] = [];

		currentDate = startDate;
		while (currentDate <= endDate) {
			const dayOfWeek = getDay(currentDate);
			const refSessions = referenceSessionsByWeekday.get(dayOfWeek) || [];

			for (const ref of refSessions) {
				projectedSessions.push(this.mapToProjected(ref, currentDate));
			}

			currentDate = addDays(currentDate, 1);
		}

		return projectedSessions;
	}

	/**
	 * Fetch reference sessions grouping by weekday
	 */
	private async fetchReferenceSessions(
		venueId: string,
		facilityCode: string,
		weekdays: number[],
	): Promise<Map<number, SessionRecord[]>> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const windowEnd = addDays(today, 8); // Look at next 8 days of live data

		// Fetch all sessions in the live window for this facility
		const sessions = (await db.session.findMany({
			where: {
				venueId,
				facilityCode,
				date: {
					gte: today,
					lte: windowEnd,
				},
			},
			select: {
				id: true,
				venueId: true,
				facilityCode: true,
				startTime: true,
				endTime: true,
				date: true,
				available: true,
				facilityType: {
					select: {
						isFree: true,
					},
				},
			},
		})) as SessionRecord[];

		const sessionsByWeekday = new Map<number, SessionRecord[]>();

		for (const session of sessions) {
			const day = getDay(session.date);
			if (!weekdays.includes(day)) continue;

			if (!sessionsByWeekday.has(day)) {
				sessionsByWeekday.set(day, []);
			}

			const daySessions = sessionsByWeekday.get(day) || [];
			// unique check based on start time
			if (!daySessions.find((s) => s.startTime === session.startTime)) {
				daySessions.push(session);
			}
		}

		return sessionsByWeekday;
	}

	private mapToProjected(
		refSession: SessionRecord,
		targetDate: Date,
	): ProjectedSession {
		const dateStr = format(targetDate, "yyyy-MM-dd");
		return {
			id: `projected:${refSession.venueId}:${refSession.facilityCode}:${dateStr}:${refSession.startTime}`,
			venueId: refSession.venueId,
			facilityCode: refSession.facilityCode,
			date: dateStr, // Return as string for frontend compatibility
			startTime: refSession.startTime,
			endTime: refSession.endTime,
			dayOfWeek: getDay(targetDate),
			dataSource: "projected",
			referenceSessionId: refSession.id,
			available: false, // Default to false/unavailable for projection
			priceType: refSession.facilityType?.isFree ? "Free" : "Paid",
		};
	}
}
