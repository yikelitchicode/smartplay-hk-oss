import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";

export interface ButtonProps
	extends Omit<React.ComponentProps<"button">, "type"> {
	variant?: "primary" | "secondary" | "ghost" | "danger";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
	children?:
		| React.ReactNode
		| ((props: { loading: boolean }) => React.ReactNode);
}

const variantStyles = {
	primary:
		"bg-primary text-primary-foreground hover:bg-primary-hover focus:bg-primary-hover",
	secondary:
		"bg-secondary text-secondary-foreground hover:bg-secondary-hover focus:bg-secondary-hover",
	ghost:
		"bg-transparent text-gray-900 hover:bg-porcelain-100 focus:bg-porcelain-100",
	danger:
		"bg-destructive text-destructive-foreground hover:bg-tangerine-dream-700 focus:bg-tangerine-dream-700",
};

const sizeStyles = {
	sm: "px-3 py-1.5 text-sm",
	md: "px-4 py-2 text-base",
	lg: "px-6 py-3 text-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			variant = "primary",
			size = "md",
			loading = false,
			disabled,
			startIcon,
			endIcon,
			children,
			className = "",
			...props
		},
		ref,
	) => {
		const baseStyles =
			"inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed";

		const combinedClassName =
			`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

		const renderChildren = () => {
			if (typeof children === "function") {
				return children({ loading });
			}
			return children;
		};

		return (
			<BaseButton
				ref={ref}
				disabled={disabled || loading}
				className={combinedClassName}
				{...props}
			>
				{loading && (
					<svg
						className="animate-spin h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-label="Loading"
					>
						<title>Loading</title>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
				)}
				{!loading && startIcon}
				{renderChildren()}
				{!loading && endIcon}
			</BaseButton>
		);
	},
);

Button.displayName = "Button";
