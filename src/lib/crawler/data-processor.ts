/**
 * Data processor for transforming API responses into database entities
 */

import type {
	FacilityApiResponse,
	FacilityInsert,
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
			for (const district of periodData.distList) {
				// Process venues
				for (const venue of district.venueList) {
					// Process facility types
					for (const facilityType of venue.fatList) {
						// Process sessions
						for (const session of facilityType.sessionList) {
							processedData.push({
								crawlJobId,
								timestamp: response.timestamp,

								// District
								districtCode: district.distCode,
								districtName: district.distName,

								// Venue
								venueId: venue.venueId,
								venueName: venue.venueName,
								venueImageUrl: venue.venueImageUrl,

								// Facility Type
								facilityTypeId: facilityType.fatId,
								facilityTypeName: facilityType.fatName,
								facilityTypeNameEn: facilityType.enFatName,
								facilityCode: facilityType.faCode,
								facilityGroupCode: facilityType.faGroupCode,
								facilityVRId: facilityType.fvrId,

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

		console.log(`Processed ${processedData.length} sessions from API response`);

		return processedData;
	}

	/**
	 * Convert processed data to database entities
	 */
	toDatabaseEntities(processedData: ProcessedFacilityData[]): {
		facilities: FacilityInsert[];
		sessions: SessionInsert[];
	} {
		const facilitiesMap = new Map<number, FacilityInsert>();
		const sessions: SessionInsert[] = [];

		// Group unique facilities and create sessions
		for (const data of processedData) {
			// Group facilities (avoid duplicates)
			if (!facilitiesMap.has(data.venueId)) {
				facilitiesMap.set(data.venueId, {
					id: data.venueId,
					name: data.venueName,
					imageUrl: data.venueImageUrl,
					districtCode: data.districtCode,
					districtName: data.districtName,
					lastCrawlAt: new Date(),
				});
			}

			// Create session record
			const session: SessionInsert = {
				id: this.generateSessionId(data),
				crawlJobId: data.crawlJobId,
				venueId: data.venueId,
				facilityTypeId: data.facilityTypeId,
				facilityTypeName: data.facilityTypeName,
				facilityTypeNameEn: data.facilityTypeNameEn,
				facilityCode: data.facilityCode,
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

			sessions.push(session);
		}

		console.log(
			`Prepared ${facilitiesMap.size} facilities and ${sessions.length} sessions`,
		);

		return {
			facilities: Array.from(facilitiesMap.values()),
			sessions,
		};
	}

	/**
	 * Generate unique session ID
	 * Creates consistent hash-based ID from unique identifiers
	 */
	private generateSessionId(data: ProcessedFacilityData): string {
		// Create a unique string from all relevant fields
		const uniqueString = `${data.venueId}-${data.facilityTypeId}-${data.sessionStartDate}-${data.startTime}`;

		// Simple hash function to generate consistent ID
		let hash = 0;
		for (let i = 0; i < uniqueString.length; i++) {
			const char = uniqueString.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}

		// Convert to base64 and limit length
		return Buffer.from(Math.abs(hash).toString())
			.toString("base64")
			.substring(0, 32);
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
		const uniqueVenues = new Set<number>();
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
