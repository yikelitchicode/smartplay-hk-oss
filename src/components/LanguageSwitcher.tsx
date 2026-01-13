import { Globe } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { Select } from "@/components/ui/Select";

const LanguageSwitcher: React.FC = () => {
	const { i18n } = useTranslation();

	const options = [
		{ value: "en", label: "English" },
		{ value: "zh", label: "繁體中文" },
		{ value: "cn", label: "简体中文" },
	];

	return (
		<div className="flex items-center gap-2 min-w-[140px]">
			<Globe size={18} className="text-gray-500 mr-1" />
			<Select
				options={options}
				value={i18n.language}
				onChange={(val) => i18n.changeLanguage(val)}
				size="sm"
			/>
		</div>
	);
};

export default LanguageSwitcher;
