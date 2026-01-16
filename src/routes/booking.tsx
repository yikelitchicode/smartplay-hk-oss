import {
	Await,
	createFileRoute,
	defer,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Check } from "lucide-react";
import {
	Suspense,
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
import { parsePriceType } from "@/lib/booking";
import {
	useBookingFilters,
	useBookingNavigation,
	useBookingStats,
	useVenueFilters,
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
	getDatesAvailability,
	getLastUpdateTime,
	getMetadata,
} from "@/server-functions/booking";
import type {
	BookingDataResult,
	MetadataResult,
} from "@/services/booking.service";

// Search Params Schema
const searchSchema = z.object({
	date: z.string().optional(),
	districts: z.array(z.string()).optional(),
	center: z.string().optional(),
	facility: z.string().optional(),
	priceType: z.enum(["Paid", "Free"]).optional(),
});

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
	loaderDeps: ({ search: { date } }) => ({
		date,
	}),
	// Data refreshes every 30 minutes on the server
	// Cache for 30 minutes to match server cycle while allowing instant navigation
	staleTime: 30 * 60 * 1000,
	gcTime: 60 * 60 * 1000,
	loader: async ({ deps: { date } }) => {
		// Ensure translations are loaded before rendering
		await initializeI18n();

		const defaultDate = new Date().toISOString().split("T")[0];

		// Defer everything to show skeleton immediately
		return {
			date,
			priceType: "Paid" as const, // Default for initial load, client state takes over
			deferredData: defer(
				(async () => {
					// 1. Start fetching independent data
					const metadataPromise = getMetadata();
					const lastUpdatePromise = getLastUpdateTime();
					const availabilityPromise = getDatesAvailability({ data: {} });

					// 2. Fetch available dates to determine target date
					// If date is provided in URL, use it (optimistic).
					// If not, we must check available dates to avoid fetching empty data for defaultDate if it's not available.
					let targetDate = date || defaultDate;
					let datesResult: ServerSuccess<string[]> | ServerError | undefined;

					// If we don't have a date, we MUST fetch dates first to be safe
					if (!date) {
						try {
							datesResult = await getAvailableDates();
						} catch (e) {
							console.error("Failed to fetch dates", e);
						}
					} else {
						// If date is provided, we can fetch dates in parallel (fire and forget for now)
						// But we still need the result for the return value.
						// To keep it simple, let's just await it always, or optimize later.
						// For correctness, awaiting is safest.
						try {
							datesResult = await getAvailableDates();
						} catch (e) {
							console.error("Failed to fetch dates", e);
						}
					}

					const availableDates =
						datesResult?.success && datesResult.data ? datesResult.data : [];

					// Refine targetDate based on availability if no date was specified
					if (!date && availableDates.length > 0) {
						// If today is available, prefer it. Otherwise first available.
						if (availableDates.includes(defaultDate)) {
							targetDate = defaultDate;
						} else {
							targetDate = availableDates[0];
						}
					}

					// 3. Fetch Booking Data for the definitive targetDate
					const bookingData = await getBookingData({
						data: {
							date: targetDate,
						},
					});

					// 4. Await remaining data
					const [availabilityData, lastUpdateData, metadataData] =
						await Promise.all([
							availabilityPromise,
							lastUpdatePromise,
							metadataPromise,
						]);

					return {
						availableDates,
						selectedDate: targetDate,
						bookingData,
						availabilityData,
						lastUpdateData,
						metadataData,
					};
				})(),
			),
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
	const { deferredData, priceType } = Route.useLoaderData();

	return (
		<Suspense fallback={<BookingPending />}>
			<Await promise={deferredData}>
				{(resolved) => (
					<BookingPageContent {...resolved} currentPriceType={priceType} />
				)}
			</Await>
		</Suspense>
	);
}

interface Metadata extends MetadataResult {}

function BookingPageContent({
	availableDates,
	selectedDate,
	bookingData,
	availabilityData,
	lastUpdateData,
	metadataData,
	currentPriceType,
}: {
	availableDates: string[];
	selectedDate: string;
	bookingData: ServerError | ServerSuccess<BookingDataResult>;
	availabilityData:
		| ServerError
		| ServerSuccess<Record<string, { t: number; a: number }>>;
	lastUpdateData: ServerError | ServerSuccess<{ lastUpdate: Date | null }>;
	metadataData: ServerError | ServerSuccess<MetadataResult>;
	currentPriceType: "Paid" | "Free";
}) {
	const { t } = useTranslation(["booking", "common"]);

	// Process raw data
	const { venues, districts, centers, lastUpdate, metadata } = useMemo(() => {
		let venues: NormalizedVenue[] = [];
		let districtsList: {
			code: string;
			name: string;
			region: RegionType;
			nameEn?: string | null;
			nameTc?: string | null;
			nameSc?: string | null;
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

		if (bookingData.success && bookingData.data) {
			venues = bookingData.data.venues;
			districtsList = bookingData.data.districts.map((d) => ({
				...d,
				region: getRegion(d.code),
			}));
			centersList = bookingData.data.centers.map((c) => ({
				...c,
				districtName: c.districtName || "",
				districtCode: c.districtCode || "",
			}));
		}

		return {
			venues,
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
	}, [bookingData, lastUpdateData, metadataData]);

	const dateAvailability = useMemo(() => {
		return availabilityData.success && availabilityData.data
			? availabilityData.data
			: {};
	}, [availabilityData]);

	const {
		districts: searchDistricts,
		center: searchCenter,
		facility: searchFacility,
		priceType: searchPriceType,
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

	// Detect if a transition is pending
	const isFilteringPending =
		searchQuery !== deferredSearchQuery ||
		selectedDistricts !== deferredDistricts ||
		selectedCenter !== deferredCenter ||
		selectedFacilityCode !== deferredFacility ||
		selectedPriceType !== deferredPriceType;

	// Pagination State
	const [currentPage, setCurrentPage] = useState(1);
	const ITEMS_PER_PAGE = 6;

	const filteredVenues = useVenueFilters({
		venues,
		searchQuery: deferredSearchQuery,
		selectedDistricts: deferredDistricts,
		selectedCenter: deferredCenter,
		selectedFacilityCode: deferredFacility,
		selectedPriceType: deferredPriceType,
	});

	// Reset page when filters change
	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [
		deferredSearchQuery,
		deferredDistricts,
		deferredCenter,
		deferredFacility,
		deferredPriceType,
	]);

	const totalPages = Math.ceil(filteredVenues.length / ITEMS_PER_PAGE);
	const paginatedVenues = filteredVenues.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE,
	);

	const {
		districtStyles,
		centerStyles,
		facilityStyles,
		availableDistricts,
		availableCenters,
	} = useBookingStats({
		venues,
		districts,
		centers,
		selectedDistricts: deferredDistricts,
		selectedCenter: deferredCenter,
		selectedFacilityCode: deferredFacility,
		selectedPriceType: deferredPriceType,
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
	const [toastTitle, setTitle] = useState("");
	const [toastMessage, setMessage] = useState("");

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
						onResetFilters={handleResetFilters}
						metadata={metadata}
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
									{filteredVenues.length}
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
					{isFilteringPending ? (
						<VenueListSkeleton />
					) : filteredVenues.length > 0 ? (
						paginatedVenues.map((venue) => (
							<VenueCard
								key={venue.id}
								venue={venue}
								onSessionClick={handleSessionClick}
								onWatchClick={handleWatchClick}
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
				{!isFilteringPending && filteredVenues.length > ITEMS_PER_PAGE && (
					<Pagination className="mt-8">
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
								/>
							</PaginationItem>

							{/* First Page */}
							{currentPage > 2 && (
								<PaginationItem>
									<PaginationLink
										onClick={() => setCurrentPage(1)}
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
											onClick={() => setCurrentPage(page)}
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
										onClick={() => setCurrentPage(totalPages)}
										isActive={currentPage === totalPages}
									>
										{totalPages}
									</PaginationLink>
								</PaginationItem>
							)}

							<PaginationItem>
								<PaginationNext
									onClick={() =>
										setCurrentPage((p) => Math.min(totalPages, p + 1))
									}
									disabled={currentPage === totalPages}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				)}
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
		</div>
	);
}
