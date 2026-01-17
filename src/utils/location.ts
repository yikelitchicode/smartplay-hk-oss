import { DISTRICT_COORDINATES, type DistrictCoords } from "../data/districts";
import { type DistrictCode, VALID_DISTRICTS } from "../lib/crawler/config";

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param coord1 First set of latitude/longitude
 * @param coord2 Second set of latitude/longitude
 * @returns Distance in kilometers
 */
export function getDistance(
	coord1: DistrictCoords,
	coord2: DistrictCoords,
): number {
	const R = 6371; // Earth's radius in kilometers
	const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
	const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((coord1.lat * Math.PI) / 180) *
			Math.cos((coord2.lat * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Finds the nearest district to a given GPS location.
 *
 * @param userCoords The user's current latitude and longitude
 * @returns The DistrictCode of the closest district
 */
export function getNearestDistrict(userCoords: DistrictCoords): DistrictCode {
	let nearestDistrict: DistrictCode = "CW"; // Default fallback
	let minDistance = Number.MAX_VALUE;

	for (const district of VALID_DISTRICTS) {
		const districtCoords = DISTRICT_COORDINATES[district];
		const distance = getDistance(userCoords, districtCoords);

		if (distance < minDistance) {
			minDistance = distance;
			nearestDistrict = district;
		}
	}

	return nearestDistrict;
}

/**
 * Sorts all districts based on their distance from a given GPS location.
 *
 * @param userCoords The user's current latitude and longitude
 * @returns An array of district codes sorted from nearest to furthest
 */
export function getDistrictsByDistance(
	userCoords: DistrictCoords,
): DistrictCode[] {
	return [...VALID_DISTRICTS].sort((a, b) => {
		const distA = getDistance(userCoords, DISTRICT_COORDINATES[a]);
		const distB = getDistance(userCoords, DISTRICT_COORDINATES[b]);
		return distA - distB;
	});
}
