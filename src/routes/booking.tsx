import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
	BookingModal,
	DateSelector,
	FilterBar,
	VenueCard,
} from "@/components/booking";
import {
	FacilityGroup,
	type NormalizedSession,
	type NormalizedVenue,
	type PriceType,
} from "@/lib/booking/types";
import {
	FREE_FACILITIES_GROUPS,
	getRegion,
	PAID_FACILITIES_GROUPS,
} from "@/lib/booking/utils";
import { getAvailableDates, getBookingData } from "@/server-functions/booking";

// Search Params Schema
const searchSchema = z.object({
	date: z.string().optional(),
});

export const Route = createFileRoute("/booking")({
	validateSearch: searchSchema,
	loaderDeps: ({ search: { date } }) => ({ date }),
	loader: async ({ deps: { date } }) => {
		// 1. Fetch Dates
		const datesData = await getAvailableDates();
		const availableDates = datesData.success ? datesData.data : [];

		// 2. Determine Selected Date
		// If no date in params, default to first available, or today if list empty
		const selectedDate =
			date || availableDates[0] || new Date().toISOString().split("T")[0];

		// 3. Fetch Booking Data for Selected Date
		// We could defer this but let's await for SSR for now
		let venues: NormalizedVenue[] = [];
		if (selectedDate) {
			const bookingData = await getBookingData({
				data: { date: selectedDate },
			});
			if (bookingData.success) {
				venues = bookingData.data;
			}
		}

		return {
			availableDates,
			selectedDate,
			venues,
		};
	},
	component: BookingPage,
});

function BookingPage() {
	const { availableDates, selectedDate, venues } = Route.useLoaderData();
	const navigate = useNavigate({ from: Route.fullPath });
	const { t } = useTranslation(["common", "booking"]);

	// --- Client State ---
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDistrict, setSelectedDistrict] = useState("All");
	const [selectedFacilityType, setSelectedFacilityType] = useState("All");
	const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("Paid");

	// Modal State
	const [bookingSession, setBookingSession] =
		useState<NormalizedSession | null>(null);
	const [bookingVenue, setBookingVenue] = useState<NormalizedVenue | null>(
		null,
	);
	const [showToast, setShowToast] = useState(false);

	// --- Derived Data ---

	// 1. Available Districts (from loaded venues)
	// Logic from draft used `venues` to build list.
	// This means the filter bar options depend on the RETURNED venues for that day.
	// This is good for "available filters based on result".
	const availableDistricts = useMemo(() => {
		const distMap = new Map<
			string,
			{ code: string; name: string; region: any }
		>();
		venues.forEach((v) => {
			if (!distMap.has(v.districtName)) {
				distMap.set(v.districtName, {
					code: v.districtCode,
					name: v.districtName,
					region: v.region,
				});
			}
		});
		return Array.from(distMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	}, [venues]);

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
				// District Filter
				if (
					selectedDistrict !== "All" &&
					venue.districtName !== selectedDistrict
				)
					return null;

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

					// Price Type Filter
					if (facility.priceType !== selectedPriceType) return;

					// Facility Type Filter
					if (
						selectedFacilityType !== "All" &&
						facility.name !== selectedFacilityType
					)
						return;

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
		selectedDistrict,
		searchQuery,
		selectedFacilityType,
		selectedPriceType,
	]);

	// Reset facility type when price type changes is handled in handlePriceTypeChange now

	// --- Handlers ---

	const handlePriceTypeChange = (type: PriceType) => {
		setSelectedPriceType(type);
		setSelectedFacilityType("All");
	};

	const handleDateSelect = (newDate: string) => {
		navigate({ search: { date: newDate }, replace: true });
		// Reset filters on date change? Maybe keep them.
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
		<div className="min-h-screen bg-porcelain-50 flex flex-col font-sans">
			{/* Date Selector */}
			<DateSelector
				dates={availableDates}
				selectedDate={selectedDate}
				onSelectDate={handleDateSelect}
			/>

			{/* Main Content Area */}
			<main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
				{/* Filter Bar Component */}
				<FilterBar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					availableDistricts={availableDistricts}
					selectedDistrict={selectedDistrict}
					onSelectDistrict={setSelectedDistrict}
					facilityGroups={currentFacilityGroups}
					selectedFacilityType={selectedFacilityType}
					onSelectFacilityType={setSelectedFacilityType}
					selectedPriceType={selectedPriceType}
					onSelectPriceType={handlePriceTypeChange}
				/>

				{/* Results Info */}
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-800">
						Available Venues
						<span className="ml-2 text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
							{filteredVenues.length}
						</span>
					</h2>
					<span className="text-sm text-gray-500">Date: {selectedDate}</span>
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
