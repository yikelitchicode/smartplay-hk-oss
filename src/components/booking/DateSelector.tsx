import { format, parseISO } from "date-fns";
import { enUS, zhCN, zhHK } from "date-fns/locale";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AvailabilityTheme } from "@/lib/booking/utils";

interface DateSelectorProps {
	dates: string[];
	selectedDate: string;
	onSelectDate: (date: string) => void;
	dateStyles?: Record<string, AvailabilityTheme>;
	children?: React.ReactNode;
}

export const DateSelector = memo(function DateSelector({
	dates,
	selectedDate,
	onSelectDate,
	dateStyles,
	children,
}: DateSelectorProps) {
	const { t, i18n } = useTranslation(["booking"]);

	const dateLocale = useMemo(() => {
		if (i18n.language === "zh") return zhHK;
		if (i18n.language === "cn") return zhCN;
		return enUS;
	}, [i18n.language]);

	const formattedDates = useMemo(() => {
		return dates.map((dateStr) => {
			let dateObj: Date;
			try {
				dateObj = parseISO(dateStr);
			} catch (_e) {
				dateObj = new Date();
			}
			return {
				dateStr,
				dayName: format(dateObj, "EEE", { locale: dateLocale }),
				dayNumber: format(dateObj, "d"),
				month: format(dateObj, "MMM", { locale: dateLocale }),
			};
		});
	}, [dates, dateLocale]);

	return (
		<div className="w-full bg-white border-b border-gray-200 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 py-4">
				{children}
				<div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
					{formattedDates.map(({ dateStr, dayName, dayNumber, month }) => {
						const isSelected = dateStr === selectedDate;
						const style = dateStyles?.[dateStr];
						const isDisabled = style?.disabled ?? false;

						// Default neutral style if no availability data
						const availabilityClass = style
							? `${isDisabled ? "opacity-60 grayscale-[0.5]" : ""} ${style.bg} ${style.text} ${style.border}`
							: "bg-white border-porcelain-200 text-porcelain-600 hover:border-pacific-blue-300 hover:bg-pacific-blue-50";

						return (
							<button
								key={dateStr}
								type="button"
								onClick={() => onSelectDate(dateStr)}
								aria-label={`${month} ${dayNumber}, ${dayName}${isSelected ? ` (${t("booking:selected")})` : ""}${isDisabled ? ` (${t("booking:fully_booked")})` : ""}`}
								aria-pressed={isSelected}
								className={`flex flex-col items-center min-w-[70px] p-2 rounded-xl transition-all duration-200 border relative ${
									isSelected
										? "bg-primary border-primary text-white shadow-md transform scale-105"
										: availabilityClass
								}`}
							>
								{/* Availability Dot */}
								{style && !isSelected && (
									<div
										className="absolute top-1 right-1 w-2 h-2 rounded-full bg-current opacity-20"
										aria-hidden="true"
										title={
											isDisabled
												? t("booking:fully_booked")
												: t("booking:available_venues")
										}
									/>
								)}

								<span
									className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-pacific-blue-100" : "opacity-70"}`}
								>
									{month}
								</span>
								<span className="text-xl font-bold leading-none my-1">
									{dayNumber}
								</span>
								<span className="text-xs font-semibold opacity-80">
									{dayName}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
});
