import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
	BookingModal,
	BookingPending,
	DateSelector,
	FilterBar,
	VenueCard,
} from "@/components/booking";
import type {
	NormalizedSession,
	NormalizedVenue,
	PriceType,
	RegionType,
} from "@/lib/booking/types";
import {
	type AvailabilityTheme,
	FREE_FACILITIES_GROUPS,
	getAvailabilityColor,
	PAID_FACILITIES_GROUPS,
} from "@/lib/booking/utils";
import {
	getAvailableDates,
	getBookingData,
	getDatesAvailability,
	getLastUpdateTime,
} from "@/server-functions/booking";

// Search Params Schema
const searchSchema = z.object({
	date: z.string().optional(),
	districts: z.array(z.string()).optional(),
	center: z.string().optional(),
	facility: z.string().optional(),
	priceType: z.enum(["Paid", "Free"]).optional(),
});

export const Route = createFileRoute("/booking")({
	validateSearch: searchSchema,
	loaderDeps: ({
		search: { date, districts, center, facility, priceType },
	}) => ({
		date,
		districts,
		center,
		facility,
		priceType,
	}),
	loader: async ({
		deps: { date, districts, center, facility, priceType },
	}) => {
		// 1. Fetch Dates
		const datesData = await getAvailableDates();
		const availableDates = datesData.success ? datesData.data : [];

		// 2. Determine Selected Date
		const selectedDate =
			date || availableDates[0] || new Date().toISOString().split("T")[0];

		const currentPriceType = priceType || "Paid";

		// 3. Fetch Booking Data and Date Availability in parallel
		const [bookingData, availabilityData, lastUpdateData] = await Promise.all([
			getBookingData({
				data: {
					date: selectedDate,
					districts: districts,
					venueId: center,
					facilityCode: facility,
					priceType: currentPriceType,
				},
			}),
			getDatesAvailability({
				data: {
					districts: districts,
					venueId: center,
					facilityCode: facility,
					priceType: currentPriceType,
				},
			}),
			getLastUpdateTime(),
		]);

		let venues: NormalizedVenue[] = [];
		let districtsList: { code: string; name: string; region: RegionType }[] =
			[];
		let centersList: {
			id: string;
			name: string;
			districtName: string;
			districtCode: string;
		}[] = [];

		if (bookingData.success) {
			venues = bookingData.data.venues;
			districtsList = bookingData.data.districts;
			centersList = bookingData.data.centers;
		}

		return {
			availableDates,
			selectedDate,
			venues,
			districts: districtsList,
			centers: centersList,
			priceType: currentPriceType,
			dateAvailability: availabilityData.success ? availabilityData.data : {},
			districtStats:
				bookingData.success &&
				bookingData.data &&
				"districtStats" in bookingData.data &&
				bookingData.data.districtStats
					? (bookingData.data.districtStats as Record<
							string,
							{ t: number; a: number }
						>)
					: {},
			centerStats:
				bookingData.success &&
				bookingData.data &&
				"centerStats" in bookingData.data &&
				bookingData.data.centerStats
					? (bookingData.data.centerStats as Record<
							string,
							{ t: number; a: number }
						>)
					: {},
			lastUpdate: lastUpdateData.success ? lastUpdateData.lastUpdate : null,
		};
	},
	component: BookingPage,
	pendingComponent: BookingPending,
});

function BookingPage() {
	const {
		availableDates,
		selectedDate,
		venues,
		districts,
		centers,
		priceType: serverPriceType,
		dateAvailability,
		districtStats: serverDistrictStats,
		centerStats: serverCenterStats,
		lastUpdate,
	} = Route.useLoaderData();
	const navigate = useNavigate({ from: Route.fullPath });
	const {
		districts: searchDistricts,
		center: searchCenter,
		facility: searchFacility,
	} = Route.useSearch();
	// const { t } = useTranslation(["common", "booking"]); // Removed unused translation hook

	// --- Client State ---
	const [searchQuery, setSearchQuery] = useState("");

	// Initialize states from URL or defaults
	const [selectedDistricts, setSelectedDistricts] = useState<string[]>(
		searchDistricts || ["All"],
	);
	const [selectedCenter, setSelectedCenter] = useState<string>(
		searchCenter || "All",
	);
	const [selectedFacilityCode, setSelectedFacilityCode] = useState<string>(
		searchFacility || "All",
	);

	const selectedPriceType = serverPriceType as PriceType;

	const handleSelectDistrict = (districtCode: string) => {
		let next: string[];
		if (districtCode === "All") {
			next = ["All"];
		} else {
			const withoutAll = selectedDistricts.filter((d) => d !== "All");
			if (withoutAll.includes(districtCode)) {
				next = withoutAll.filter((d) => d !== districtCode);
				if (next.length === 0) next = ["All"];
			} else {
				next = [...withoutAll, districtCode];
			}
		}

		setSelectedDistricts(next);
		navigate({
			search: (prev) => ({
				...prev,
				districts: next.includes("All") ? undefined : next,
			}),
		});
	};

	const handleSelectCenter = (centerId: string) => {
		setSelectedCenter(centerId);
		navigate({
			search: (prev) => ({
				...prev,
				center: centerId === "All" ? undefined : centerId,
			}),
		});
	};

	const handleSelectFacility = (fCode: string) => {
		setSelectedFacilityCode(fCode);
		navigate({
			search: (prev) => ({
				...prev,
				facility: fCode === "All" ? undefined : fCode,
			}),
		});
	};

	const handleResetFilters = () => {
		setSelectedDistricts(["All"]);
		setSelectedCenter("All");
		setSelectedFacilityCode("All");
		setSearchQuery("");
		navigate({
			search: (prev) => ({
				...prev,
				districts: undefined,
				center: undefined,
				facility: undefined,
				priceType: undefined,
			}),
		});
	};

	const dateStyles = useMemo(() => {
		const styles: Record<string, AvailabilityTheme> = {};
		Object.keys(dateAvailability).forEach((date) => {
			styles[date] = getAvailabilityColor(
				dateAvailability[date].t,
				dateAvailability[date].a,
			);
		});
		return styles;
	}, [dateAvailability]);

	useEffect(() => {
		setSelectedCenter(searchCenter || "All");
	}, [searchCenter]);

	useEffect(() => {
		setSelectedFacilityCode(searchFacility || "All");
	}, [searchFacility]);

	// Initialize selectedDistricts from searchDistricts
	useEffect(() => {
		setSelectedDistricts(searchDistricts || ["All"]);
	}, [searchDistricts]);

	// Modal State
	const [bookingSession, setBookingSession] =
		useState<NormalizedSession | null>(null);
	const [bookingVenue, setBookingVenue] = useState<NormalizedVenue | null>(
		null,
	);
	const [showToast, setShowToast] = useState(false);

	// --- Derived Data ---

	// 1. Available Districts for FilterBar (now from server)
	const availableDistricts = useMemo(() => {
		return [...districts].sort((a, b) => {
			const statA = serverDistrictStats?.[a.code] || { t: 0, a: 0 };
			const statB = serverDistrictStats?.[b.code] || { t: 0, a: 0 };
			if (statB.a !== statA.a) return statB.a - statA.a;
			if (statB.t !== statA.t) return statB.t - statA.t;
			return a.name.localeCompare(b.name);
		});
	}, [districts, serverDistrictStats]);

	// 1.5 Available Centers for FilterBar (from server)
	const availableCenters = useMemo(() => {
		const filtered = selectedDistricts.includes("All")
			? centers
			: centers.filter((c) => {
					// Check if center has districtCode property (from server data)
					if ("districtCode" in c && c.districtCode) {
						return selectedDistricts.includes(c.districtCode);
					}
					// Fallback to matching by district name
					const dist = districts.find((d) => d.name === c.districtName);
					return dist ? selectedDistricts.includes(dist.code) : false;
				});

		return [...filtered].sort((a, b) => {
			const statA = serverCenterStats?.[a.id] || { t: 0, a: 0 };
			const statB = serverCenterStats?.[b.id] || { t: 0, a: 0 };
			if (statB.a !== statA.a) return statB.a - statA.a;
			if (statB.t !== statA.t) return statB.t - statA.t;
			return a.name.localeCompare(b.name);
		});
	}, [centers, selectedDistricts, districts, serverCenterStats]);

	// 2. Facility Groups based on Price Type
	const currentFacilityGroups = useMemo(() => {
		return selectedPriceType === "Paid"
			? PAID_FACILITIES_GROUPS
			: FREE_FACILITIES_GROUPS;
	}, [selectedPriceType]);

	// 3. Filter Venues
	const filteredVenues = useMemo(() => {
		return venues
			.map((venue) => {
				// 2. District Match
				const districtMatch =
					selectedDistricts.includes("All") ||
					selectedDistricts.includes(venue.districtCode);

				if (!districtMatch) {
					return null;
				}

				// Search Filter
				if (
					searchQuery &&
					!venue.name.toLowerCase().includes(searchQuery.toLowerCase())
				)
					return null;

				// Facility Filter inside Venue
				const filteredFacilities: typeof venue.facilities = {};
				let hasVisibleFacilities = false;

				Object.keys(venue.facilities).forEach((key) => {
					const facility = venue.facilities[key];

					// Facility Type Filter
					if (
						selectedFacilityCode !== "All" &&
						facility.code !== selectedFacilityCode
					)
						return;

					// Price Type Filter
					if (facility.priceType !== selectedPriceType) return;

					// Note: Venue data from server is already filtered by date
					// But we check if sessions exist
					if (facility.sessions.length > 0) {
						filteredFacilities[key] = facility;
						hasVisibleFacilities = true;
					}
				});

				if (!hasVisibleFacilities) return null;

				return {
					...venue,
					facilities: filteredFacilities,
				};
			})
			.filter((v): v is NormalizedVenue => v !== null);
	}, [
		venues,
		searchQuery,
		selectedDistricts,
		selectedFacilityCode,
		selectedPriceType,
	]);

	// --- Availability Stats Calculation ---
	const { districtStyles, centerStyles, facilityStyles } = useMemo(() => {
		const districtStats: Record<string, { t: number; a: number }> = {};
		const centerStats: Record<string, { t: number; a: number }> = {};
		const facilityStats: Record<string, { t: number; a: number }> = {};

		// Initialize with all known districts and centers to ensure every option gets a style
		districts.forEach((d) => {
			districtStats[d.code] = { t: 0, a: 0 };
		});
		centers.forEach((c) => {
			centerStats[c.id] = { t: 0, a: 0 };
		});

		// Initialize all facilities in groups
		currentFacilityGroups.forEach((g) => {
			g.options.forEach((o) => {
				facilityStats[o.value] = { t: 0, a: 0 };
			});
		});

		// 1. District Stats: Use server-provided stats if available (independent of district filter)
		if (serverDistrictStats && Object.keys(serverDistrictStats).length > 0) {
			Object.entries(serverDistrictStats).forEach(([code, stat]) => {
				districtStats[code] = stat;
			});
		} else {
			// Fallback: Calculate from venues (will be 0 for filtered-out districts)
			venues.forEach((venue) => {
				Object.values(venue.facilities).forEach((facility) => {
					if (facility.priceType !== selectedPriceType) return;
					const t = facility.sessions.length;
					const a = facility.sessions.filter(
						(s) => s.available && !s.isPassed,
					).length;

					if (!districtStats[venue.districtCode])
						districtStats[venue.districtCode] = { t: 0, a: 0 };
					districtStats[venue.districtCode].t += t;
					districtStats[venue.districtCode].a += a;
				});
			});
		}

		venues.forEach((venue) => {
			Object.values(venue.facilities).forEach((facility) => {
				// Base filter: Only Price Type
				if (facility.priceType !== selectedPriceType) return;

				const t = facility.sessions.length;
				const a = facility.sessions.filter(
					(s) => s.available && !s.isPassed,
				).length;

				// 2. Center Stats: Filtered by District (already happening via venues list)
				// Venues list is filtered by district, so we only count stats for selected districts' centers.
				// This is correct as per plan.

				const isVenueInSelectedDistricts =
					selectedDistricts.includes("All") ||
					selectedDistricts.includes(venue.districtCode);

				if (isVenueInSelectedDistricts) {
					if (!centerStats[venue.id]) centerStats[venue.id] = { t: 0, a: 0 };
					centerStats[venue.id].t += t;
					centerStats[venue.id].a += a;
				}

				// 3. Facility Stats: Filtered by Center
				const isVenueSelected =
					isVenueInSelectedDistricts &&
					(selectedCenter === "All" || selectedCenter === venue.id);

				if (isVenueSelected) {
					if (!facilityStats[facility.code])
						facilityStats[facility.code] = { t: 0, a: 0 };
					facilityStats[facility.code].t += t;
					facilityStats[facility.code].a += a;
				}
			});
		});

		// Helper to map stats to style
		const mapStyles = (stats: Record<string, { t: number; a: number }>) => {
			const styles: Record<string, AvailabilityTheme> = {};
			Object.keys(stats).forEach((key) => {
				styles[key] = getAvailabilityColor(stats[key].t, stats[key].a);
			});
			return styles;
		};

		return {
			districtStyles: mapStyles(districtStats),
			centerStyles: mapStyles(centerStats),
			facilityStyles: mapStyles(facilityStats),
		};
	}, [
		venues,
		selectedDistricts,
		selectedCenter,
		selectedPriceType,
		districts,
		centers,
		currentFacilityGroups,
		serverDistrictStats,
	]);

	// Reset facility type when price type changes is handled in handlePriceTypeChange now

	// --- Handlers ---

	const handlePriceTypeChange = (type: PriceType) => {
		navigate({
			search: (prev) => ({
				...prev,
				priceType: type,
				facility: undefined, // Reset facility when price type changes
			}),
		});
	};

	const handleDateSelect = (newDate: string) => {
		navigate({
			search: (prev) => ({
				...prev,
				date: newDate,
			}),
			replace: true,
		});
	};

	const handleSessionClick = (
		venue: NormalizedVenue,
		session: NormalizedSession,
	) => {
		setBookingVenue(venue);
		setBookingSession(session);
	};

	const confirmBooking = () => {
		setBookingSession(null);
		setBookingVenue(null);
		setShowToast(true);
		setTimeout(() => setShowToast(false), 3000);
	};

	return (
		<div className="min-h-screen bg-background/50 flex flex-col font-sans">
			{/* Date Selector */}
			<DateSelector
				dates={availableDates}
				selectedDate={selectedDate}
				onSelectDate={handleDateSelect}
				dateStyles={dateStyles}
			/>

			{/* Main Content Area */}
			<main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
				{/* Filter Bar Component */}
				<FilterBar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					availableDistricts={availableDistricts}
					selectedDistricts={selectedDistricts}
					onSelectDistrict={handleSelectDistrict}
					availableCenters={availableCenters}
					selectedCenter={selectedCenter}
					onSelectCenter={handleSelectCenter}
					facilityGroups={currentFacilityGroups}
					selectedFacilityType={selectedFacilityCode}
					onSelectFacilityType={handleSelectFacility}
					selectedPriceType={selectedPriceType}
					onSelectPriceType={handlePriceTypeChange}
					districtStyles={districtStyles}
					centerStyles={centerStyles}
					facilityStyles={facilityStyles}
					onResetFilters={handleResetFilters}
				/>
				<style>{`
					:root {
						--color-primary: var(--color-pacific-blue-600);
						--color-primary-hover: var(--color-pacific-blue-700);
					}
				`}</style>

				{/* Results Info */}
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-800">
						Available Venues
						<span className="ml-2 text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
							{filteredVenues.length}
						</span>
					</h2>
					<div className="flex items-center gap-4 text-sm text-gray-500">
						{lastUpdate && (
							<span>
								Last updated:{" "}
								{new Date(lastUpdate).toLocaleString("en-HK", {
									timeZone: "Asia/Hong_Kong",
									month: "numeric",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						)}
					</div>
				</div>

				{/* Venues Grid */}
				<div className="grid grid-cols-1 gap-6">
					{filteredVenues.length > 0 ? (
						filteredVenues.map((venue) => (
							<VenueCard
								key={venue.id}
								venue={venue}
								onSessionClick={(session) => handleSessionClick(venue, session)}
							/>
						))
					) : (
						<div className="flex flex-col items-center justify-center py-20 text-gray-400">
							{/* Lucide MapPin referenced but not imported in render scope? It is imported at top. */}
							{/* Reusing MapPin from Lucide */}
							<div className="mb-4 opacity-50">
								<CalendarDays size={48} />
							</div>
							<p className="text-lg font-medium">
								No venues available for this filter.
							</p>
							<p className="text-sm">
								Try changing filters or select "All Facilities" to see more.
							</p>
						</div>
					)}
				</div>
			</main>

			{/* Modals */}
			{bookingSession && bookingVenue && (
				<BookingModal
					session={bookingSession}
					venue={bookingVenue}
					onClose={() => setBookingSession(null)}
					onConfirm={confirmBooking}
				/>
			)}

			{/* Toast Notification */}
			<div
				className={`fixed bottom-6 right-6 bg-primary-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-500 transform ${
					showToast ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
				}`}
			>
				<div className="bg-white/20 p-1 rounded-full">
					<svg
						className="w-5 h-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						role="img"
						aria-label="Success Icon"
					>
						<title>Success</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={3}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<div>
					<h4 className="font-bold">Booking Confirmed!</h4>
					<p className="text-pacific-blue-200 text-sm">
						Your session has been reserved.
					</p>
				</div>
			</div>
		</div>
	);
}
