import {
	CircleDollarSign,
	Dumbbell,
	MapPin,
	RotateCcw,
	Search,
	Target,
} from "lucide-react";
import { type JSX, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
	Select,
	type SelectGroupType,
	type SelectOptionType,
} from "@/components/ui/Select";
import { DISTRICT_COORDINATES, type DistrictCoords } from "@/data/districts";
import type { FacilityGroup, PriceType, RegionType } from "@/lib/booking/types";
import {
	type AvailabilityTheme,
	getAvailabilityColor,
} from "@/lib/booking/utils";
import { resolveLocalizedName } from "@/lib/i18n-utils";
import type { MetadataResult } from "@/services/booking.service";
import { getDistance } from "@/utils/location";

interface FilterBarProps {
	// Search Data
	searchQuery: string;
	onSearchChange: (query: string) => void;

	// Location Data
	availableDistricts: {
		code: string;
		name: string;
		nameEn?: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
		region: RegionType;
		hasData?: boolean;
		totalSessions: number;
		availableSessions: number;
	}[];
	selectedDistricts: string[]; // ['All'] or list of District Names
	onSelectDistrict: (district: string) => void;

	// Center Data
	availableCenters: {
		id: string;
		name: string;
		nameEn?: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
		districtName: string;
		districtNameEn?: string | null;
		districtNameTc?: string | null;
		districtNameSc?: string | null;
		districtCode: string;
	}[];
	selectedCenter: string;
	onSelectCenter: (centerId: string) => void;

	// Facility Data
	facilityGroups: FacilityGroup[];
	selectedFacilityType: string;
	onSelectFacilityType: (type: string) => void;

	// Price Data
	selectedPriceType: PriceType;
	onSelectPriceType: (type: PriceType) => void;

	// Styles
	districtStyles: Record<string, AvailabilityTheme>;
	centerStyles: Record<string, AvailabilityTheme>;
	facilityStyles: Record<string, AvailabilityTheme>;

	// Actions
	onResetFilters: () => void;

	// Metadata
	metadata: MetadataResult;

	// GPS
	onLocate: () => void;
	isLocating: boolean;
	userLocation: DistrictCoords | null;

	// Loading State
	isLoading?: boolean;
}

const REGIONS: RegionType[] = [
	"Hong Kong Island",
	"Kowloon",
	"New Territories",
];

export function FilterBar({
	searchQuery,
	onSearchChange,
	availableDistricts,
	selectedDistricts,
	onSelectDistrict,
	availableCenters,
	selectedCenter,
	onSelectCenter,
	facilityGroups,
	selectedFacilityType,
	onSelectFacilityType,
	selectedPriceType,
	onSelectPriceType,
	districtStyles,
	centerStyles,
	facilityStyles,
	onResetFilters,
	metadata,
	onLocate,
	isLocating,
	userLocation,
	isLoading = false,
}: FilterBarProps): JSX.Element {
	const { t, i18n } = useTranslation(["booking"]);
	const lang = i18n.language;
	const isEn = lang === "en" || lang === "en-US";
	const isSc = lang === "cn" || lang === "zh-CN";
	const isTc = lang === "zh" || lang === "zh-HK";

	const [selectedRegion, setSelectedRegion] = useState<RegionType | "All">(
		"All",
	);

	// Filter districts based on selected region and sort by distance if location available
	const filteredDistricts = useMemo(() => {
		let districts = availableDistricts;

		// 1. Filter by Region
		if (selectedRegion !== "All") {
			districts = districts.filter((d) => d.region === selectedRegion);
		}

		// 2. Sort by Distance (if GPS enabled)
		if (userLocation) {
			return [...districts].sort((a, b) => {
				const aActive = a.hasData !== false && a.availableSessions > 0;
				const bActive = b.hasData !== false && b.availableSessions > 0;

				// 1. Prioritize Active Districts (sessions > 0)
				if (aActive && !bActive) return -1;
				if (!aActive && bActive) return 1;

				// Both are active or both are inactive
				const aHasData = a.hasData !== false;
				const bHasData = b.hasData !== false;
				if (aHasData && !bHasData) return -1;
				if (!aHasData && bHasData) return 1;

				// 2. Sort by Distance
				const coordsA =
					DISTRICT_COORDINATES[a.code as keyof typeof DISTRICT_COORDINATES];
				const coordsB =
					DISTRICT_COORDINATES[b.code as keyof typeof DISTRICT_COORDINATES];

				if (coordsA && coordsB) {
					const distA = getDistance(userLocation, coordsA);
					const distB = getDistance(userLocation, coordsB);

					if (Math.abs(distA - distB) > 0.1) {
						// Significant distance difference
						return distA - distB;
					}
				} else if (coordsA) {
					return -1;
				} else if (coordsB) {
					return 1;
				}

				// 3. Tie-breaker: Availability
				return b.availableSessions - a.availableSessions;
			});
		}

		return districts;
	}, [selectedRegion, availableDistricts, userLocation]);

	// Handle Region Click
	const handleRegionClick = useCallback(
		(region: RegionType | "All") => {
			setSelectedRegion(region);
			onSelectDistrict("All"); // Reset district when region changes
		},
		[onSelectDistrict],
	);

	const handleReset = useCallback(() => {
		setSelectedRegion("All");
		onResetFilters();
	}, [onResetFilters]);

	// Prepare SegmentedControl Options for Regions
	const regionOptions = useMemo(
		() =>
			(["All", ...REGIONS] as const).map((region) => ({
				value: region,
				label:
					region === "All"
						? t("booking:all")
						: region === "Hong Kong Island"
							? t("booking:hk_island_short")
							: region === "New Territories"
								? t("booking:new_terr_short")
								: t("booking:kowloon"),
			})),
		[t],
	);

	// Prepare SegmentedControl Options for Price Type
	const priceTypeOptions = useMemo(
		() =>
			(["Paid", "Free"] as const).map((type) => ({
				value: type,
				label: type === "Paid" ? t("booking:paid") : t("booking:free"),
			})),
		[t],
	);

	// Prepare Select Options for Facilities
	// Transform FacilityGroups to SelectGroupType[]
	const facilityOptions = useMemo(() => {
		const opts: (SelectOptionType | SelectGroupType)[] = [
			{ value: "All", label: t("booking:all_facilities") },
		];

		facilityGroups.forEach((group) => {
			// Resolve Group Name
			let resolvedGroupLabel = group.label;

			// Look up group metadata to get localized name
			const groupMeta = metadata.facilityGroups.find(
				(g) => g.code === group.value,
			);
			if (groupMeta) {
				if (isEn) resolvedGroupLabel = groupMeta.nameEn || groupMeta.name;
				else if (isSc) resolvedGroupLabel = groupMeta.nameSc || groupMeta.name;
				else if (isTc) resolvedGroupLabel = groupMeta.nameTc || groupMeta.name;
				else resolvedGroupLabel = groupMeta.name;
			}

			opts.push({
				label: resolvedGroupLabel,
				options: group.options.map((o) => {
					const style = facilityStyles[o.value] || getAvailabilityColor(0, 0);
					const meta = metadata.facilityTypes.find((f) => f.code === o.value);

					let label = o.label;
					if (meta) {
						if (isEn) label = meta.nameEn || meta.name;
						else if (isSc) label = meta.nameSc || meta.name;
						else if (isTc) label = meta.nameTc || meta.name;
						else label = meta.name;
					}

					return {
						value: o.value,
						label: label,
						className: `${style.bg} ${style.text} ${style.disabled ? "opacity-60" : ""}`,
						disabled: style.disabled,
					};
				}),
			});
		});
		return opts;
	}, [
		facilityGroups,
		facilityStyles,
		isEn,
		isSc,
		isTc,
		t,
		metadata.facilityTypes,
		metadata.facilityGroups,
	]);

	// Prepare Select Options for Centers
	const centerOptions = useMemo(() => {
		const opts: (SelectOptionType | SelectGroupType)[] = [
			{ value: "All", label: t("booking:all_centers") },
		];

		// Group centers by districtCode (stable key)
		const groups: Record<string, SelectOptionType[]> = {};
		const districtCodeToName: Record<string, string> = {};

		for (const c of availableCenters) {
			const dCode = c.districtCode || c.districtName; // Fallback to name if code missing (shouldn't happen)
			if (!groups[dCode]) {
				groups[dCode] = [];
				// Resolve district name using helper (with sify fallback for SC)
				const dMeta = metadata.districts.find((d) => d.code === dCode);
				const dName = resolveLocalizedName(
					{
						name: dMeta?.name || c.districtName,
						nameEn: dMeta?.nameEn || c.districtNameEn,
						nameTc: dMeta?.nameTc || c.districtNameTc,
						nameSc: dMeta?.nameSc || c.districtNameSc,
					},
					lang,
				);
				districtCodeToName[dCode] = dName;
			}
			const style = centerStyles[c.id] || getAvailabilityColor(0, 0);
			// Resolve center name using helper (with sify fallback for SC)
			const cName = resolveLocalizedName(
				{
					name: c.name,
					nameEn: c.nameEn,
					nameTc: c.nameTc,
					nameSc: c.nameSc,
				},
				lang,
			);

			groups[dCode].push({
				value: c.id,
				label: cName,
				className: `${style.bg} ${style.text} ${style.disabled ? "opacity-60" : ""}`,
				disabled: style.disabled,
			});
		}

		// Sort keys (district codes or names?) - maybe sort by translated name?
		const sortedDistrictCodes = Object.keys(groups).sort((a, b) =>
			districtCodeToName[a].localeCompare(districtCodeToName[b]),
		);

		// Add groups to opts
		for (const dCode of sortedDistrictCodes) {
			opts.push({
				label: districtCodeToName[dCode],
				options: groups[dCode],
			});
		}

		return opts;
	}, [availableCenters, centerStyles, lang, metadata.districts, t]);

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-0 divide-y divide-gray-100">
			{/* 1. Search Bar (Moved from Header) */}
			<div className="p-5 border-b border-gray-100">
				<div className="flex items-center gap-4">
					<div className="relative flex-1">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							placeholder={t("booking:search_placeholder")}
							className="w-full pl-10 pr-4 py-3 bg-porcelain-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all outline-none"
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
						/>
					</div>
					<button
						type="button"
						onClick={handleReset}
						className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-porcelain-600 hover:text-primary hover:bg-porcelain-50 rounded-xl transition-all border border-porcelain-200"
						title={t("booking:reset_hint")}
					>
						<RotateCcw size={16} />
						<span className="hidden sm:inline">{t("booking:reset")}</span>
					</button>
				</div>
			</div>

			{/* 2. Region & District Selection */}
			<div className="p-5 space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
						<MapPin size={18} className="text-primary" />
						<span>{t("booking:location")}</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onLocate}
						disabled={isLocating}
						className={`h-8 gap-2 border border-gray-200 ${userLocation ? "border-primary/50 text-primary bg-primary/5" : ""}`}
						title={t("booking:locate_nearby", "搜尋附近地區")}
					>
						<Target
							className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`}
						/>
						<span className="text-xs">
							{isLocating
								? t("booking:gps_locating", "定位中...")
								: userLocation
									? t("booking:gps_nearby", "附近")
									: "GPS"}
						</span>
					</Button>
				</div>

				{/* Region Tabs */}
				<SegmentedControl
					options={regionOptions}
					value={selectedRegion}
					onValueChange={handleRegionClick}
				/>

				{/* District Chips */}
				<div className="min-h-14 w-full">
					<ScrollArea
						orientation="horizontal"
						className="h-14 w-full"
						viewportClassName="overflow-x-auto scrollbar-hide"
					>
						<div className="flex items-center gap-2 h-full w-max pr-6 py-1">
							<button
								type="button"
								onClick={() => onSelectDistrict("All")}
								className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all border ${
									selectedDistricts.includes("All")
										? "bg-primary border-primary text-white"
										: "bg-white border-porcelain-200 text-porcelain-600 hover:bg-pacific-blue-50 hover:border-pacific-blue-200"
								}`}
							>
								{t("booking:all_districts")}
							</button>
							{filteredDistricts.map((dist) => {
								const style = districtStyles[dist.code];
								const isDisabled = style?.disabled ?? false;
								const availabilityClass = style
									? `${style.bg} ${style.text} ${style.border} ${isDisabled ? "opacity-60 cursor-not-allowed" : style.hover}`
									: "bg-white border-porcelain-200 text-porcelain-600 hover:bg-pacific-blue-50 hover:border-pacific-blue-200";

								return (
									<button
										key={dist.code}
										type="button"
										onClick={() =>
											!isDisabled && !isLoading && onSelectDistrict(dist.code)
										}
										disabled={isDisabled || isLoading}
										className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all border ${
											selectedDistricts.includes(dist.code)
												? "bg-primary border-primary text-white"
												: availabilityClass
										}`}
									>
										{resolveLocalizedName(
											{
												name: dist.name,
												nameEn:
													metadata.districts.find((m) => m.code === dist.code)
														?.nameEn || dist.nameEn,
												nameTc:
													metadata.districts.find((m) => m.code === dist.code)
														?.nameTc || dist.nameTc,
												nameSc:
													metadata.districts.find((m) => m.code === dist.code)
														?.nameSc || dist.nameSc,
											},
											lang,
										)}
									</button>
								);
							})}
						</div>
					</ScrollArea>
				</div>
			</div>

			{/* 3. Facility & Type Selection */}
			<div className="p-5 flex flex-col md:flex-row gap-6 bg-porcelain-50/50">
				{/* Price Type Toggle (Strict: Paid vs Free) */}
				<div className="w-full md:w-1/3 space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
						<CircleDollarSign size={18} className="text-primary" />
						<span>{t("booking:price_type")}</span>
					</div>
					<SegmentedControl
						options={priceTypeOptions}
						value={selectedPriceType}
						onValueChange={onSelectPriceType}
					/>
				</div>

				{/* Center Dropdown */}
				<div className="flex-1 space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
						<MapPin size={18} className="text-primary" />
						<span>{t("booking:center")}</span>
					</div>
					<Select
						options={centerOptions}
						value={selectedCenter}
						onChange={(val) => onSelectCenter(val)}
						placeholder={t("booking:select_center")}
						triggerClassName={
							centerStyles[selectedCenter]
								? `${centerStyles[selectedCenter].bg} ${centerStyles[selectedCenter].text} ${centerStyles[selectedCenter].border} h-12 rounded-xl`
								: "h-12 rounded-xl"
						}
					/>
				</div>

				{/* Facility Dropdown (Grouped) */}
				<div className="flex-1 space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
						<Dumbbell size={18} className="text-primary" />
						<span>{t("booking:facility")}</span>
					</div>
					<Select
						options={facilityOptions}
						value={selectedFacilityType}
						onChange={(val) => onSelectFacilityType(val)}
						placeholder={t("booking:select_facility")}
						triggerClassName={
							facilityStyles[selectedFacilityType]
								? `${facilityStyles[selectedFacilityType].bg} ${facilityStyles[selectedFacilityType].text} ${facilityStyles[selectedFacilityType].border} h-12 rounded-xl`
								: "h-12 rounded-xl"
						}
					/>
				</div>
			</div>
		</div>
	);
}
