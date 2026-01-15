import {
	Activity,
	CircleDot,
	Dumbbell,
	MapPin,
	Target,
	Trophy,
	Users,
	Waves,
} from "lucide-react";
import { type JSX, memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NormalizedVenue } from "@/lib/booking/types";
import { resolveLocalizedName } from "@/lib/i18n-utils";

interface VenueThumbnailProps {
	venue: NormalizedVenue;
}

// Map district codes to gradient styles
// Using a variety of modern gradients to distinguish districts
const getDistrictGradient = (code: string): string => {
	// Hash the code to pick a gradient deterministically if not explicitly mapped
	const gradients = [
		"from-pacific-blue-500 to-pacific-blue-400", // Ocean
		"from-meadow-green-500 to-meadow-green-400", // Nature
		"from-pacific-blue-700 to-icy-blue-600", // Urban
		"from-tangerine-dream-500 to-tangerine-dream-400", // Warm
		"from-vanilla-custard-500 to-vanilla-custard-400", // Sunny
		"from-icy-blue-600 to-icy-blue-500", // Deep Blue
		"from-tangerine-dream-600 to-vanilla-custard-500", // Energetic
		"from-porcelain-600 to-porcelain-500", // Neutral
	];

	// Simple hash function for consistent color assignment
	const hash = code
		.split("")
		.reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return gradients[hash % gradients.length];
};

// Map facility codes/names to icons
const getFacilityIcon = (facilities: NormalizedVenue["facilities"]) => {
	const facilityKeys = Object.keys(facilities);
	const mainFacilityKey = facilityKeys[0]?.toLowerCase() || "";

	if (mainFacilityKey.includes("badminton")) return Trophy;
	if (
		mainFacilityKey.includes("basketball") ||
		mainFacilityKey.includes("volleyball")
	)
		return Users;
	if (mainFacilityKey.includes("tennis")) return Activity;
	if (mainFacilityKey.includes("swimming") || mainFacilityKey.includes("pool"))
		return Waves;
	if (mainFacilityKey.includes("squash") || mainFacilityKey.includes("table"))
		return Target;
	if (mainFacilityKey.includes("fitness") || mainFacilityKey.includes("gym"))
		return Dumbbell;

	// Default icon
	return CircleDot;
};

export const VenueThumbnail = memo(function VenueThumbnail({
	venue,
}: VenueThumbnailProps): JSX.Element {
	const { i18n } = useTranslation(["booking"]);

	const gradientClass = useMemo(
		() => getDistrictGradient(venue.districtCode),
		[venue.districtCode],
	);
	const IconComponent = useMemo(
		() => getFacilityIcon(venue.facilities),
		[venue.facilities],
	);

	// Count total facilities
	const facilityCount = Object.keys(venue.facilities).length;

	return (
		<div
			className={`w-full md:w-48 h-48 md:h-auto relative shrink-0 overflow-hidden bg-linear-to-br ${gradientClass}`}
		>
			{/* Abstract Pattern Overlay */}
			<div className="absolute inset-0 opacity-20">
				<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
					<title>Decorative pattern overlay</title>
					<defs>
						<pattern
							id="dotPattern"
							x="0"
							y="0"
							width="20"
							height="20"
							patternUnits="userSpaceOnUse"
						>
							<circle cx="2" cy="2" r="1" fill="white" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#dotPattern)" />
				</svg>
			</div>

			{/* Large Watermark Icon */}
			<div className="absolute -right-6 -bottom-6 text-white/20 transform rotate-12">
				<IconComponent size={140} strokeWidth={1.5} />
			</div>

			{/* Content Container */}
			<div className="absolute inset-0 p-4 flex flex-col justify-between text-white z-10">
				{/* District Badge */}
				<div className="flex items-start">
					<div className="bg-black/30 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 shadow-sm">
						<MapPin size={12} className="text-white/90" />
						<span className="text-xs font-semibold tracking-wide uppercase">
							{resolveLocalizedName(
								{
									name: venue.districtName,
									nameEn: venue.districtNameEn,
									nameTc: venue.districtNameTc,
									nameSc: venue.districtNameSc,
								},
								i18n.language,
							)}
						</span>
					</div>
				</div>

				{/* Venue Info Abstract */}
				<div className="space-y-1">
					<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm w-fit">
						<Trophy size={12} />
						<span className="text-xs font-medium">
							{facilityCount} {facilityCount === 1 ? "Facility" : "Facilities"}
						</span>
					</div>
				</div>
			</div>

			{/* Inner Shadow for depth */}
			<div className="absolute inset-0 shadow-[inset_0_2px_20px_rgba(0,0,0,0.1)] pointer-events-none" />
		</div>
	);
});
