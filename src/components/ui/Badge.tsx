import type * as React from "react";

export interface BadgeProps {
	children: React.ReactNode;
	variant?:
		| "default"
		| "primary"
		| "secondary"
		| "success"
		| "warning"
		| "error"
		| "info";
	size?: "sm" | "md" | "lg";
	dot?: boolean;
	className?: string;
}

const variantStyles = {
	default: "bg-porcelain-100 text-porcelain-800",
	primary: "bg-pacific-blue-100 text-pacific-blue-800",
	secondary: "bg-porcelain-100 text-porcelain-800",
	success: "bg-pacific-blue-100 text-pacific-blue-800",
	warning: "bg-vanilla-custard-100 text-vanilla-custard-800",
	error: "bg-tangerine-dream-100 text-tangerine-dream-800",
	info: "bg-icy-blue-100 text-icy-blue-800",
};

const sizeStyles = {
	sm: "px-2 py-0.5 text-xs",
	md: "px-2.5 py-0.5 text-sm",
	lg: "px-3 py-1 text-base",
};

export const Badge = ({
	children,
	variant = "default",
	size = "md",
	dot = false,
	className = "",
}: BadgeProps) => {
	const baseStyles = "inline-flex items-center font-medium rounded-full";

	return (
		<span
			className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim()}
		>
			{dot && (
				<span
					className={`mr-1.5 h-2 w-2 rounded-full ${
						variant === "success"
							? "bg-success"
							: variant === "error"
								? "bg-destructive"
								: variant === "warning"
									? "bg-warning"
									: variant === "info"
										? "bg-info"
										: variant === "primary"
											? "bg-primary"
											: variant === "secondary"
												? "bg-secondary"
												: "bg-porcelain-500"
					}`}
				/>
			)}
			{children}
		</span>
	);
};
