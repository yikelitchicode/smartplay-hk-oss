import type * as React from "react";
import { cn } from "@/utils/cn";

export interface SegmentedControlOption<T extends string = string> {
	value: T;
	label: React.ReactNode;
	disabled?: boolean;
}

interface SegmentedControlProps<T extends string = string> {
	options: SegmentedControlOption<T>[];
	value: T;
	onValueChange: (value: T) => void;
	className?: string;
}

export function SegmentedControl<T extends string = string>({
	options,
	value,
	onValueChange,
	className,
}: SegmentedControlProps<T>) {
	return (
		<div
			className={cn(
				"flex bg-porcelain-200/50 p-1.5 rounded-xl overflow-hidden",
				className,
			)}
		>
			{options.map((option) => {
				const isSelected = value === option.value;
				return (
					<button
						key={option.value}
						type="button"
						onClick={() => !option.disabled && onValueChange(option.value)}
						disabled={option.disabled}
						className={cn(
							"flex-1 flex items-center justify-center py-2 rounded-lg text-sm font-medium transition-all",
							isSelected
								? "bg-white! text-pacific-blue-700 shadow-sm ring-1 ring-black/5 relative z-10"
								: "text-porcelain-500 hover:text-porcelain-700 hover:bg-white/50",
							option.disabled && "opacity-50 cursor-not-allowed",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
