import { prisma } from "../../db";
import { CrawlerHttpError } from "./types";

/**
 * Facility Group from Catalog API
 */
interface CatalogGroup {
	code: string;
	name: string;
	enName: string;
	tcName: string;
	scName: string;
	disp: boolean;
	seq: number;
	nonFee: boolean;
	icon: string;
	children: CatalogFacilityType[];
}

/**
 * Facility Type from Catalog API
 */
interface CatalogFacilityType {
	code: string;
	groupCode: string;
	name: string;
	enName: string;
	tcName: string;
	scName: string;
	disp: boolean;
	seq: number;
	nonFee: boolean;
}

interface CatalogResponse {
	code: string;
	message: string;
	data: CatalogGroup[];
	timestamp: number;
}

const CATALOG_API_URL =
	"https://www.smartplay.lcsd.gov.hk/rest/facility-catalog/api/v1/publ/facility-params/facilities?ballotFlag=false";

const HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0",
	Accept: "application/json",
	"Accept-Language": "zh-hk",
	"Accept-Encoding": "gzip, deflate, br, zstd",
	Referer: "https://www.smartplay.lcsd.gov.hk/facilities/home",
	channel: "INTERNET",
	"Content-Type": "application/json; charset=utf-8",
};

/**
 * Fetch and Sync Facility Configuration
 *
 * Hits the SmartPlay Catalog API and synchronizes the facility groups and types
 * with the local database.
 */
export async function syncFacilityConfig(): Promise<{
	groups: number;
	types: number;
}> {
	console.log(`[Metadata] Fetching catalog from ${CATALOG_API_URL}...`);

	const response = await fetch(CATALOG_API_URL, {
		headers: HEADERS,
	});

	if (!response.ok) {
		throw new CrawlerHttpError(
			`Failed to fetch facility catalog: ${response.statusText}`,
			response.status,
			CATALOG_API_URL,
		);
	}

	const json = (await response.json()) as CatalogResponse;

	if (json.code !== "0" || !json.data) {
		throw new Error(
			`Invalid catalog API response: ${json.message || "Unknown error"}`,
		);
	}

	console.log(
		`[Metadata] Fetched ${json.data.length} groups. Starting sync...`,
	);

	// Use a transaction to ensure integrity but we process sequentially to handle dependencies
	let groupCount = 0;
	let typeCount = 0;

	await prisma.$transaction(async (tx) => {
		for (const group of json.data) {
			// Upsert Group
			await tx.facilityGroup.upsert({
				where: { code: group.code },
				update: {
					name: group.name,
					nameEn: group.enName,
					nameTc: group.tcName,
					nameSc: group.scName,
					icon: group.icon,
					seq: group.seq,
					isFree: group.nonFee,
					isVisible: group.disp,
				},
				create: {
					code: group.code,
					name: group.name,
					nameEn: group.enName,
					nameTc: group.tcName,
					nameSc: group.scName,
					icon: group.icon,
					seq: group.seq,
					isFree: group.nonFee,
					isVisible: group.disp,
				},
			});
			groupCount++;

			// Upsert Children (Facility Types)
			if (group.children && group.children.length > 0) {
				for (const child of group.children) {
					await tx.facilityType.upsert({
						where: { code: child.code },
						update: {
							groupCode: group.code,
							name: child.name,
							nameEn: child.enName,
							nameTc: child.tcName,
							nameSc: child.scName,
							seq: child.seq,
							isFree: child.nonFee,
							isVisible: child.disp,
						},
						create: {
							code: child.code,
							groupCode: group.code,
							name: child.name,
							nameEn: child.enName,
							nameTc: child.tcName,
							nameSc: child.scName,
							seq: child.seq,
							isFree: child.nonFee,
							isVisible: child.disp,
						},
					});
					typeCount++;
				}
			}
		}
	});

	console.log(
		`[Metadata] Sync completed. Groups: ${groupCount}, Types: ${typeCount}`,
	);

	return { groups: groupCount, types: typeCount };
}
