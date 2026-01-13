import { format, parseISO } from "date-fns";
import type React from "react";
import { useMemo } from "react";

interface DateSelectorProps {
	dates: string[];
	selectedDate: string;
	onSelectDate: (date: string) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({
	dates,
	selectedDate,
	onSelectDate,
}) => {
	// Memoize date format helpers if needed, but simple map is usually fast enough

	return (
		<div className="w-full bg-white border-b border-gray-200 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 py-3">
				<div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
					{dates.map((dateStr) => {
						const isSelected = dateStr === selectedDate;
						let dateObj: Date;
						try {
							dateObj = parseISO(dateStr);
						} catch (e) {
							dateObj = new Date();
						}
						const dayName = format(dateObj, "EEE");
						const dayNumber = format(dateObj, "d");
						const month = format(dateObj, "MMM");

						return (
							<button
								key={dateStr}
								type="button"
								onClick={() => onSelectDate(dateStr)}
								className={`flex flex-col items-center min-w-[70px] p-2 rounded-xl transition-all duration-200 border ${
									isSelected
										? "bg-primary border-primary text-white shadow-md transform scale-105"
										: "bg-white border-porcelain-200 text-porcelain-600 hover:border-pacific-blue-300 hover:bg-pacific-blue-50"
								}`}
							>
								<span
									className={`text-xs font-medium uppercase ${isSelected ? "text-pacific-blue-100" : "text-porcelain-400"}`}
								>
									{month}
								</span>
								<span className="text-xl font-bold leading-none my-1">
									{dayNumber}
								</span>
								<span className="text-xs font-medium">{dayName}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default DateSelector;
