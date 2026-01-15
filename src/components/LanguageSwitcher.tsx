import { Globe } from "lucide-react";
import { type JSX, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { SelectOptionType } from "@/components/ui/Select";
import { Select } from "@/components/ui/Select";

const LANGUAGE_OPTIONS: SelectOptionType[] = [
	{ value: "en", label: "English" },
	{ value: "zh", label: "繁體中文" },
	{ value: "cn", label: "简体中文" },
];

export default function LanguageSwitcher(): JSX.Element {
	const { i18n } = useTranslation();

	const handleLanguageChange = useCallback(
		(val: string) => {
			i18n.changeLanguage(val);
		},
		[i18n],
	);

	return (
		<div className="flex items-center gap-2 min-w-[140px]">
			<Globe size={18} className="text-gray-500 mr-1" aria-hidden="true" />
			<Select
				options={LANGUAGE_OPTIONS}
				value={i18n.language}
				onChange={handleLanguageChange}
				size="sm"
				aria-label="Select language"
			/>
		</div>
	);
}
