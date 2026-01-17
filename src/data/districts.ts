import type { DistrictCode } from "../lib/crawler/config";

export interface DistrictCoords {
	lat: number;
	lng: number;
}

/**
 * Centroid coordinates for the 18 districts of Hong Kong.
 * Aligned with DistrictCode from src/lib/crawler/config.ts
 */
export const DISTRICT_COORDINATES: Record<DistrictCode, DistrictCoords> = {
	// Hong Kong Island
	CW: { lat: 22.28472, lng: 114.15 }, // Central and Western
	EN: { lat: 22.28411, lng: 114.22414 }, // Eastern
	SN: { lat: 22.24725, lng: 114.15884 }, // Southern
	WCH: { lat: 22.27944, lng: 114.17667 }, // Wan Chai

	// Kowloon
	KC: { lat: 22.32444, lng: 114.19111 }, // Kowloon City
	KT: { lat: 22.31639, lng: 114.22278 }, // Kwun Tong
	SSP: { lat: 22.33074, lng: 114.1622 }, // Sham Shui Po
	WTS: { lat: 22.33353, lng: 114.19686 }, // Wong Tai Sin
	YTM: { lat: 22.31556, lng: 114.16861 }, // Yau Tsim Mong

	// New Territories East
	N: { lat: 22.5075, lng: 114.13667 }, // North
	SK: { lat: 22.38143, lng: 114.27052 }, // Sai Kung
	ST: { lat: 22.38715, lng: 114.19534 }, // Sha Tin
	TP: { lat: 22.45085, lng: 114.16422 }, // Tai Po

	// New Territories West
	IS: { lat: 22.26114, lng: 113.94608 }, // Islands
	KWT: { lat: 22.35488, lng: 114.08401 }, // Kwai Tsing
	TW: { lat: 22.37167, lng: 114.11083 }, // Tsuen Wan
	TM: { lat: 22.3875, lng: 113.97722 }, // Tuen Mun
	YL: { lat: 22.44559, lng: 114.02218 }, // Yuen Long
};
