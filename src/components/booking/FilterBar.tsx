import {
	CircleDollarSign,
	Dumbbell,
	MapPin,
	RotateCcw,
	Search,
} from "lucide-react";
import { type JSX, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
	Select,
	type SelectGroupType,
	type SelectOptionType,
} from "@/components/ui/Select";
import type { FacilityGroup, PriceType, RegionType } from "@/lib/booking/types";
import {
	type AvailabilityTheme,
	getAvailabilityColor,
} from "@/lib/booking/utils";
import { resolveLocalizedName } from "@/lib/i18n-utils";
import type { MetadataResult } from "@/services/booking.service";

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
}: FilterBarProps): JSX.Element {
	const { t, i18n } = useTranslation(["booking"]);
	const lang = i18n.language;
	const isEn = lang === "en" || lang === "en-US";
	const isSc = lang === "cn" || lang === "zh-CN";
	const isTc = lang === "zh" || lang === "zh-HK";

	const [selectedRegion, setSelectedRegion] = useState<RegionType | "All">(
		"All",
	);

	// Filter districts based on selected region
	const filteredDistricts = useMemo(() => {
		if (selectedRegion === "All") return availableDistricts;
		return availableDistricts.filter((d) => d.region === selectedRegion);
	}, [selectedRegion, availableDistricts]);

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
				</div>

				{/* Region Tabs */}
				<div className="flex p-1 bg-porcelain-100/80 rounded-xl overflow-hidden">
					{(["All", ...REGIONS] as const).map((region) => (
						<button
							key={region}
							type="button"
							onClick={() => handleRegionClick(region)}
							className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
								selectedRegion === region
									? "bg-white text-pacific-blue-700 shadow-sm"
									: "text-porcelain-500 hover:text-porcelain-700"
							}`}
						>
							{region === "All"
								? t("booking:all")
								: region === "Hong Kong Island"
									? t("booking:hk_island_short")
									: region === "New Territories"
										? t("booking:new_terr_short")
										: t("booking:kowloon")}
						</button>
					))}
				</div>

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
										onClick={() => !isDisabled && onSelectDistrict(dist.code)}
										disabled={isDisabled}
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
					<div className="flex bg-porcelain-200/50 p-1.5 rounded-xl">
						{(["Paid", "Free"] as const).map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => onSelectPriceType(type)}
								className={`flex-1 flex items-center justify-center py-2 rounded-lg text-sm font-medium transition-all ${
									selectedPriceType === type
										? "bg-white text-pacific-blue-700 shadow-sm ring-1 ring-black/5"
										: "text-porcelain-500 hover:text-porcelain-700 hover:bg-white/50"
								}`}
							>
								{type === "Paid" ? t("booking:paid") : t("booking:free")}
							</button>
						))}
					</div>
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
								? `${centerStyles[selectedCenter].bg} ${centerStyles[selectedCenter].text} ${centerStyles[selectedCenter].border}`
								: ""
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
								? `${facilityStyles[selectedFacilityType].bg} ${facilityStyles[selectedFacilityType].text} ${facilityStyles[selectedFacilityType].border}`
								: ""
						}
					/>
				</div>
			</div>
		</div>
	);
}
