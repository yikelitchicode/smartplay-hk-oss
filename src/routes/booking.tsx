import {
	createFileRoute,
	defer,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Check } from "lucide-react";
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
	BookingModal,
	BookingPending,
	DateSelector,
	FilterBar,
	VenueCard,
	VenueListSkeleton,
	WatcherModal,
} from "@/components/booking";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/Pagination";
import { DISTRICT_COORDINATES, type DistrictCoords } from "@/data/districts";
import { parsePriceType } from "@/lib/booking";
import {
	useBookingFilters,
	useBookingNavigation,
	useBookingStats,
} from "@/lib/booking/hooks";
import type {
	NormalizedSession,
	NormalizedVenue,
	RegionType,
} from "@/lib/booking/types";
import {
	type AvailabilityTheme,
	getAvailabilityColor,
	getRegion,
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
import { getWatchers } from "@/server-functions/watch/watcher";
import type {
	BookingDataPaginatedResult,
	MetadataResult,
} from "@/services/booking.service";
import { getDistance } from "@/utils/location";

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

/**
 * Generate dynamic meta tags for the booking page
 */
function getBookingPageMeta() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: "https://smartplay.hk";
	const canonical = `${baseUrl}/booking`;

	return {
		title: "LCSD Sports Facilities Availability | SmartPlay HK OSS",
		description:
			"Open-source availability checker for Hong Kong LCSD sports facilities. Check real-time availability for tennis, basketball, badminton courts across all Hong Kong districts. Booking must be completed on the official LCSD SmartPlay website.",
		ogTitle: "SmartPlay HK OSS - LCSD Facilities Availability Checker",
		ogDescription:
			"Open-source tool to check Hong Kong LCSD sports facility availability in real-time. Find available tennis, basketball, and badminton courts. Official booking via LCSD SmartPlay website.",
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

			const [bookingData, detailedStats, availabilityData] = await Promise.all([
				getBookingData({
					data: {
						date: targetDate,
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

	// Modal state for watcher
	const [watcherSession, setWatcherSession] =
		useState<NormalizedSession | null>(null);
	const [watcherVenue, setWatcherVenue] = useState<NormalizedVenue | null>(
		null,
	);

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

	// Handle watch click
	const handleWatchClick = useCallback(
		(venue: NormalizedVenue, session: NormalizedSession) => {
			setWatcherVenue(venue);
			setWatcherSession(session);
		},
		[],
	);

	const confirmWatcher = useCallback(() => {
		if (!watcherVenue || !watcherSession) return;

		setTitle(t("booking:watcher_added"));
		setMessage(t("booking:watcher_added_desc"));
		setWatcherSession(null);
		setWatcherVenue(null);
		setShowToast(true);
		setTimeout(() => setShowToast(false), 3000);
	}, [t, watcherVenue, watcherSession]);

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
				onWatchClick={handleWatchClick}
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

			{watcherSession && watcherVenue && (
				<WatcherModal
					session={watcherSession}
					venue={watcherVenue}
					onClose={() => setWatcherSession(null)}
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

interface Metadata extends MetadataResult {}

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
	const { t } = useTranslation(["booking", "common"]);

	// Resolve the deferred promise
	const [dynamicData, setDynamicData] = useState<BookingDeferredResult | null>(
		null,
	);
	// We need to track if we are loading new data
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let active = true;
		setIsLoading(true);
		// Reset data to show skeleton, or keep stale?
		// User specifically wanted skeleton for venue section
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

	// Watched Sessions State - Track which sessions are being watched
	const [watchedSessionIds, setWatchedSessionIds] = useState<Set<string>>(
		new Set(),
	);

	// Fetch watchers on component mount
	useEffect(() => {
		let active = true;
		const fetchWatchers = async () => {
			try {
				const result = await getWatchers({ data: {} });
				if (active && result?.success && result.data) {
					const ids = new Set(
						result.data
							.map((w) => w.targetSessionId)
							.filter((id): id is string => id !== null),
					);
					setWatchedSessionIds(ids);
				}
			} catch (error) {
				console.error("Failed to fetch watchers:", error);
			}
		};
		fetchWatchers();
		return () => {
			active = false;
		};
	}, []);

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

	// Process raw data
	const { venues, districts, centers, pagination, lastUpdate, metadata } =
		useMemo(() => {
			let venues: NormalizedVenue[] = [];
			let paginationData = { currentPage: 1, totalPages: 1, totalVenues: 0 };
			let districtsList: {
				code: string;
				name: string;
				region: RegionType;
				nameEn?: string | null;
				nameTc?: string | null;
				nameSc?: string | null;
				hasData?: boolean;
				totalSessions: number;
				availableSessions: number;
			}[] = [];
			let centersList: {
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
			}[] = [];

			if (bookingData?.success && bookingData.data) {
				venues = bookingData.data.venues.map((v: NormalizedVenue) => {
					let distance: number | undefined;
					if (userLocation) {
						const dCoords =
							DISTRICT_COORDINATES[
								v.districtCode as keyof typeof DISTRICT_COORDINATES
							];
						if (dCoords) {
							distance = getDistance(userLocation, dCoords);
						}
					}
					return {
						...v,
						distance,
						imageUrl: v.imageUrl || "/placeholder-venue.jpg",
						region: getRegion(v.districtCode),
					};
				});
				paginationData = bookingData.data.pagination;
				centersList = bookingData.data.centers.map(
					(c: {
						id: string;
						name: string;
						nameEn?: string | null;
						districtName: string;
						districtCode: string;
					}) => ({
						...c,
						districtName: c.districtName || "",
						districtCode: c.districtCode || "",
					}),
				);
			}

			// Use dynamic data if available, otherwise fallback to static metadata
			// This prevents the district list from disappearing during loading
			if (bookingData?.success && bookingData.data) {
				districtsList = bookingData.data.districts.map(
					(d: {
						code: string;
						name: string;
						nameEn?: string | null;
						nameTc?: string | null;
						nameSc?: string | null;
						hasData?: boolean;
						totalSessions: number;
						availableSessions: number;
					}) => ({
						...d,
						region: getRegion(d.code),
						hasData: d.hasData,
						totalSessions: d.totalSessions,
						availableSessions: d.availableSessions,
					}),
				);
			} else if (metadataData?.success && metadataData.data) {
				// Fallback to static metadata
				districtsList = metadataData.data.districts.map((d) => ({
					code: d.code,
					name: d.name,
					nameEn: d.nameEn,
					nameTc: d.nameTc,
					nameSc: d.nameSc,
					region: getRegion(d.code),
					hasData: false, // Unknown while loading
					totalSessions: 0,
					availableSessions: 0,
				}));
			}

			return {
				venues,
				pagination: paginationData,
				districts: districtsList,
				centers: centersList,
				lastUpdate:
					lastUpdateData.success && lastUpdateData.data
						? lastUpdateData.data.lastUpdate
						: null,
				metadata: (metadataData.success && metadataData.data
					? metadataData.data
					: {
							districts: [],
							facilityTypes: [],
							facilityGroups: [],
							centers: [],
						}) as Metadata,
			};
		}, [bookingData, lastUpdateData, metadataData, userLocation]);

	const dateAvailability = useMemo(() => {
		return availabilityData?.success && availabilityData.data
			? availabilityData.data
			: {};
	}, [availabilityData]);

	const {
		districts: searchDistricts,
		center: searchCenter,
		facility: searchFacility,
		priceType: searchPriceType,
		page: searchPage,
	} = Route.useSearch();

	// Type-safe price type parsing
	// Type-safe price type parsing, fallback to loader provided default
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
		handleSearchChange, // Added this
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

	// Date styles for calendar
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

	// Modal state removed (lifted to parent)

	return (
		<div className="min-h-screen bg-background/50 flex flex-col font-sans">
			{/* Date Selector */}
			<nav aria-label="Date navigation">
				<DateSelector
					dates={availableDates}
					selectedDate={selectedDate}
					onSelectDate={handleDateSelect}
					dateStyles={dateStyles}
				>
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-4">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
								{t("booking:page_title", "Book Hong Kong Sports Facilities")}
								<Badge variant="primary" size="sm">
									Beta
								</Badge>
							</h1>
							<p className="text-muted-foreground mt-1 text-base md:text-lg">
								{t(
									"booking:page_description",
									"Real-time availability for LCSD sports facilities including tennis, basketball, and badminton courts across Hong Kong",
								)}
							</p>
						</div>
						<Link to="/">
							<Button variant="ghost" size="sm" className="gap-2 shrink-0">
								<ArrowLeft size={16} /> {t("common:nav.home", "Home")}
							</Button>
						</Link>
					</div>
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
				<style>{`
					:root {
						--color-primary: var(--color-pacific-blue-600);
						--color-primary-hover: var(--color-pacific-blue-700);
					}
				`}</style>

				{/* Results Info */}
				<div className="flex flex-col gap-3 py-2">
					<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
						<div className="space-y-1">
							<h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
								{t("booking:available_venues")}
								<span className="text-sm font-bold text-pacific-blue-600 bg-pacific-blue-50 px-2.5 py-0.5 rounded-full border border-pacific-blue-100 uppercase tracking-widest cursor-default">
									{pagination.totalVenues}
								</span>
							</h2>
						</div>

						{lastUpdate && (
							<div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold text-gray-500 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm self-start sm:self-auto">
								<div className="w-2 h-2 rounded-full bg-meadow-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
								<time
									dateTime={lastUpdate.toISOString()}
									className="flex items-center gap-1.5 uppercase tracking-wider"
								>
									<span className="opacity-60">
										{t("booking:last_updated")}
									</span>
									<span className="text-gray-900 whitespace-nowrap">
										{new Date(lastUpdate)
											.toLocaleString("en-GB", {
												day: "2-digit",
												month: "2-digit",
												hour: "2-digit",
												minute: "2-digit",
												hour12: true,
												timeZone: "Asia/Hong_Kong",
											})
											.toLowerCase()
											.replace(",", "")}{" "}
										HKT
									</span>
								</time>
							</div>
						)}
					</div>
				</div>

				{/* Venues Grid */}
				<div className="grid grid-cols-1 gap-6">
					{isLoading || isFilteringPending ? (
						<VenueListSkeleton />
					) : venues.length > 0 ? (
						venues.map((venue) => (
							<VenueCard
								key={venue.id}
								venue={venue}
								onSessionClick={onSessionClick}
								onWatchClick={onWatchClick}
								watchedSessionIds={watchedSessionIds}
							/>
						))
					) : (
						<div className="flex flex-col items-center justify-center py-20 text-gray-400">
							<div className="mb-4 opacity-50">
								<CalendarDays size={48} />
							</div>
							<p className="text-lg font-medium">{t("booking:no_venues")}</p>
							<p className="text-sm">{t("booking:no_venues_hint")}</p>
						</div>
					)}
				</div>

				{/* Pagination Controls */}
				{!isLoading && !isFilteringPending && totalPages > 1 && (
					<Pagination className="mt-8">
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() =>
										navigate({
											search: (prev) => ({
												...prev,
												page: Math.max(1, currentPage - 1),
											}),
										})
									}
									disabled={currentPage === 1}
								/>
							</PaginationItem>

							{/* First Page */}
							{currentPage > 2 && (
								<PaginationItem>
									<PaginationLink
										onClick={() =>
											navigate({ search: (prev) => ({ ...prev, page: 1 }) })
										}
										isActive={currentPage === 1}
									>
										1
									</PaginationLink>
								</PaginationItem>
							)}

							{/* Ellipsis Start */}
							{currentPage > 3 && (
								<PaginationItem>
									<PaginationEllipsis />
								</PaginationItem>
							)}

							{/* Current Range */}
							{Array.from({ length: totalPages }, (_, i) => i + 1)
								.filter(
									(page) =>
										page === currentPage ||
										page === currentPage - 1 ||
										page === currentPage + 1,
								)
								.map((page) => (
									<PaginationItem key={page}>
										<PaginationLink
											onClick={() =>
												navigate({ search: (prev) => ({ ...prev, page }) })
											}
											isActive={currentPage === page}
										>
											{page}
										</PaginationLink>
									</PaginationItem>
								))}

							{/* Ellipsis End */}
							{currentPage < totalPages - 2 && (
								<PaginationItem>
									<PaginationEllipsis />
								</PaginationItem>
							)}

							{/* Last Page */}
							{/* Allow showing last page if it wasn't already shown in the range */}
							{currentPage < totalPages - 1 && (
								<PaginationItem>
									<PaginationLink
										onClick={() =>
											navigate({
												search: (prev) => ({ ...prev, page: totalPages }),
											})
										}
										isActive={currentPage === totalPages}
									>
										{totalPages}
									</PaginationLink>
								</PaginationItem>
							)}

							<PaginationItem>
								<PaginationNext
									onClick={() =>
										navigate({
											search: (prev) => ({
												...prev,
												page: Math.min(totalPages, currentPage + 1),
											}),
										})
									}
									disabled={currentPage === totalPages}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				)}
			</main>

			{/* Modals and Toast moved to parent */}
		</div>
	);
}
