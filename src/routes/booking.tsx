import {
	Await,
	createFileRoute,
	defer,
	useNavigate,
} from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import {
	Suspense,
	useCallback,
	useDeferredValue,
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
import { ensureI18nInitialized } from "@/lib/i18n";
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
	// Keep loader data fresh indefinitely for the same date
	// This prevents skeleton loading when only filter params change
	staleTime: Infinity,
	loader: async ({ deps: { date } }) => {
		// Ensure translations are loaded before rendering
		await ensureI18nInitialized();

		const defaultDate = new Date().toISOString().split("T")[0];

		// Defer everything to show skeleton immediately
		return {
			date,
			priceType: "Paid" as const, // Default for initial load, client state takes over
			deferredData: defer(
				Promise.all([
					getAvailableDates(),
					getBookingData({
						data: {
							date: date || defaultDate,
						},
					}),
					getDatesAvailability({
						data: {},
					}),
					getLastUpdateTime(),
					getMetadata(),
				]).then(
					([
						datesData,
						bookingData,
						availabilityData,
						lastUpdateData,
						metadataData,
					]) => {
						const availableDates =
							datesData.success && datesData.data ? datesData.data : [];
						const selectedDate = date || availableDates[0] || defaultDate;

						return {
							availableDates,
							selectedDate,
							bookingData,
							availabilityData,
							lastUpdateData,
							metadataData,
						};
					},
				),
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
					innerHTML: JSON.stringify(getBookingPageStructuredData()),
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
	const { t, i18n } = useTranslation(["booking", "common"]);

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
	useMemo(() => {
		setCurrentPage(1);
	}, []);

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

		// In production, this would make an API call to save the watcher
		console.log(
			"Watcher confirmed",
			watcherVenue.name,
			watcherSession.startTime,
		);

		setTitle(t("booking:watcher_added"));
		setMessage(t("booking:watcher_added_desc"));
		setWatcherSession(null);
		setWatcherVenue(null);
		setShowToast(true);
		setTimeout(() => setShowToast(false), 3000);
	}, [t, watcherVenue, watcherSession]);

	return (
		<div className="min-h-screen bg-background/50 flex flex-col font-sans">
			{/* Page Header for SEO */}
			<header className="sr-only">
				<h1>{t("booking:page_title", "Book Hong Kong Sports Facilities")}</h1>
				<p>
					{t(
						"booking:page_description",
						"Real-time availability for LCSD sports facilities including tennis, basketball, and badminton courts across Hong Kong",
					)}
				</p>
			</header>

			{/* Date Selector */}
			<nav aria-label="Date navigation">
				<DateSelector
					dates={availableDates}
					selectedDate={selectedDate}
					onSelectDate={handleDateSelect}
					dateStyles={dateStyles}
				/>
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
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-800">
						{t("booking:available_venues")}
						<span className="ml-2 text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
							{filteredVenues.length}
						</span>
					</h2>
					<div className="flex items-center gap-4 text-sm text-gray-500">
						{lastUpdate && (
							<time dateTime={lastUpdate.toISOString()}>
								{t("booking:last_updated")}{" "}
								{new Date(lastUpdate).toLocaleString(
									i18n.language === "zh" || i18n.language === "cn"
										? "zh-HK"
										: "en-HK",
									{
										timeZone: "Asia/Hong_Kong",
										month: "numeric",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									},
								)}
							</time>
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
				className={`fixed bottom-6 right-6 bg-primary-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-500 transform ${
					showToast ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
				} z-50`}
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
					<h4 className="font-bold">{toastTitle}</h4>
					<p className="text-pacific-blue-200 text-sm">{toastMessage}</p>
				</div>
			</div>
		</div>
	);
}
