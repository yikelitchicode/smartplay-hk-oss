import { Input as BaseInput } from "@base-ui/react/input";
import * as React from "react";

export interface InputProps
	extends Omit<React.ComponentProps<"input">, "size"> {
	label?: string;
	error?: string;
	helperText?: string;
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
	fullWidth?: boolean;
	size?: "sm" | "md" | "lg";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	(
		{
			label,
			error,
			helperText,
			startIcon,
			endIcon,
			fullWidth = false,
			size = "md",
			className = "",
			id,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const inputId = id || generatedId;
		const errorId = `${inputId}-error`;
		const helperId = `${inputId}-helper`;

		const sizeStyles = {
			sm: "px-3 py-1.5 text-sm",
			md: "px-4 py-2 text-base",
			lg: "px-6 py-3 text-lg",
		};

		const inputStyles =
			"block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed";

		const errorInputStyles =
			"border-destructive focus:border-destructive focus:ring-destructive";

		const combinedClassName =
			`${inputStyles} ${sizeStyles[size]} ${error ? errorInputStyles : ""} ${className}`.trim();

		return (
			<div className={fullWidth ? "w-full" : ""}>
				{label && (
					<label
						htmlFor={inputId}
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						{label}
					</label>
				)}
				<div className="relative">
					{startIcon && (
						<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
							{startIcon}
						</div>
					)}
					<BaseInput
						ref={ref}
						id={inputId}
						className={`${combinedClassName} ${startIcon ? "pl-10" : ""} ${endIcon ? "pr-10" : ""}`}
						aria-invalid={error ? "true" : "false"}
						aria-describedby={
							error ? errorId : helperText ? helperId : undefined
						}
						{...props}
					/>
					{endIcon && (
						<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
							{endIcon}
						</div>
					)}
				</div>
				{error && (
					<p id={errorId} className="mt-1 text-sm text-red-600">
						{error}
					</p>
				)}
				{helperText && !error && (
					<p id={helperId} className="mt-1 text-sm text-gray-500">
						{helperText}
					</p>
				)}
			</div>
		);
	},
);

Input.displayName = "Input";
