/**
 * Utility to construct SmartPlay booking deep links
 */

interface SmartPlayUrlParams {
	venueId: string;
	fatId: number | string;
	fvrId?: number | string;
	venueName: string;
	playDate: string;
	districtCode: string;
	sportCode: string; // faGroupCode
	typeCode: string; // faCode
	sessionIndex: number | string;
	dateIndex: number | string;
	isFree?: boolean;
}

const SMARTPLAY_BASE_URL =
	"https://www.smartplay.lcsd.gov.hk/facilities/select/court";

/**
 * Constructs the official SmartPlay deep link for a specific session.
 *
 * @param params - The parameters required to build the URL
 * @returns The fully constructed URL
 */
export function constructSmartPlayUrl(params: SmartPlayUrlParams): string {
	const {
		venueId,
		fatId,
		fvrId,
		venueName,
		playDate,
		districtCode,
		sportCode,
		typeCode,
		sessionIndex,
		dateIndex,
		isFree = false,
	} = params;

	const searchParams = new URLSearchParams();

	searchParams.append("venueId", venueId);
	searchParams.append("fatId", String(fatId));
	if (fvrId) {
		searchParams.append("fvrId", String(fvrId));
	}
	searchParams.append("venueName", venueName);
	searchParams.append("sessionIndex", String(sessionIndex));
	searchParams.append("dateIndex", String(dateIndex));
	searchParams.append("playDate", playDate);
	// SmartPlay URL often includes multiple districts in the district param if filtering by region
	// but passing the specific district code should work for direct linking
	searchParams.append("district", districtCode);
	searchParams.append("typeCode", typeCode);
	searchParams.append("keywords", "");
	searchParams.append("sportCode", sportCode);
	searchParams.append("frmFilterType", "");
	searchParams.append("isFree", String(isFree));

	return `${SMARTPLAY_BASE_URL}?${searchParams.toString()}`;
}
