import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import React from "react";

interface ScrollAreaProps {
	children: React.ReactNode;
	className?: string;
	viewportClassName?: string;
	orientation?: "vertical" | "horizontal" | "both";
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
	(
		{
			children,
			className = "",
			viewportClassName = "",
			orientation = "vertical",
		},
		ref,
	) => {
		return (
			<BaseScrollArea.Root
				className={`w-full relative overflow-hidden flex flex-col group ${className}`}
			>
				<BaseScrollArea.Viewport
					ref={ref}
					className={`flex-1 w-full rounded-[inherit] overflow-auto ${viewportClassName}`}
				>
					{children}
				</BaseScrollArea.Viewport>
				{(orientation === "vertical" || orientation === "both") && (
					<BaseScrollArea.Scrollbar
						orientation="vertical"
						className="absolute right-0 top-0 bottom-0 flex select-none touch-none p-0.5 transition-colors duration-160 ease-out data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					>
						<BaseScrollArea.Thumb className="flex-1 bg-gray-300 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
					</BaseScrollArea.Scrollbar>
				)}
				{(orientation === "horizontal" || orientation === "both") && (
					<BaseScrollArea.Scrollbar
						orientation="horizontal"
						className="absolute left-0 right-0 bottom-0 flex select-none touch-none p-0.5 transition-colors duration-160 ease-out data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					>
						<BaseScrollArea.Thumb className="flex-1 bg-gray-300 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
					</BaseScrollArea.Scrollbar>
				)}
				<BaseScrollArea.Corner className="bg-gray-100" />
			</BaseScrollArea.Root>
		);
	},
);

ScrollArea.displayName = "ScrollArea";
