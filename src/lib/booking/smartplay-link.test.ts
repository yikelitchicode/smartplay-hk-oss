import { describe, expect, it } from "vitest";
import { constructSmartPlayUrl } from "./smartplay-link";

describe("constructSmartPlayUrl", () => {
	it("should construct a valid SmartPlay URL with all parameters", () => {
		const params = {
			venueId: "70000725",
			fatId: 304,
			venueName: "中山紀念公園",
			playDate: "2026-01-21",
			districtCode: "CW",
			sportCode: "BAGM",
			typeCode: "FOTP",
			sessionIndex: 2,
			dateIndex: 1,
			isFree: false,
		};

		const url = constructSmartPlayUrl(params);
		console.log(url);

		expect(url).toContain(
			"https://www.smartplay.lcsd.gov.hk/facilities/select/court",
		);
		expect(url).toContain("venueId=70000725");
		expect(url).toContain("fatId=304");
		// URLSearchParams encodes the value, so we check for encoded version or use URL object to parse
		expect(url).toContain(
			"venueName=%E4%B8%AD%E5%B1%B1%E7%B4%80%E5%BF%B5%E5%85%AC%E5%9C%92",
		);
		expect(url).toContain("playDate=2026-01-21");
		expect(url).toContain("district=CW");
		expect(url).toContain("sportCode=BAGM");
		expect(url).toContain("typeCode=FOTP");
		expect(url).toContain("isFree=false");
		expect(url).toContain("sessionIndex=2");
		expect(url).toContain("dateIndex=1");
	});

	it("should handle isFree optional parameter default", () => {
		const params = {
			venueId: "123",
			fatId: "456",
			venueName: "Test Venue",
			playDate: "2026-01-22",
			districtCode: "TP",
			sportCode: "BASC",
			typeCode: "BASC",
			sessionIndex: 0,
			dateIndex: 0,
		};

		const url = constructSmartPlayUrl(params);
		expect(url).toContain("isFree=false");
	});
});
