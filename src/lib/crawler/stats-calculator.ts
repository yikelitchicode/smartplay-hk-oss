import { prisma } from "../../db";
import { Prisma } from "../../generated/prisma/client";
import { serverLogger } from "../logger";

/**
 * Calculate and upsert availability statistics for one or more dates.
 * This should be called after a crawling job completes to keep stats fresh.
 *
 * Accepts a single date string or an array of date strings for batch processing.
 *
 * @param dates YYYY-MM-DD date string(s)
 */
export async function calculateAndUpsertStats(
	dates: string | string[],
): Promise<void> {
	const dateArray = Array.isArray(dates) ? dates : [dates];
	if (dateArray.length === 0) return;

	serverLogger.info(
		`📊 Calculating stats for ${dateArray.length} date(s): ${dateArray.length <= 3 ? dateArray.join(", ") : `${dateArray[0]} ... ${dateArray[dateArray.length - 1]}`}`,
	);

	for (const date of dateArray) {
		// Use the date string directly in SQL with DATE cast to avoid timezone issues
		// Don't convert to JS Date object as it causes timezone shifts
		await processStatsForPriceType(date, "Paid");
		await processStatsForPriceType(date, "Free");
	}
}

async function processStatsForPriceType(
	dateStr: string,
	priceType: "Paid" | "Free",
): Promise<void> {
	const isFree = priceType === "Free";

	// Use a single raw SQL query with UNION ALL to get all aggregation levels at once
	// Then bulk insert with ON CONFLICT DO UPDATE
	// This reduces ~600 round-trips to just 2 (query + bulk insert)

	type AggRow = {
		entity_type: string;
		code: string;
		total: bigint;
		available: bigint;
	};

	// Use separate queries for Paid vs Free to avoid Prisma template interpolation issues
	// Logic matches frontend getFacilityDetails(): Free if code starts with NF or name contains "free"
	// NOTE: Using dateStr::DATE to avoid JS Date timezone conversion issues

	let allStats: AggRow[];

	if (isFree) {
		// Free facilities: code starts with NF or name contains "free"
		allStats = await prisma.$queryRaw<AggRow[]>`
			SELECT 'DATE' as entity_type, ${dateStr} as code,
				COUNT(*)::bigint as total,
				SUM(CASE WHEN s."available" = true THEN 1 ELSE 0 END)::bigint as available
			FROM "Session" s
			WHERE s."date"::DATE = ${dateStr}::DATE
				AND (s."facilityCode" LIKE 'NF%' OR LOWER(s."facilityTypeNameEn") LIKE '%free%')
			
			UNION ALL
			
			SELECT 'DISTRICT' as entity_type, f."districtCode" as code,
				COUNT(*)::bigint as total,
				SUM(CASE WHEN s."available" = true THEN 1 ELSE 0 END)::bigint as available
			FROM "Session" s
			JOIN "Facility" f ON s."venueId" = f."id"
			WHERE s."date"::DATE = ${dateStr}::DATE
				AND (s."facilityCode" LIKE 'NF%' OR LOWER(s."facilityTypeNameEn") LIKE '%free%')
			GROUP BY f."districtCode"
			
			UNION ALL
			
			SELECT 'CENTER' as entity_type, s."venueId" as code,
				COUNT(*)::bigint as total,
				SUM(CASE WHEN s."available" = true THEN 1 ELSE 0 END)::bigint as available
			FROM "Session" s
			WHERE s."date"::DATE = ${dateStr}::DATE
				AND (s."facilityCode" LIKE 'NF%' OR LOWER(s."facilityTypeNameEn") LIKE '%free%')
			GROUP BY s."venueId"
			
			UNION ALL
			
			SELECT 'FACILITY' as entity_type, s."facilityCode" as code,
				COUNT(*)::bigint as total,
				SUM(CASE WHEN s."available" = true THEN 1 ELSE 0 END)::bigint as available
			FROM "Session" s
			WHERE s."date"::DATE = ${dateStr}::DATE
				AND (s."facilityCode" LIKE 'NF%' OR LOWER(s."facilityTypeNameEn") LIKE '%free%')
			GROUP BY s."facilityCode"
		`;
	} else {
		// Paid facilities: NOT (code starts with NF or name contains "free")
		allStats = await prisma.$queryRaw<AggRow[]>`
			SELECT 'DATE' as entity_type, ${dateStr} as code,
				COUNT(*)::bigint as total,
				SUM(CASE WHEN s."available" = true THEN 1 ELSE 0 END)::bigint as available
			FROM "Session" s
			WHERE s."date"::DATE = ${dateStr}::DATE
				AND NOT (s."facilityCode" LIKE 'NF%' OR LOWER(s."facilityTypeNameEn") LIKE '%free%')
			
			UNION ALL
			
			SELECT 'DISTRICT' as entity_type, f."districtCode" as code,
				COUNT(*)::bigint as total,
				SUM(CASE WHEN s."available" = true THEN 1 ELSE 0 END)::bigint as available
			FROM "Session" s
			JOIN "Facility" f ON s."venueId" = f."id"
			WHERE s."date"::DATE = ${dateStr}::DATE
				AND NOT (s."facilityCode" LIKE 'NF%' OR LOWER(s."facilityTypeNameEn") LIKE '%free%')
			GROUP BY f."districtCode"
			
			UNION ALL
			
			SELECT 'CENTER' as entity_type, s."venueId" as code,
				COUNT(*)::bigint as total,
				SUM(CASE WHEN s."available" = true THEN 1 ELSE 0 END)::bigint as available
			FROM "Session" s
			WHERE s."date"::DATE = ${dateStr}::DATE
				AND NOT (s."facilityCode" LIKE 'NF%' OR LOWER(s."facilityTypeNameEn") LIKE '%free%')
			GROUP BY s."venueId"
			
			UNION ALL
			
			SELECT 'FACILITY' as entity_type, s."facilityCode" as code,
				COUNT(*)::bigint as total,
				SUM(CASE WHEN s."available" = true THEN 1 ELSE 0 END)::bigint as available
			FROM "Session" s
			WHERE s."date"::DATE = ${dateStr}::DATE
				AND NOT (s."facilityCode" LIKE 'NF%' OR LOWER(s."facilityTypeNameEn") LIKE '%free%')
			GROUP BY s."facilityCode"
		`;
	}

	if (allStats.length === 0) {
		serverLogger.debug(`No sessions found for ${dateStr} (${priceType})`);
		return;
	}

	// Build bulk VALUES for insert
	// Format: (id, entityType, entityCode, date, priceType, totalSessions, availableSessions, updatedAt)
	// Note: Raw SQL INSERT bypasses Prisma's @default(cuid()), so we generate IDs with gen_random_uuid()
	const now = new Date();

	// Batch all inserts in a single ON CONFLICT statement
	// Use dateStr::DATE for proper date insertion
	await prisma.$executeRaw`
		INSERT INTO "AvailabilityStats" ("id", "entityType", "entityCode", "date", "priceType", "totalSessions", "availableSessions", "updatedAt")
		SELECT * FROM (
			VALUES ${Prisma.join(
				allStats.map(
					(row) =>
						Prisma.sql`(gen_random_uuid()::text, ${row.entity_type}::"StatsEntityType", ${row.code}, ${dateStr}::DATE, ${priceType}, ${Number(row.total)}::int, ${Number(row.available)}::int, ${now}::timestamp)`,
				),
			)}
		) AS t("id", "entityType", "entityCode", "date", "priceType", "totalSessions", "availableSessions", "updatedAt")
		ON CONFLICT ("entityType", "entityCode", "date", "priceType") 
		DO UPDATE SET 
			"totalSessions" = EXCLUDED."totalSessions",
			"availableSessions" = EXCLUDED."availableSessions",
			"updatedAt" = EXCLUDED."updatedAt"
	`;

	serverLogger.debug(
		`Stats updated for ${dateStr} (${priceType}): ${allStats.length} records in single bulk operation`,
	);
}
