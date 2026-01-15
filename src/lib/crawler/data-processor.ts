/**
 * Data processor for transforming API responses into database entities
 */

import { sify } from "chinese-conv";
import { DISTRICT_REGIONS, type DistrictCode } from "./config";
import type {
	DistrictInsert,
	FacilityApiResponse,
	FacilityInsert,
	FacilityTypeInsert,
	ProcessedFacilityData,
	SessionInsert,
} from "./types";
import { CrawlerProcessingError } from "./types";

export class CrawlerDataProcessor {
	/**
	 * Process raw API response into flat structure
	 */
	processRawResponse(
		response: FacilityApiResponse,
		crawlJobId: string,
		targetLang?: string,
	): ProcessedFacilityData[] {
		// Validate response
		if (response.code !== "0") {
			throw new CrawlerProcessingError(
				`API returned error code: ${response.code} - ${response.message}`,
				{ response },
			);
		}

		const { data } = response;
		const processedData: ProcessedFacilityData[] = [];

		// Process each time period (morning, afternoon, evening)
		const timePeriods = ["morning", "afternoon", "evening"] as const;

		for (const period of timePeriods) {
			const periodData = data[period];
			if (!periodData) {
				console.warn(`No data for period: ${period}`);
				continue;
			}

			// Process districts
			if (!periodData.distList || !Array.isArray(periodData.distList)) continue;
			for (const district of periodData.distList) {
				// Process venues
				if (!district.venueList || !Array.isArray(district.venueList)) continue;
				for (const venue of district.venueList) {
					// Process facility types
					if (!venue.fatList || !Array.isArray(venue.fatList)) continue;
					for (const facilityType of venue.fatList) {
						// Process sessions
						if (
							!facilityType.sessionList ||
							!Array.isArray(facilityType.sessionList)
						)
							continue;
						for (const session of facilityType.sessionList) {
							const isEn = targetLang === "en" || !facilityType.fatName;
							processedData.push({
								crawlJobId,
								timestamp: response.timestamp,
								lang: isEn ? "en" : "zh",

								// District
								districtCode: district.distCode,
								districtName: district.distName,
								districtNameTc: isEn ? undefined : district.distName,
								districtNameSc: isEn ? undefined : sify(district.distName),

								// Venue
								venueId: String(venue.venueId),
								venueName: venue.venueName,
								venueNameEn: venue.enVenueName,
								venueNameTc: isEn ? undefined : venue.venueName,
								venueNameSc: isEn ? undefined : sify(venue.venueName),
								venueImageUrl: venue.venueImageUrl,

								// Facility Type
								facilityTypeId: facilityType.fatId,
								facilityTypeName: facilityType.fatName,
								facilityTypeNameEn: facilityType.enFatName,
								facilityTypeNameTc: isEn ? undefined : facilityType.fatName,
								facilityTypeNameSc: isEn
									? undefined
									: sify(facilityType.fatName),
								facilityCode: facilityType.faCode,
								facilityGroupCode: facilityType.faGroupCode,
								facilityVRId: String(facilityType.fvrId),

								// Session
								sessionStartDate: session.ssnStartDate,
								startTime: session.ssnStartTime,
								endTime: session.ssnEndTime,
								available: session.available,
								isPeakHour: session.peakHour,
								isOpen: facilityType.openFlag,

								// Metadata
								timePeriod: period,
							});
						}
					}
				}
			}
		}

		// Cross-populate names based on language
		for (const data of processedData) {
			if (data.lang === "en") {
				data.venueNameEn = data.venueName;
				data.districtNameEn = data.districtName;
				// In EN response, we don't have ZH name, so we keep it as is
				// Database upsert logic will handle COALESCE to avoid overwriting ZH with EN
			}
		}

		return processedData;
	}

	/**
	 * Convert processed data to database entities
	 */
	toDatabaseEntities(processedData: ProcessedFacilityData[]): {
		facilities: FacilityInsert[];
		sessions: SessionInsert[];
		districts: DistrictInsert[];
		facilityTypes: FacilityTypeInsert[];
	} {
		const facilitiesMap = new Map<string, FacilityInsert>();
		const sessionsMap = new Map<string, SessionInsert>();
		const districtsMap = new Map<string, DistrictInsert>();

		// Group unique facilities and create sessions
		for (const data of processedData) {
			// Extract District
			if (!districtsMap.has(data.districtCode)) {
				districtsMap.set(data.districtCode, {
					code: data.districtCode,
					name: data.districtName,
					nameEn: data.districtNameEn,
					nameTc: data.districtNameTc,
					nameSc: data.districtNameSc,
					region: DISTRICT_REGIONS[data.districtCode as DistrictCode],
				});
			} else if (data.districtNameEn) {
				// Update with names if found later
				const existing = districtsMap.get(data.districtCode);
				if (existing) {
					if (data.districtNameEn) existing.nameEn = data.districtNameEn;
					if (data.districtNameTc) existing.nameTc = data.districtNameTc;
					if (data.districtNameSc) existing.nameSc = data.districtNameSc;
				}
			}

			// Extract FacilityType - REMOVED: Managed by Metadata Sync
			// We assume FacilityTypes are already populated by metadata-crawler.

			// Group facilities (avoid duplicates)
			if (!facilitiesMap.has(data.venueId)) {
				facilitiesMap.set(data.venueId, {
					id: data.venueId,
					name: data.venueName,
					nameEn: data.venueNameEn,
					nameTc: data.venueNameTc,
					nameSc: data.venueNameSc,
					imageUrl: data.venueImageUrl,
					districtCode: data.districtCode,
					districtName: data.districtName,
					districtNameEn: data.lang === "en" ? data.districtName : undefined,
					districtNameTc: data.districtNameTc,
					districtNameSc: data.districtNameSc,
					lastCrawlAt: new Date(),
				});
			}

			// Create session record
			const session: SessionInsert = {
				id: this.generateSessionId(data),
				crawlJobId: data.crawlJobId,
				venueId: data.venueId,
				facilityCode: data.facilityCode,
				facilityTypeName: data.facilityTypeName || data.facilityTypeNameEn, // Fallback if ZH missing
				facilityTypeNameEn: data.facilityTypeNameEn,
				facilityTypeNameTc: data.facilityTypeNameTc,
				facilityTypeNameSc: data.facilityTypeNameSc,
				facilityVRId: data.facilityVRId,
				date: new Date(data.sessionStartDate),
				startTime: data.startTime,
				endTime: data.endTime,
				timePeriod: this.mapTimePeriod(data.timePeriod),
				available: data.available,
				isPeakHour: data.isPeakHour,
				isOpen: data.isOpen,
				createdAt: new Date(),
			};

			// Deduplicate sessions based on unique constraint fields
			// Constraint: [venueId, facilityCode, date, startTime]
			const sessionKey = `${data.venueId}-${data.facilityCode}-${data.sessionStartDate}-${data.startTime}`;
			if (!sessionsMap.has(sessionKey)) {
				sessionsMap.set(sessionKey, session);
			}
		}

		console.log(
			`Prepared ${facilitiesMap.size} facilities, ${districtsMap.size} districts, and ${sessionsMap.size} sessions`,
		);

		return {
			facilities: Array.from(facilitiesMap.values()),
			sessions: Array.from(sessionsMap.values()),
			districts: Array.from(districtsMap.values()),
			facilityTypes: [], // No longer inserting facility types here
		};
	}

	/**
	 * Generate unique session ID
	 * Creates consistent hash-based ID from unique identifiers
	 */
	private generateSessionId(data: ProcessedFacilityData): string {
		// Create a unique string from all relevant fields
		// Format: venueId-fatId-date-time
		// Example: 100-302-20250114-1430
		const dateStr = data.sessionStartDate.replace(/-/g, "");
		const timeStr = data.startTime.replace(/:/g, "");
		return `${data.venueId}-${data.facilityTypeId}-${dateStr}-${timeStr}`;
	}

	/**
	 * Map time period string to enum value
	 */
	private mapTimePeriod(
		period: "morning" | "afternoon" | "evening",
	): "MORNING" | "AFTERNOON" | "EVENING" {
		const mapping = {
			morning: "MORNING",
			afternoon: "AFTERNOON",
			evening: "EVENING",
		} as const;

		return mapping[period];
	}

	/**
	 * Extract summary statistics from processed data
	 */
	extractSummary(processedData: ProcessedFacilityData[]): {
		totalVenues: number;
		totalSessions: number;
		availableSessions: number;
		districtBreakdown: Record<string, number>;
		periodBreakdown: Record<string, number>;
	} {
		const uniqueVenues = new Set<string>();
		let availableSessions = 0;
		const districtBreakdown: Record<string, number> = {};

		const periodBreakdown: Record<string, number> = {};
		for (const data of processedData) {
			uniqueVenues.add(data.venueId);

			if (data.available) {
				availableSessions++;
			}

			// Count by district
			districtBreakdown[data.districtCode] =
				(districtBreakdown[data.districtCode] || 0) + 1;

			// Count by period
			periodBreakdown[data.timePeriod] =
				(periodBreakdown[data.timePeriod] || 0) + 1;
		}

		return {
			totalVenues: uniqueVenues.size,
			totalSessions: processedData.length,
			availableSessions,
			districtBreakdown,
			periodBreakdown,
		};
	}
}
