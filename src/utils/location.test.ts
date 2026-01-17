import { describe, expect, it } from "vitest";
import { DISTRICT_COORDINATES } from "../data/districts";
import {
	getDistance,
	getDistrictsByDistance,
	getNearestDistrict,
} from "./location";

describe("location utility", () => {
	describe("getDistance", () => {
		it("should return 0 for the same point", () => {
			const point = { lat: 22.3, lng: 114.1 };
			expect(getDistance(point, point)).toBe(0);
		});

		it("should calculate a positive distance between different points", () => {
			const cw = DISTRICT_COORDINATES.CW;
			const en = DISTRICT_COORDINATES.EN;
			const distance = getDistance(cw, en);
			expect(distance).toBeGreaterThan(0);
			// Central to Eastern is roughly 7-8km
			expect(distance).toBeGreaterThan(5);
			expect(distance).toBeLessThan(15);
		});
	});

	describe("getNearestDistrict", () => {
		it("should find the nearest district (matching exactly)", () => {
			const cw = DISTRICT_COORDINATES.CW;
			expect(getNearestDistrict(cw)).toBe("CW");
		});

		it("should find the nearest district (near Tai Po)", () => {
			// Near Tai Po
			const nearTP = { lat: 22.45, lng: 114.16 };
			expect(getNearestDistrict(nearTP)).toBe("TP");
		});

		it("should find the nearest district (near Central)", () => {
			// Near Central
			const nearCW = { lat: 22.28, lng: 114.15 };
			expect(getNearestDistrict(nearCW)).toBe("CW");
		});
	});

	describe("getDistrictsByDistance", () => {
		it("should return a sorted list of districts", () => {
			const nearCW = { lat: 22.28, lng: 114.15 };
			const sorted = getDistrictsByDistance(nearCW);
			expect(sorted[0]).toBe("CW");
			// Wanchai should be closer than Tuen Mun
			expect(sorted.indexOf("WCH")).toBeLessThan(sorted.indexOf("TM"));
		});
	});
});
