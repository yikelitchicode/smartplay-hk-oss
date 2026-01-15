import { sify } from "chinese-conv";

/**
 * Resolves the localized name based on language preference.
 * Falls back to converting Traditional Chinese to Simplified Chinese using sify() if nameSc is missing.
 */
export function resolveLocalizedName(
	options: {
		name?: string | null;
		nameEn?: string | null;
		nameTc?: string | null;
		nameSc?: string | null;
	},
	lang: string,
): string {
	const { name, nameEn, nameTc, nameSc } = options;
	const isEn = lang === "en" || lang === "en-US";
	const isSc = lang === "cn" || lang === "zh-CN";
	const isTc = lang === "zh" || lang === "zh-HK";

	if (isEn) {
		return nameEn || name || "";
	}
	if (isSc) {
		// If nameSc exists, use it; otherwise convert nameTc (or name) to Simplified Chinese
		if (nameSc) return nameSc;
		const tcName = nameTc || name;
		return tcName ? sify(tcName) : "";
	}
	if (isTc) {
		return nameTc || name || "";
	}
	// Default fallback: use Traditional Chinese or name
	return name || "";
}
