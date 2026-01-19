import { createFileRoute, defer, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
	BookingHeader,
	BookingModal,
	BookingPagination,
	BookingPending,
	BookingResultsInfo,
	DateSelector,
	FilterBar,
	VenueList,
	WatcherModal,
} from "@/components/booking";
import type { DistrictCoords } from "@/data/districts";
import { parsePriceType } from "@/lib/booking";
import {
	useBookingDataProcessor,
	useBookingFilters,
	useBookingNavigation,
	useBookingStats,
	useWatcherSync,
} from "@/lib/booking/hooks";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";
import {
	type AvailabilityTheme,
	getAvailabilityColor,
} from "@/lib/booking/utils";
import { initializeI18n } from "@/lib/i18n";
import type {
	ServerError,
	ServerSuccess,
} from "@/lib/server-utils/error-handler";
import {
	getAvailableDates,
	getBookingData,
	getLastUpdateTime,
	getMetadata,
} from "@/server-functions/booking";
import {
	getCalendarStats as getCalendarStatsFn,
	getDetailedStats as getDetailedStatsFn,
} from "@/server-functions/stats";
import type {
	BookingDataPaginatedResult,
	MetadataResult,
} from "@/services/booking.service";

// Search Params Schema
const searchSchema = z.object({
	date: z.string().optional(),
	districts: z.array(z.string()).optional(),
	center: z.string().optional(),
	facility: z.string().optional(),
	priceType: z.enum(["Paid", "Free"]).optional(),
	page: z.number().optional().default(1),
});

interface BookingDeferredResult {
	bookingData: ServerError | ServerSuccess<BookingDataPaginatedResult>;
	detailedStats:
		| ServerError
		| ServerSuccess<{
				dateStats: Record<string, { t: number; a: number }>;
				districtStats: Record<string, { t: number; a: number }>;
				centerStats: Record<string, { t: number; a: number }>;
				facilityStats: Record<string, { t: number; a: number }>;
		  }>;
	availabilityData:
		| ServerError
		| ServerSuccess<Record<string, { t: number; a: number }>>;
}

import i18n from "@/lib/i18n";

/**
 * Generate dynamic meta tags for the booking page
 */
function getBookingPageMeta() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: "https://smartplay.hk";
	const canonical = `${baseUrl}/booking`;

	const title = i18n.t("booking.seo.title", {
		ns: "booking",
		defaultValue: "康文署體育設施可用位置查詢 | SmartPlay HK OSS",
	});
	const description = i18n.t("booking.seo.description", {
		ns: "booking",
		defaultValue:
			"香港康文署體育設施可用性查詢開源工具。實時查詢全港各地區網球場、籃球場、羽毛球場的可用情況。預訂程序必須在康文署 SmartPlay 官方網站完成。",
	});
	const ogTitle = i18n.t("booking.seo.ogTitle", {
		ns: "booking",
		defaultValue: "SmartPlay HK OSS - 康文署設施可用性查詢",
	});
	const ogDescription = i18n.t("booking.seo.ogDescription", {
		ns: "booking",
		defaultValue:
			"開源工具實時查詢香港康文署體育設施可用性。尋找可用的網球、籃球及羽毛球場。官方預訂請前往康文署 SmartPlay 網站。",
	});

	return {
		title,
		description,
		ogTitle,
		ogDescription,
		ogImage: `${baseUrl}/og-image.jpg`,
		twitterCard: "summary_large_image",
		canonical,
	};
}

/**
 * Generate structured data (JSON-LD) for the booking page
 */
function getBookingPageStructuredData() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: "https://smartplay.hk";

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebApplication",
				"@id": `${baseUrl}/booking#webapp`,
				name: "SmartPlay HK OSS - LCSD Facilities Availability Checker",
				description:
					"Open-source utility for checking real-time availability of Hong Kong LCSD sports facilities. Booking must be completed on the official LCSD SmartPlay website.",
				url: `${baseUrl}/booking`,
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "Web",
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "HKD",
					description: "Free open-source availability checking service",
				},
				provider: {
					"@type": "Organization",
					name: "SmartPlay HK OSS",
					url: baseUrl,
				},
				featureList: [
					"Real-time availability checking",
					"Multi-district coverage",
					"Multiple facility types",
					"Filtering and search",
				],
				about: {
					"@type": "Thing",
					name: "LCSD Sports Facilities",
					description:
						"Leisure and Cultural Services Department sports facilities in Hong Kong",
				},
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Home",
						item: baseUrl,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: "Facility Availability",
						item: `${baseUrl}/booking`,
					},
				],
			},
		],
	};
}

export const Route = createFileRoute("/booking")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		date: search.date,
		districts: search.districts,
		center: search.center,
		facility: search.facility,
		priceType: search.priceType,
		page: search.page,
	}),
	// Data refreshes every 30 minutes on the server
	// Cache for 30 minutes to match server cycle while allowing instant navigation
	staleTime: 30 * 60 * 1000,
	gcTime: 60 * 60 * 1000,
	loader: async ({ deps }) => {
		// Ensure translations are loaded before rendering
		await initializeI18n();

		const defaultDate = new Date().toISOString().split("T")[0];
		const { date, districts, center, facility, priceType, page } = deps;

		// 1. Start fetching data
		// We await static/fast data to render the shell immediately
		// We defer heavy data (booking list, stats) to show a partial skeleton
		const metadataPromise = getMetadata();
		const lastUpdatePromise = getLastUpdateTime();
		const datesPromise = getAvailableDates();

		// Use new stats endpoint for calendar - DEFERRED
		// Pass all filters so availability reflects current selection
		const availabilityPromise = getCalendarStatsFn({
			data: {
				data: {
					districts: districts,
					venueId: center === "All" ? undefined : center,
					facilityCode: facility === "All" ? undefined : facility,
					priceType: parsePriceType(priceType || "Paid", "Paid"),
				},
			},
		});

		// 2. Resolve static data first
		const [metadataData, lastUpdateData, datesResult] = await Promise.all([
			metadataPromise,
			lastUpdatePromise,
			datesPromise,
		]);

		// 3. Determine Selected Date
		const availableDates =
			datesResult?.success && datesResult.data ? datesResult.data : [];

		let targetDate = date || defaultDate;
		// Refine targetDate based on availability if no date was specified
		if (!date && availableDates.length > 0) {
			if (availableDates.includes(defaultDate)) {
				targetDate = defaultDate;
			} else {
				targetDate = availableDates[0];
			}
		}

		// 4. Create Deferred Promise for Dynamic Data
		const deferredData = (async () => {
			const normalizedPriceType = parsePriceType(priceType, "Paid");

			// Prepare filters
			const filters = {
				districts: districts,
				venueId: center === "All" ? undefined : center,
				facilityCode: facility === "All" ? undefined : facility,
				priceType: normalizedPriceType,
			};

			// Check if target date is beyond the standard 8-day live window
			// If so, we fetch today's data to get the venue structure (names, facilities)
			// effectively mirroring the "All" view for future projections.
			const today = new Date();
			const target = new Date(targetDate);
			const diffTime = target.getTime() - today.getTime();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			const isFarFuture = diffDays > 8;

			const [bookingData, detailedStats, availabilityData] = await Promise.all([
				getBookingData({
					data: {
						date: isFarFuture ? defaultDate : targetDate,
						filters,
						page: page || 1,
						pageSize: 6,
					},
				}),
				getDetailedStatsFn({
					data: {
						date: targetDate,
						priceType: normalizedPriceType,
					},
				}),
				availabilityPromise,
			]);

			return {
				bookingData,
				detailedStats,
				availabilityData,
			};
		})();

		return {
			...deps,
			priceType: "Paid" as const, // Default, client state takes over
			// Static Data (Available Immediately)
			availableDates,
			selectedDate: targetDate,
			metadataData,
			lastUpdateData,
			// Dynamic Data (Deferred)
			deferredData: defer(deferredData),
		};
	},
	component: BookingPage,
	pendingComponent: BookingPending,
	head: () => {
		const {
			title,
			description,
			ogTitle,
			ogDescription,
			ogImage,
			twitterCard,
			canonical,
		} = getBookingPageMeta();

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: ogTitle },
				{ property: "og:description", content: ogDescription },
				{ property: "og:type", content: "website" },
				{ property: "og:image", content: ogImage },
				{ property: "og:url", content: canonical },
				{ name: "twitter:card", content: twitterCard },
				{ name: "twitter:title", content: ogTitle },
				{ name: "twitter:description", content: ogDescription },
				{ name: "twitter:image", content: ogImage },
				{ name: "twitter:url", content: canonical },
				{ name: "robots", content: "index, follow" },
			],
			links: [
				{ rel: "canonical", href: canonical },
				// English
				{ rel: "alternate", hrefLang: "en", href: `${canonical}?lng=en` },
				// Chinese Simplified
				{ rel: "alternate", hrefLang: "zh-Hans", href: `${canonical}?lng=cn` },
				// Chinese Traditional
				{ rel: "alternate", hrefLang: "zh-Hant", href: `${canonical}?lng=zh` },
				// Hong Kong Chinese (default)
				{ rel: "alternate", hrefLang: "zh-HK", href: canonical },
				// x-default for language negotiation
				{
					rel: "alternate",
					hrefLang: "x-default",
					href: `${canonical}?lng=en`,
				},
			],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify(getBookingPageStructuredData()),
				},
			],
		};
	},
});

/**
 * Booking page component
 *
 * Uses extracted custom hooks for:
 * - Filter state management (useBookingFilters)
 * - URL navigation (useBookingNavigation)
 * - Venue filtering (useVenueFilters)
 * - Statistics calculation (useBookingStats)
 */
function BookingPage() {
	const {
		deferredData,
		priceType,
		availableDates,
		selectedDate,
		metadataData,
		lastUpdateData,
	} = Route.useLoaderData();
	const { t } = useTranslation(["booking"]);

	// Modal state for booking
	const [bookingSession, setBookingSession] =
		useState<NormalizedSession | null>(null);
	const [bookingVenue, setBookingVenue] = useState<NormalizedVenue | null>(
		null,
	);

	// Watcher Modal State
	const [watcherModalSession, setWatcherModalSession] =
		useState<NormalizedSession | null>(null);
	const [watcherModalVenue, setWatcherModalVenue] =
		useState<NormalizedVenue | null>(null);

	const [showToast, setShowToast] = useState(false);
	const [toastTitle, setTitle] = useState("");
	const [toastMessage, setMessage] = useState("");

	// Handle session click to open booking modal
	const handleSessionClick = useCallback(
		(venue: NormalizedVenue, session: NormalizedSession) => {
			setBookingVenue(venue);
			setBookingSession(session);
		},
		[],
	);

	// Handle booking confirmation
	const confirmBooking = useCallback(() => {
		setBookingSession(null);
		setBookingVenue(null);
		setTitle(t("booking:booking_confirmed"));
		setMessage(t("booking:booking_confirmed_msg"));
		setShowToast(true);
		setTimeout(() => setShowToast(false), 3000);
	}, [t]);

	// Handler for subscribing to a session
	const handleSubscribe = useCallback(
		(venue: NormalizedVenue, session: NormalizedSession) => {
			setWatcherModalSession(session);
			setWatcherModalVenue(venue);
		},
		[],
	);

	const confirmWatcher = useCallback(() => {
		if (!watcherModalVenue || !watcherModalSession) return;

		setTitle(t("booking:watcher_added"));
		setMessage(t("booking:watcher_added_desc"));
		setWatcherModalSession(null);
		setWatcherModalVenue(null);
		setShowToast(true);
		setTimeout(() => setShowToast(false), 3000);
	}, [t, watcherModalVenue, watcherModalSession]);

	return (
		<>
			{/* No Suspense/Await here - passed directly to content */}
			<BookingPageContent
				availableDates={availableDates}
				selectedDate={selectedDate}
				deferredDataPromise={deferredData}
				lastUpdateData={lastUpdateData}
				metadataData={metadataData}
				currentPriceType={priceType}
				onSessionClick={handleSessionClick}
				onWatchClick={handleSubscribe}
			/>

			{/* Modals */}
			{bookingSession && bookingVenue && (
				<BookingModal
					session={bookingSession}
					venue={bookingVenue}
					onClose={() => setBookingSession(null)}
					onConfirm={confirmBooking}
				/>
			)}

			{watcherModalSession && watcherModalVenue && (
				<WatcherModal
					session={watcherModalSession}
					venue={watcherModalVenue}
					onClose={() => setWatcherModalSession(null)}
					onConfirm={confirmWatcher}
				/>
			)}

			{/* Toast Notification */}
			<div
				className={`fixed bottom-8 right-8 bg-pacific-blue-950/95 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl transition-all duration-500 transform ${
					showToast
						? "translate-y-0 opacity-100 scale-100"
						: "translate-y-12 opacity-0 scale-95"
				} z-50 max-w-sm`}
			>
				<div className="bg-meadow-green-500 p-2 rounded-xl shadow-lg shadow-meadow-green-500/20">
					<Check
						className="w-5 h-5 text-white"
						strokeWidth={3}
						role="img"
						aria-label="Success Icon"
					/>
				</div>
				<div className="flex-1">
					<h4 className="font-black text-sm uppercase tracking-wider text-white">
						{toastTitle}
					</h4>
					<p className="text-pacific-blue-200/90 text-xs font-bold leading-relaxed">
						{toastMessage}
					</p>
				</div>
			</div>
		</>
	);
}

function BookingPageContent({
	availableDates,
	selectedDate,
	deferredDataPromise,
	lastUpdateData,
	metadataData,
	currentPriceType,
	onSessionClick,
	onWatchClick,
}: {
	availableDates: string[];
	selectedDate: string;
	deferredDataPromise: Promise<BookingDeferredResult>;
	lastUpdateData: ServerError | ServerSuccess<{ lastUpdate: Date | null }>;
	metadataData: ServerError | ServerSuccess<MetadataResult>;
	currentPriceType: "Paid" | "Free";
	onSessionClick: (venue: NormalizedVenue, session: NormalizedSession) => void;
	onWatchClick: (venue: NormalizedVenue, session: NormalizedSession) => void;
}) {
	// Resolve the deferred promise
	const [dynamicData, setDynamicData] = useState<BookingDeferredResult | null>(
		null,
	);
	// We need to track if we are loading new data
	const [isLoading, setIsLoading] = useState(true);

	// Tab state for Future Sessions - Removed (Feature hidden)
	// const [activeTab, setActiveTab] = useState<"live" | "future">("live");

	useEffect(() => {
		let active = true;
		setIsLoading(true);
		setDynamicData(null);

		deferredDataPromise
			.then((res) => {
				if (active) {
					setDynamicData(res);
					setIsLoading(false);
				}
			})
			.catch((err) => {
				console.error("Failed to resolve deferred data", err);
				if (active) setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, [deferredDataPromise]);

	// Extract data from dynamic result (safely handle nulls)
	const bookingData = dynamicData?.bookingData;
	const detailedStats = dynamicData?.detailedStats;
	const availabilityData = dynamicData?.availabilityData;

	// User Location State
	const [userLocation, setUserLocation] = useState<DistrictCoords | null>(null);
	const [isLocating, setIsLocating] = useState(false);

	// Watchers Sync Hook - No argument needed, we sync all active watchers
	const { watchedSessionIds } = useWatcherSync();

	const handleLocate = useCallback(() => {
		if (!navigator.geolocation) {
			alert("Geolocation is not supported by your browser");
			return;
		}

		setIsLocating(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setUserLocation({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
				setIsLocating(false);
			},
			(error) => {
				console.error("Error getting location:", error);
				setIsLocating(false);
			},
		);
	}, []);

	const {
		districts: searchDistricts,
		center: searchCenter,
		facility: searchFacility,
		priceType: searchPriceType,
		page: searchPage,
	} = Route.useSearch();

	// Type-safe price type parsing
	const selectedPriceType = parsePriceType(
		searchPriceType || currentPriceType,
		"Paid",
	);

	// Navigation management
	const { handlePriceTypeChange, handleDateSelect } = useBookingNavigation({
		fullPath: Route.fullPath,
	});

	// Navigation hook
	const navigate = useNavigate({ from: Route.fullPath });

	// Filter state management with URL sync
	const {
		selectedDistricts,
		selectedCenter,
		selectedFacilityCode,
		searchQuery,
		handleSelectDistrict,
		handleSelectCenter,
		handleSelectFacility,
		handleResetFilters,
		handleSearchChange,
	} = useBookingFilters({
		initialDistricts: searchDistricts || ["All"],
		initialCenter: searchCenter || "All",
		initialFacility: searchFacility || "All",
		onNavigate: (updates) => {
			navigate({
				search: (prev) => ({
					...prev,
					...updates,
					page: 1, // Always reset to page 1 on filter change
				}),
			});
		},
	});

	// Defer expensive filtering and stats calculation
	const deferredSearchQuery = useDeferredValue(searchQuery);
	const deferredDistricts = useDeferredValue(selectedDistricts);
	const deferredCenter = useDeferredValue(selectedCenter);
	const deferredFacility = useDeferredValue(selectedFacilityCode);
	const deferredPriceType = useDeferredValue(selectedPriceType);

	// Detect if a transition is pending (client-side only)
	const isFilteringPending =
		searchQuery !== deferredSearchQuery ||
		selectedDistricts !== deferredDistricts ||
		selectedCenter !== deferredCenter ||
		selectedFacilityCode !== deferredFacility ||
		selectedPriceType !== deferredPriceType;

	// Process raw data using custom hook
	const { venues, districts, centers, pagination, lastUpdate, metadata } =
		useBookingDataProcessor({
			bookingData,
			metadataData,
			lastUpdateData,
			userLocation,
		});

	// Pagination State
	const currentPage = searchPage || 1;
	// Use backend total pages if available
	const totalPages = pagination.totalPages;

	// Stats from server
	const serverStats = useMemo(() => {
		if (detailedStats?.success && detailedStats.data) {
			return detailedStats.data;
		}
		return undefined;
	}, [detailedStats]);

	const {
		districtStyles,
		centerStyles,
		facilityStyles,
		availableDistricts,
		availableCenters,
	} = useBookingStats({
		venues: [], // No longer need all venues for calculation
		districts,
		centers,
		selectedDistricts: deferredDistricts,
		selectedCenter: deferredCenter,
		selectedFacilityCode: deferredFacility,
		selectedPriceType: deferredPriceType,
		stats: serverStats,
		userLocation: userLocation,
	});

	const dateAvailability = useMemo(() => {
		return availabilityData?.success && availabilityData.data
			? availabilityData.data
			: {};
	}, [availabilityData]);

	// Date styles for calendar
	const dateStyles = useMemo(() => {
		const styles: Record<string, AvailabilityTheme> = {};
		Object.keys(dateAvailability || {}).forEach((date) => {
			if (availabilityData?.success && availabilityData.data) {
				styles[date] = getAvailabilityColor(
					availabilityData.data[date].t,
					availabilityData.data[date].a,
				);
			}
		});
		return styles;
	}, [dateAvailability, availabilityData]);

	// Current facility groups based on price type - from database
	const currentFacilityGroups = useMemo(() => {
		const isFree = selectedPriceType === "Free";
		return metadata.facilityGroups
			.map((g) => ({
				...g,
				facilities: g.facilities.filter((f) => f.isFree === isFree),
			}))
			.filter((g) => g.facilities.length > 0)
			.map((g) => ({
				label: g.name + (g.nameEn ? ` (${g.nameEn})` : ""),
				value: g.code,
				options: g.facilities.map((f) => ({
					label: f.name,
					value: f.code,
				})),
			}));
	}, [selectedPriceType, metadata.facilityGroups]);

	// Generate future dates - Kept for reference but unused in UI
	/*
	const futureDates = useMemo(() => {
		const dates: string[] = [];
		const today = new Date();
		for (let i = 9; i <= 36; i++) {
			const d = new Date(today);
			d.setDate(today.getDate() + i);
			dates.push(d.toISOString().split("T")[0]);
		}
		return dates;
	}, []);
	*/

	/*
	const handleTabChange = (tab: "live" | "future") => {
		setActiveTab(tab);
		if (tab === "future") {
			const today = new Date();
			const futureStart = new Date(today);
			futureStart.setDate(today.getDate() + 9);
			navigate({
				search: (prev) => ({
					...prev,
					date: format(futureStart, "yyyy-MM-dd"),
				}),
			})
		} else {
			navigate({
				search: (prev) => ({ ...prev, date: format(new Date(), "yyyy-MM-dd") }),
			})
		}
	}
	*/
	return (
		<div className="min-h-screen bg-background/50 flex flex-col font-sans">
			{/* Date Selector */}
			<nav aria-label="Date navigation">
				<DateSelector
					dates={availableDates.slice(0, 8)}
					selectedDate={selectedDate}
					onSelectDate={handleDateSelect}
					dateStyles={dateStyles}
				>
					<BookingHeader availableDatesCount={availableDates.length} />
				</DateSelector>
			</nav>

			{/* Main Content Area */}
			<main
				className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6"
				aria-label="Venue listings"
			>
				{/* Filter Bar Component */}
				<aside aria-label="Filter options">
					<FilterBar
						searchQuery={searchQuery}
						onSearchChange={handleSearchChange}
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
						isLoading={isLoading}
						onResetFilters={() => {
							handleResetFilters();
							setUserLocation(null);
						}}
						metadata={metadata}
						onLocate={handleLocate}
						isLocating={isLocating}
						userLocation={userLocation}
					/>
				</aside>

				{/* Tab Switcher - Removed */}
				{/* 
				<BookingTabSwitcher
					activeTab={activeTab}
					onTabChange={handleTabChange}
				/> 
				*/}

				<style>{`
					:root {
						--color-primary: var(--color-pacific-blue-600);
						--color-primary-hover: var(--color-pacific-blue-700);
					}
				`}</style>

				{/* Results Info */}
				<BookingResultsInfo
					totalVenues={pagination.totalVenues}
					lastUpdate={lastUpdate}
				/>

				{/* Venues Grid */}
				<VenueList
					venues={venues}
					isLoading={isLoading || isFilteringPending}
					onSessionClick={onSessionClick}
					onWatchClick={onWatchClick}
					watchedSessionIds={watchedSessionIds}
				/>

				{/* Pagination Controls */}
				<BookingPagination
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={(page) =>
						navigate({ search: (prev) => ({ ...prev, page }) })
					}
					isLoading={isLoading || isFilteringPending}
				/>
			</main>
		</div>
	);
}
