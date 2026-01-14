import type { FacilityGroup, PriceType, RegionType } from "./types";

// 1. District Data (18 Districts)
const DISTRICT_REGION_MAP: Record<string, RegionType> = {
	// Hong Kong Island
	CW: "Hong Kong Island", // Central & Western
	EN: "Hong Kong Island", // Eastern
	SN: "Hong Kong Island", // Southern
	WCH: "Hong Kong Island", // Wan Chai

	// Kowloon
	KC: "Kowloon", // Kowloon City
	KT: "Kowloon", // Kwun Tong
	SSP: "Kowloon", // Sham Shui Po
	WTS: "Kowloon", // Wong Tai Sin
	YTM: "Kowloon", // Yau Tsim Mong

	// New Territories
	IS: "New Territories", // Islands
	KWT: "New Territories", // Kwai Tsing
	N: "New Territories", // North
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
// 2. Facility Configuration (Grouped for Menu)
export const PAID_FACILITIES_GROUPS: FacilityGroup[] = [
	{
		label: "球類活動 (Ball Games)",
		options: [
			{ label: "籃球", value: "BASC" },
			{ label: "足球", value: "FOTP" },
			{ label: "排球", value: "VOLC" },
			{ label: "手球", value: "HBC" },
			{ label: "美式足球", value: "AF" },
			{ label: "棒球", value: "BASE" },
			{ label: "板球", value: "CP" },
			{ label: "曲棍球", value: "HOCP" },
			{ label: "欖球", value: "RUGBY" },
			{ label: "閃避球", value: "DODGE" },
			{ label: "躲避盤", value: "DODGEB" },
			{ label: "健球", value: "KIN" },
			{ label: "合球", value: "KORF" },
			{ label: "巧固球", value: "TCH" },
			{ label: "投球", value: "NB" },
			{ label: "門球", value: "GATE" },
			{ label: "高爾夫球", value: "GOLF" },
			{ label: "草地滾球", value: "BGNR" },
		],
	},
	{
		label: "拍類運動 (Racket Games)",
		options: [
			{ label: "網球", value: "TENC" },
			{ label: "羽毛球", value: "BADC" },
			{ label: "壁球", value: "SQUC" },
			{ label: "乒乓球", value: "TABT" },
			{ label: "匹克球", value: "PICK" },
		],
	},
	{
		label: "桌球與箭藝 (Cue Sports & Archery)",
		options: [
			{ label: "美式桌球", value: "APOOL" },
			{ label: "英式桌球", value: "SNOOK" },
			{ label: "克朗桌球檯", value: "CAROM" },
			{ label: "箭藝", value: "ARCH" },
		],
	},
	{
		label: "水上活動 (Water Sports)",
		options: [
			{ label: "獨木舟", value: "CANOE" },
			{ label: "風帆", value: "SAIL" },
			{ label: "滑浪風帆", value: "WIND" },
		],
	},
	{
		label: "其他 (Others)",
		options: [
			{ label: "健身", value: "FIT" },
			{ label: "舞蹈", value: "DANCE" },
			{ label: "多用途活動", value: "ACT" },
			{ label: "繩網活動", value: "ROPE" },
			{ label: "運動攀登", value: "CLIMB" },
			{ label: "場地單車", value: "CYC" },
			{ label: "棒球練習場", value: "BASEP" },
		],
	},
];

export const FREE_FACILITIES_GROUPS: FacilityGroup[] = [
	{
		label: "球類活動 (Ball Games)",
		options: [
			{ label: "籃球 (不收費)", value: "NFBASC" },
			{ label: "足球 (不收費)", value: "NFFOTP" },
			{ label: "排球 (不收費)", value: "NFVOLC" },
			{ label: "手球 (不收費)", value: "NFHBC" },
			{ label: "棒球 (不收費)", value: "NFBASE" },
			{ label: "板球 (不收費)", value: "NFCP" },
			{ label: "門球 (不收費)", value: "NFGATE" },
			{ label: "投球 (不收費)", value: "NFNB" },
			{ label: "沙灘手球 (不收費)", value: "NFBHBC" },
			{ label: "沙灘排球 (不收費)", value: "NFBVOL" },
			{ label: "滾軸曲棍球 (不收費)", value: "NFRHOC" },
		],
	},
	{
		label: "拍類運動 (Racket Games)",
		options: [
			{ label: "網球 (不收費)", value: "NFTENC" },
			{ label: "羽毛球 (不收費)", value: "NFBADC" },
			{ label: "乒乓球 (不收費)", value: "NFTABT" },
			{ label: "戶外匹克球 (不收費)", value: "NFPICK" },
		],
	},
	{
		label: "其他 (Others)",
		options: [
			{ label: "箭藝 (不收費)", value: "NFARCH" },
			{ label: "運動攀登 (不收費)", value: "NFCLIMB" },
			{ label: "露天劇場", value: "AMPHI" },
		],
	},
];

// Helper to build map from groups
const buildCodeMap = (groups: FacilityGroup[]) => {
	const map = new Map<string, string>();
	groups.forEach((g) => {
		g.options.forEach((o) => {
			map.set(o.value, o.label);
		});
	});
	return map;
};

const PAID_CODE_MAP = buildCodeMap(PAID_FACILITIES_GROUPS);
const FREE_CODE_MAP = buildCodeMap(FREE_FACILITIES_GROUPS);

export interface AvailabilityTheme {
	bg: string;
	text: string;
	border: string;
	hover: string;
	ring: string; // For focus rings or similar
	disabled: boolean; // Whether this option should be disabled
}

export const getAvailabilityColor = (
	total: number,
	available: number,
): AvailabilityTheme => {
	// No sessions at all - gray and disabled
	if (total === 0) {
		return {
			bg: "bg-porcelain-100",
			text: "text-porcelain-400",
			border: "border-porcelain-200",
			hover: "",
			ring: "",
			disabled: true,
		};
	}

	// No available sessions - gray and disabled
	if (available === 0) {
		return {
			bg: "bg-porcelain-100",
			text: "text-porcelain-400",
			border: "border-porcelain-200",
			hover: "",
			ring: "",
			disabled: true,
		};
	}

	const percentage = available / total;

	// High Availability (> 50%) -> Meadow Green
	if (percentage >= 0.5) {
		return {
			bg: "bg-meadow-green-100",
			text: "text-meadow-green-800",
			border: "border-meadow-green-200",
			hover: "hover:bg-meadow-green-200",
			ring: "focus:ring-meadow-green-500",
			disabled: false,
		};
	}

	// Medium Availability (20% - 50%) -> Vanilla Custard (Yellow)
	if (percentage >= 0.2) {
		return {
			bg: "bg-vanilla-custard-100",
			text: "text-vanilla-custard-800",
			border: "border-vanilla-custard-200",
			hover: "hover:bg-vanilla-custard-200",
			ring: "focus:ring-vanilla-custard-500",
			disabled: false,
		};
	}

	// Low Availability (< 20%) -> Tangerine Dream (Orange/Red)
	return {
		bg: "bg-tangerine-dream-100",
		text: "text-tangerine-dream-800",
		border: "border-tangerine-dream-200",
		hover: "hover:bg-tangerine-dream-200",
		ring: "focus:ring-tangerine-dream-500",
		disabled: false,
	};
};

// Facility Theme Mapping - DEPRECATED for colors, but kept for legacy or icon theming references if needed.
// Switched to Availability-based consistency.
export const getFacilityTheme = (code: string): string => {
	// 1. Basketball / Volleyball / Dodgeball / Handball (Dynamic/Warm => Tangerine)
	if (
		[
			"BASC",
			"NFBASC",
			"VOLC",
			"NFVOLC",
			"DODGE",
			"DODGEB",
			"HBC",
			"NFHBC",
			"NFBHBC",
			"NFBVOL",
		].includes(code)
	) {
		return "tangerine-dream";
	}

	// 2. Football / Rugby / Hockey / Tennis / Golf / Baseball (Field/Grass => Green)
	if (
		[
			"FOTP",
			"NFFOTP",
			"RUGBY",
			"HOCP",
			"TENC",
			"NFTENC",
			"GOLF",
			"BASE",
			"NFBASE",
			"BASEP",
			"GATE",
			"NFGATE",
			"CP",
			"NFCP",
			"ARCH",
			"NFARCH",
			"BGNR",
		].includes(code)
	) {
		return "meadow-green";
	}

	// 3. Water / Ice / Generic (Pacific Blue)
	// Default fallthrough
	return "pacific-blue";
};

export const normalizeTime = (time: string) => {
	if (!time) return "";
	return time.substring(0, 5);
};

export const getFacilityDetails = (
	code: string,
	apiName: string,
	apiEnName: string,
): { name: string; priceType: PriceType } => {
	// 1. Check strict code mapping first (Best Source of Truth)
	if (FREE_CODE_MAP.has(code)) {
		const name = FREE_CODE_MAP.get(code);
		if (name) return { name, priceType: "Free" };
	}
	if (PAID_CODE_MAP.has(code)) {
		const name = PAID_CODE_MAP.get(code);
		if (name) return { name, priceType: "Paid" };
	}

	// 2. Fallback: Parse Name if code not found in our config
	// (This handles cases where API returns something strictly new or custom)
	const name = apiName;
	let priceType: PriceType = "Paid";

	if (code.startsWith("NF") || apiEnName.toLowerCase().includes("free")) {
		priceType = "Free";
	}

	return { name, priceType };
};

export const isSessionPassed = (dateStr: string, timeStr: string): boolean => {
	// dateStr: YYYY-MM-DD
	// timeStr: HH:mm (normalizeTime output)

	// Create a Date object for the session in HK timezone (+08:00)
	const sessionDate = new Date(`${dateStr}T${timeStr}:00+08:00`);
	const now = new Date();

	return now > sessionDate;
};
