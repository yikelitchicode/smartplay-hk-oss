import { format, parseISO } from "date-fns";
import type React from "react";
import type { AvailabilityTheme } from "@/lib/booking/utils";

interface DateSelectorProps {
	dates: string[];
	selectedDate: string;
	onSelectDate: (date: string) => void;
	dateStyles?: Record<string, AvailabilityTheme>;
}

const DateSelector: React.FC<DateSelectorProps> = ({
	dates,
	selectedDate,
	onSelectDate,
	dateStyles,
}) => {
	// Memoize date format helpers if needed, but simple map is usually fast enough

	return (
		<div className="w-full bg-white border-b border-gray-200 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 py-3">
				<div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
					{dates.map((dateStr) => {
						const isSelected = dateStr === selectedDate;
						const style = dateStyles?.[dateStr];
						const isDisabled = style?.disabled ?? false;

						let dateObj: Date;
						try {
							dateObj = parseISO(dateStr);
						} catch (_e) {
							dateObj = new Date();
						}
						const dayName = format(dateObj, "EEE");
						const dayNumber = format(dateObj, "d");
						const month = format(dateObj, "MMM");

						// Default neutral style if no availability data
						const availabilityClass = style
							? `${isDisabled ? "opacity-60 grayscale-[0.5]" : ""} ${style.bg} ${style.text} ${style.border}`
							: "bg-white border-porcelain-200 text-porcelain-600 hover:border-pacific-blue-300 hover:bg-pacific-blue-50";

						return (
							<button
								key={dateStr}
								type="button"
								onClick={() => onSelectDate(dateStr)}
								className={`flex flex-col items-center min-w-[70px] p-2 rounded-xl transition-all duration-200 border relative ${
									isSelected
										? "bg-primary border-primary text-white shadow-md transform scale-105"
										: availabilityClass
								}`}
							>
								{/* Availability Dot */}
								{style && !isSelected && (
									<div
										className={`absolute top-1 right-1 w-2 h-2 rounded-full ${style.ring.replace("ring-", "bg-") || "bg-current opacity-20"}`}
										title={isDisabled ? "Full" : "Available"}
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
};

export default DateSelector;
