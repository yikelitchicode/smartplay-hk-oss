import type { FacilityGroup, PriceType, RegionType } from "./types";

// 1. District Data (18 Districts)
const DISTRICT_REGION_MAP: Record<string, RegionType> = {
	// Hong Kong Island
	CW: "Hong Kong Island", // Central & Western
	EN: "Hong Kong Island", // Eastern
	SO: "Hong Kong Island", // Southern
	WC: "Hong Kong Island", // Wan Chai

	// Kowloon
	KC: "Kowloon", // Kowloon City
	KT: "Kowloon", // Kwun Tong
	SSP: "Kowloon", // Sham Shui Po
	WTS: "Kowloon", // Wong Tai Sin
	YTM: "Kowloon", // Yau Tsim Mong

	// New Territories
	IS: "New Territories", // Islands
	"K&T": "New Territories", // Kwai Tsing
	NO: "New Territories", // North
	SK: "New Territories", // Sai Kung
	ST: "New Territories", // Sha Tin
	TP: "New Territories", // Tai Po
	TW: "New Territories", // Tsuen Wan
	TM: "New Territories", // Tuen Mun
	YL: "New Territories", // Yuen Long
};

export const getRegion = (distCode: string): RegionType => {
	return DISTRICT_REGION_MAP[distCode] || "New Territories";
};

// 2. Facility Configuration (Grouped for Menu)
export const PAID_FACILITIES_GROUPS: FacilityGroup[] = [
	{
		label: "球類活動 (Ball Games)",
		options: [
			"籃球",
			"足球",
			"排球",
			"手球",
			"美式足球",
			"棒球",
			"板球",
			"曲棍球",
			"欖球",
			"閃避球",
			"躲避盤",
			"健球",
			"合球",
			"巧固球",
			"投球",
			"門球",
			"高爾夫球",
			"草地滾球",
		],
	},
	{
		label: "拍類運動 (Racket Games)",
		options: ["網球", "羽毛球", "壁球", "乒乓球", "匹克球"],
	},
	{
		label: "桌球與箭藝 (Cue Sports & Archery)",
		options: ["美式桌球", "英式桌球", "克朗桌球檯", "箭藝"],
	},
	{
		label: "水上活動 (Water Sports)",
		options: ["獨木舟", "風帆", "滑浪風帆"],
	},
	{
		label: "其他 (Others)",
		options: [
			"健身",
			"舞蹈",
			"多用途活動",
			"繩網活動",
			"運動攀登",
			"場地單車",
			"棒球練習場",
		],
	},
];

export const FREE_FACILITIES_GROUPS: FacilityGroup[] = [
	{
		label: "球類活動 (Ball Games)",
		options: [
			"籃球 (不收費)",
			"足球 (不收費)",
			"排球 (不收費)",
			"手球 (不收費)",
			"棒球 (不收費)",
			"板球 (不收費)",
			"門球 (不收費)",
			"投球 (不收費)",
			"沙灘手球 (不收費)",
			"沙灘排球 (不收費)",
			"滾軸曲棍球 (不收費)",
		],
	},
	{
		label: "拍類運動 (Racket Games)",
		options: [
			"網球 (不收費)",
			"羽毛球 (不收費)",
			"乒乓球 (不收費)",
			"戶外匹克球 (不收費)",
		],
	},
	{
		label: "其他 (Others)",
		options: ["箭藝 (不收費)", "運動攀登 (不收費)", "露天劇場"],
	},
];

// Flat lists for checking validity or simple mapping
const FREE_LIST = FREE_FACILITIES_GROUPS.flatMap((g) => g.options);

// Map common English API terms to the Chinese Display Names
const NAME_MAPPING: Record<string, string> = {
	// Paid mappings
	"tennis court": "網球",
	"tennis court (urban)": "網球",
	"tennis court (nt)": "網球",
	"basketball court": "籃球",
	"badminton court": "羽毛球",
	"squash court": "壁球",
	"table tennis": "乒乓球",
	"fitness room": "健身",
	"soccer pitch": "足球",
	football: "足球",
	volleyball: "排球",
	"dance room": "舞蹈",
	"activity room": "多用途活動",
	"american pool": "美式桌球",
	snooker: "英式桌球",
	archery: "箭藝",

	// Free mappings
	"basketball court (free)": "籃球 (不收費)",
	"soccer pitch (free)": "足球 (不收費)",
	park: "露天劇場", // Fallback for parks often appearing as general venues
};

export const normalizeTime = (time: string) => {
	if (!time) return "";
	return time.substring(0, 5);
};

export const determinePriceType = (
	name: string,
	enName: string,
): { name: string; priceType: PriceType } => {
	const lowerEnName = enName.toLowerCase();

	// 1. Try to find a direct map first
	let mappedName = name; // Default to API name if no map found

	// Check against known mappings
	for (const [key, value] of Object.entries(NAME_MAPPING)) {
		if (lowerEnName.includes(key)) {
			mappedName = value;
			break;
		}
	}

	// 2. Determine Price Type based on the resulting Mapped Name
	if (
		FREE_LIST.includes(mappedName) ||
		mappedName.includes("不收費") ||
		lowerEnName.includes("free")
	) {
		return { name: mappedName, priceType: "Free" };
	}

	return { name: mappedName, priceType: "Paid" };
};
