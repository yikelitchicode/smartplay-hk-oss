import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type * as React from "react";

export interface TooltipProps {
	content: React.ReactNode;
	children: React.ReactNode;
	placement?: "top" | "bottom" | "left" | "right";
	delay?: number;
	arrow?: boolean;
	disabled?: boolean;
}

export const Tooltip = ({
	content,
	children,
	placement: _placement = "top",
	delay = 500,
	arrow: _arrow = true,
	disabled = false,
}: TooltipProps) => {
	if (disabled) {
		return <>{children}</>;
	}

	return (
		<BaseTooltip.Provider delay={delay}>
			<BaseTooltip.Trigger>
				{children}
				<BaseTooltip.Popup>
					<div
						role="tooltip"
						className="z-50 max-w-xs rounded-md bg-pacific-blue-950 px-3 py-2 text-sm text-white shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
					>
						{content}
					</div>
				</BaseTooltip.Popup>
			</BaseTooltip.Trigger>
		</BaseTooltip.Provider>
	);
};
