import { prisma } from "@/db";
import type { PriceType } from "@/lib/booking/types";
import { healthChecker } from "@/lib/health";
import type { DatabaseErrorType } from "@/lib/health/types";
import {
	classifyDatabaseError,
	withDbErrorHandling,
} from "@/lib/server-utils/error-handler";

/**
 * Get pre-computed stats for a specific date
 */
export async function getPrecomputedStatsService(
	date: string,
	priceType: PriceType,
	_facilityCode?: string,
): Promise<{
	dateStats: Record<string, { t: number; a: number }>;
	districtStats: Record<string, { t: number; a: number }>;
	centerStats: Record<string, { t: number; a: number }>;
	facilityStats: Record<string, { t: number; a: number }>;
}> {
	try {
		await healthChecker.checkOrThrow();

		return await withDbErrorHandling(
			async () => {
				const targetDate = new Date(date);

				// If facilityCode is provided, filter to only stats for that facility
				// This is used to compute district/center styling based on selected facility
				const whereClause: {
					date: Date;
					priceType: PriceType;
					entityCode?: string;
				} = {
					date: targetDate,
					priceType: priceType,
				};

				const stats = await prisma.availabilityStats.findMany({
					where: whereClause,
				});

				// If facilityCode filter is active, we need to compute dist/center stats differently:
				// We can only use the pre-aggregated stats if no facility filter is applied.
				// When facilityCode is set, the frontend will rely on the `hasData` flag
				// from bookingData instead, which is already filter-aware.
				// So we return the base stats and let the frontend merge with hasData.

				const districtStats: Record<string, { t: number; a: number }> = {};
				const centerStats: Record<string, { t: number; a: number }> = {};
				const facilityStats: Record<string, { t: number; a: number }> = {};
				const dateStats: Record<string, { t: number; a: number }> = {};

				for (const s of stats) {
					const data = { t: s.totalSessions, a: s.availableSessions };

					if (s.entityType === "DISTRICT") {
						districtStats[s.entityCode] = data;
					} else if (s.entityType === "CENTER") {
						centerStats[s.entityCode] = data;
					} else if (s.entityType === "FACILITY") {
						facilityStats[s.entityCode] = data;
					} else if (s.entityType === "DATE") {
						dateStats[s.entityCode] = data;
					}
				}

				return {
					dateStats,
					districtStats,
					centerStats,
					facilityStats,
				};
			},
			{ operationName: "fetch precomputed stats" },
		);
	} catch (error) {
		const errorType = classifyDatabaseError(error);
		if (errorType === ("CONNECTION_FAILED" as DatabaseErrorType)) {
			console.warn("Database unavailable in getPrecomputedStatsService");
			return {
				dateStats: {},
				districtStats: {},
				centerStats: {},
				facilityStats: {},
			};
		}
		throw error;
	}
}

/**
 * Get calendar stats for a date range (next 14 days)
 */
export async function getCalendarStatsService(
	priceType: PriceType,
): Promise<Record<string, { t: number; a: number }>> {
	try {
		await healthChecker.checkOrThrow();

		return await withDbErrorHandling(
			async () => {
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				const endDate = new Date(today);
				endDate.setDate(endDate.getDate() + 14);

				const stats = await prisma.availabilityStats.findMany({
					where: {
						entityType: "DATE",
						date: {
							gte: today,
							lte: endDate,
						},
						priceType: priceType,
					},
					orderBy: {
						date: "asc",
					},
				});

				const result: Record<string, { t: number; a: number }> = {};

				for (const s of stats) {
					result[s.entityCode] = { t: s.totalSessions, a: s.availableSessions };
				}

				return result;
			},
			{ operationName: "fetch calendar stats" },
		);
	} catch (error) {
		const errorType = classifyDatabaseError(error);
		if (errorType === ("CONNECTION_FAILED" as DatabaseErrorType)) {
			console.warn("Database unavailable in getCalendarStatsService");
			return {};
		}
		throw error;
	}
}
