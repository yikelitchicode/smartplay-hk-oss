/**
 * Type definitions for SmartPlay LCSD API responses
 */

export interface FacilityApiResponse {
	code: string;
	message: string;
	data: FacilityData;
	timestamp: number;
}

export interface FacilityData {
	morning: TimePeriodData;
	afternoon: TimePeriodData;
	evening: TimePeriodData;
	venueCountList: VenueCountInfo[];
}

export interface TimePeriodData {
	distList: DistrictData[];
	venueCount: number;
}

export interface DistrictData {
	distCode: string;
	sessionCount: number;
	distName: string;
	venueList: VenueData[];
	seqNo: number;
}

export interface VenueData {
	venueName: string;
	venueId: number;
	venueImageUrl: string;
	sessionCount: number;
	fatList: FacilityTypeData[];
}

export interface FacilityTypeData {
	fatName: string;
	enFatName: string;
	fatId: number;
	sessionCount: number;
	faCode: string;
	faGroupCode: string;
	fvrId: number;
	sessionList: SessionData[];
	openFlag: boolean;
	fitness: boolean;
}

export interface SessionData {
	ssnStartTime: string;
	ssnEndTime: string;
	ssnStartDate: string;
	available: boolean;
	peakHour: boolean;
	sfadFlag: boolean;
	sessionCount: number;
}

export interface VenueCountInfo {
	playDate: string;
	count: number;
}

// Request parameters
export interface CrawlRequestParams {
	distCode: string; // Comma-separated: "CW,EN,SN,WCH"
	faCode: string[]; // Facility type codes: ["TENC", "NFTENC"]
	playDate: string; // Date: "YYYY-MM-DD"
}

// Internal processed data structure
export interface ProcessedFacilityData {
	crawlJobId: string;
	timestamp: number;

	// District
	districtCode: string;
	districtName: string;

	// Venue
	venueId: number;
	venueName: string;
	venueImageUrl: string;

	// Facility Type
	facilityTypeId: number;
	facilityTypeName: string;
	facilityTypeNameEn: string;
	facilityCode: string;
	facilityGroupCode: string;
	facilityVRId: number;

	// Session
	sessionStartDate: string;
	startTime: string;
	endTime: string;
	available: boolean;
	isPeakHour: boolean;
	isOpen: boolean;

	timePeriod: "morning" | "afternoon" | "evening";
}

// Database insert types
export interface FacilityInsert {
	id: number;
	name: string;
	imageUrl: string;
	districtCode: string;
	districtName: string;
	lastCrawlAt: Date;
}

export interface SessionInsert {
	id: string;
	crawlJobId: string;
	venueId: number;
	facilityTypeId: number;
	facilityTypeName: string;
	facilityTypeNameEn: string;
	facilityCode: string;
	facilityVRId: number;
	date: Date;
	startTime: string;
	endTime: string;
	timePeriod: "MORNING" | "AFTERNOON" | "EVENING";
	available: boolean;
	isPeakHour: boolean;
	isOpen: boolean;
	createdAt: Date;
}

// Crawler configuration
export interface CrawlerConfig {
	api: {
		baseUrl: string;
		endpoint: string;
		timeout: number;
		retryAttempts: number;
		retryDelay: number;
	};
	headers: {
		"User-Agent": string;
		Accept: string;
		"Accept-Language": string;
		channel: string;
		"Content-Type": string;
	};
	parameters: {
		distCode: string[];
		faCode: string[];
		playDate: string;
	};
	schedule: {
		enabled: boolean;
		interval: string;
		timezone: string;
	};
	processing: {
		skipDuplicates: boolean;
		flattenStructure: boolean;
		includeTimeSlots: boolean;
	};
}

// Error types
export class CrawlerHttpError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
		public url?: string,
	) {
		super(message);
		this.name = "CrawlerHttpError";
	}
}

export class CrawlerProcessingError extends Error {
	constructor(
		message: string,
		public context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "CrawlerProcessingError";
	}
}
