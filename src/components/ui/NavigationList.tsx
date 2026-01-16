import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { cn } from "../../utils/cn";

export interface NavigationItem {
	id: string;
	label: string;
	to: string;
	icon?: React.ReactNode;
	disabled?: boolean;
}

export interface NavigationListProps {
	items: NavigationItem[];
	onItemClick?: () => void;
	className?: string;
	linkClassName?: string;
}

export const NavigationList = ({
	items,
	onItemClick,
	className = "",
	linkClassName = "",
}: NavigationListProps) => {
	const defaultLinkClassName =
		"flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 mb-3 font-medium text-base";

	return (
		<nav className={cn("p-4", className)}>
			{items.map((item) => (
				<Link
					key={item.id}
					to={item.to}
					onClick={onItemClick}
					className={cn(
						defaultLinkClassName,
						"hover:bg-gray-100/80 text-gray-600 hover:text-gray-900",
						linkClassName,
					)}
					activeProps={{
						className: cn(
							defaultLinkClassName,
							"bg-primary/10 text-primary hover:bg-primary/20 hover:text-pacific-blue-700 shadow-sm ring-1 ring-primary/20",
							linkClassName,
						),
					}}
					disabled={item.disabled}
				>
					{item.icon && <span>{item.icon}</span>}
					<span>{item.label}</span>
				</Link>
			))}
		</nav>
	);
};
