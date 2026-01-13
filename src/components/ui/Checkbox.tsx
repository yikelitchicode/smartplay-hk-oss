import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import * as React from "react";

export interface CheckboxProps
	extends Omit<React.ComponentProps<"input">, "size"> {
	label?: string;
	error?: string;
	helperText?: string;
	size?: "sm" | "md" | "lg";
	indeterminate?: boolean;
}

const sizeStyles = {
	sm: "h-4 w-4",
	md: "h-5 w-5",
	lg: "h-6 w-6",
};

const textSizeStyles = {
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
	(
		{
			label,
			error,
			helperText,
			size = "md",
			indeterminate = false,
			disabled,
			className = "",
			id,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const checkboxId = id || generatedId;
		const errorId = `${checkboxId}-error`;
		const helperId = `${checkboxId}-helper`;

		const checkboxRef = React.useRef<HTMLInputElement>(null);

		React.useEffect(() => {
			if (checkboxRef.current) {
				checkboxRef.current.indeterminate = indeterminate;
			}
		}, [indeterminate]);

		React.useImperativeHandle(ref, () => checkboxRef.current);

		const checkboxStyles =
			"rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

		return (
			<div>
				<div className="flex items-start">
					<div className="flex items-center h-5">
						<BaseCheckbox
							ref={checkboxRef}
							id={checkboxId}
							className={`${sizeStyles[size]} ${checkboxStyles} ${className}`.trim()}
							aria-invalid={error ? "true" : "false"}
							aria-describedby={
								error ? errorId : helperText ? helperId : undefined
							}
							disabled={disabled}
							{...props}
						/>
					</div>
					{label && (
						<div className="ml-3 text-sm">
							<label
								htmlFor={checkboxId}
								className={`font-medium text-gray-900 ${error ? "text-destructive" : ""} ${textSizeStyles[size]}`}
							>
								{label}
							</label>
							{helperText && !error && (
								<p id={helperId} className="text-gray-500">
									{helperText}
								</p>
							)}
						</div>
					)}
				</div>
				{error && (
					<p id={errorId} className="mt-1 text-sm text-destructive ml-8">
						{error}
					</p>
				)}
			</div>
		);
	},
);

Checkbox.displayName = "Checkbox";
