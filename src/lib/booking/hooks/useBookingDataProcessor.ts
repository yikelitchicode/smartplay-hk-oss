import { useMemo } from "react";
import { DISTRICT_COORDINATES, type DistrictCoords } from "@/data/districts";
import type { NormalizedVenue, RegionType } from "@/lib/booking/types";
import { getRegion, isSessionPassed } from "@/lib/booking/utils";
import type {
	ServerError,
	ServerSuccess,
} from "@/lib/server-utils/error-handler";
import type {
	BookingDataPaginatedResult,
	MetadataResult,
} from "@/services/booking.service";
import { getDistance } from "@/utils/location";

interface ProcessedBookingData {
	venues: NormalizedVenue[];
	districts: {
		code: string;
		name: string;
		region: RegionType;
		nameEn?: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
		hasData?: boolean;
		totalSessions: number;
		availableSessions: number;
	}[];
	centers: {
		id: string;
		name: string;
		districtName: string;
		districtCode: string;
		nameEn?: string | null;
	}[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalVenues: number;
	};
	lastUpdate: Date | null;
	metadata: MetadataResult;
}

interface UseBookingDataProcessorParams {
	bookingData:
		| ServerError
		| ServerSuccess<BookingDataPaginatedResult>
		| undefined;
	metadataData: ServerError | ServerSuccess<MetadataResult> | undefined;
	lastUpdateData:
		| ServerError
		| ServerSuccess<{ lastUpdate: Date | null }>
		| undefined;
	userLocation: DistrictCoords | null;
}

export function useBookingDataProcessor({
	bookingData,
	metadataData,
	lastUpdateData,
	userLocation,
}: UseBookingDataProcessorParams): ProcessedBookingData {
	return useMemo(() => {
		let venues: NormalizedVenue[] = [];
		let paginationData = { currentPage: 1, totalPages: 1, totalVenues: 0 };
		let districtsList: ProcessedBookingData["districts"] = [];
		let centersList: ProcessedBookingData["centers"] = [];

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
				// Recalculate isPassed on the client side for real-time accuracy
				// The server might have cached data where isPassed is false, but it's now true

				const facilities = Object.entries(v.facilities).reduce(
					(acc, [key, facility]) => {
						acc[key] = {
							...facility,
							sessions: facility.sessions.map((s) => ({
								...s,
								isPassed: isSessionPassed(s.date, s.startTime),
							})),
						};
						return acc;
					},
					{} as typeof v.facilities,
				);

				return {
					...v,
					facilities,
					distance,
					imageUrl: v.imageUrl || "/placeholder-venue.jpg",
					region: getRegion(v.districtCode),
				};
			});
			paginationData = bookingData.data.pagination;
			centersList = bookingData.data.centers.map((c) => ({
				...c,
				districtName: c.districtName || "",
				districtCode: c.districtCode || "",
			}));
		}

		// Use dynamic data if available, otherwise fallback to static metadata
		if (bookingData?.success && bookingData.data) {
			districtsList = bookingData.data.districts.map((d) => ({
				...d,
				region: getRegion(d.code),
				hasData: d.hasData,
				totalSessions: d.totalSessions,
				availableSessions: d.availableSessions,
			}));
		} else if (metadataData?.success && metadataData.data) {
			districtsList = metadataData.data.districts.map((d) => ({
				code: d.code,
				name: d.name,
				nameEn: d.nameEn,
				nameTc: d.nameTc,
				nameSc: d.nameSc,
				region: getRegion(d.code),
				hasData: false,
				totalSessions: 0,
				availableSessions: 0,
			}));
		}

		return {
			venues,
			districts: districtsList,
			centers: centersList,
			pagination: paginationData,
			lastUpdate:
				lastUpdateData?.success && lastUpdateData.data
					? lastUpdateData.data.lastUpdate
					: null,
			metadata: (metadataData?.success && metadataData.data
				? metadataData.data
				: {
						districts: [],
						facilityTypes: [],
						facilityGroups: [],
						centers: [],
					}) as MetadataResult,
		};
	}, [bookingData, lastUpdateData, metadataData, userLocation]);
}
