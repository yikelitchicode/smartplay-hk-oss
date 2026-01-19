import { format, parseISO } from "date-fns";
import { enUS, zhCN, zhHK } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
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
	const [pageIndex, setPageIndex] = useState(0);
	const DAYS_PER_PAGE = 7;

	// Reset page when dates change deeply, or ensure selected date is visible
	useEffect(() => {
		const index = dates.indexOf(selectedDate);
		if (index !== -1) {
			setPageIndex(Math.floor(index / DAYS_PER_PAGE));
		}
	}, [selectedDate, dates]);

	const dateLocale = useMemo(() => {
		if (i18n.language === "zh") return zhHK;
		if (i18n.language === "cn") return zhCN;
		return enUS;
	}, [i18n.language]);

	const totalPages = Math.ceil(dates.length / DAYS_PER_PAGE);
	const canGoPrev = pageIndex > 0;
	const canGoNext = pageIndex < totalPages - 1;

	const visibleDates = useMemo(() => {
		const start = pageIndex * DAYS_PER_PAGE;
		return dates.slice(start, start + DAYS_PER_PAGE).map((dateStr) => {
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
	}, [dates, dateLocale, pageIndex]);

	const handlePrev = () => setPageIndex((p) => Math.max(0, p - 1));
	const handleNext = () => setPageIndex((p) => Math.min(totalPages - 1, p + 1));

	return (
		<div className="w-full bg-white border-b border-gray-200 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
				{children}

				<div className="relative flex items-center justify-center">
					{/* Prev Button */}
					{dates.length > DAYS_PER_PAGE && (
						<button
							type="button"
							onClick={handlePrev}
							disabled={!canGoPrev}
							className={`absolute left-0 z-10 p-2 rounded-full border bg-white shadow-sm transition-all ${
								canGoPrev
									? "text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-primary hover:border-primary/30 cursor-pointer"
									: "text-gray-300 border-gray-100 cursor-not-allowed opacity-50"
							}`}
							aria-label="Previous week"
						>
							<ChevronLeft size={20} />
						</button>
					)}

					<div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth px-4 sm:px-8 pb-1 w-full justify-start sm:justify-center">
						{visibleDates.map(({ dateStr, dayName, dayNumber, month }) => {
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
									className={`flex flex-col items-center min-w-[65px] sm:min-w-[70px] w-[65px] sm:w-[70px] shrink-0 p-2 rounded-xl transition-all duration-200 border relative ${
										isSelected
											? "bg-primary border-primary text-white shadow-md transform scale-105 z-10"
											: availabilityClass
									}`}
								>
									{/* Availability Dot */}
									{style && !isSelected && (
										<div
											className="absolute top-1 right-1 w-2 h-2 rounded-full bg-current opacity-20"
											aria-hidden="true"
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

					{/* Next Button */}
					{dates.length > DAYS_PER_PAGE && (
						<button
							type="button"
							onClick={handleNext}
							disabled={!canGoNext}
							className={`absolute right-0 z-10 p-2 rounded-full border bg-white shadow-sm transition-all ${
								canGoNext
									? "text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-primary hover:border-primary/30 cursor-pointer"
									: "text-gray-300 border-gray-100 cursor-not-allowed opacity-50"
							}`}
							aria-label="Next week"
						>
							<ChevronRight size={20} />
						</button>
					)}
				</div>
			</div>
		</div>
	);
});
