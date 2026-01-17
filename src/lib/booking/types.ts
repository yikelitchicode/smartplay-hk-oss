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
	facilityId: string; // Facility code (e.g., "TENC", "BASC")
}

export interface NormalizedFacility {
	name: string;
	nameEn?: string | null;
	nameTc?: string | null;
	nameSc?: string | null;
	code: string;
	sessions: NormalizedSession[];
	priceType: PriceType;
}

export interface NormalizedVenue {
	id: string;
	name: string;
	nameEn?: string | null;
	nameTc?: string | null;
	nameSc?: string | null;
	districtCode: string;
	districtName: string;
	districtNameEn?: string | null;
	districtNameTc?: string | null;
	districtNameSc?: string | null;
	region: RegionType;
	imageUrl: string;
	distance?: number; // Distance in km from user location
	facilities: {
		[key: string]: NormalizedFacility;
	};
}

export type TimeFilter = "all" | "morning" | "afternoon" | "evening";

export interface FacilityGroup {
	label: string;
	value: string; // Group code
	options: { label: string; value: string }[];
}
