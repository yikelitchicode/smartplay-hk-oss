export type PriceType = "Paid" | "Free";
export type RegionType = "Hong Kong Island" | "Kowloon" | "New Territories";

export interface NormalizedSession {
	id: string; // Unique combination of date-venue-time
	startTime: string;
	endTime: string;
	date: string;
	available: boolean;
	isPassed: boolean;
	peakHour: boolean;
	facilityName: string;
	facilityId: number;
}

export interface NormalizedFacility {
	name: string;
	code: string;
	sessions: NormalizedSession[];
	priceType: PriceType;
}

export interface NormalizedVenue {
	id: string;
	name: string;
	districtCode: string;
	districtName: string;
	region: RegionType;
	imageUrl: string;
	facilities: {
		[key: string]: NormalizedFacility;
	};
}

export type TimeFilter = "all" | "morning" | "afternoon" | "evening";

export interface FacilityGroup {
	label: string;
	options: { label: string; value: string }[];
}
