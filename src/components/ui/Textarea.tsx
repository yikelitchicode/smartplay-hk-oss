import * as React from "react";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
	label?: string;
	error?: string;
	helperText?: string;
	fullWidth?: boolean;
	resize?: "none" | "both" | "horizontal" | "vertical";
	rows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			label,
			error,
			helperText,
			fullWidth = false,
			resize = "vertical",
			rows = 4,
			className = "",
			id,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const textareaId = id || generatedId;
		const errorId = `${textareaId}-error`;
		const helperId = `${textareaId}-helper`;

		const textareaStyles =
			"block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed";

		const errorTextareaStyles =
			"border-destructive focus:border-destructive focus:ring-destructive";

		const resizeStyles = {
			none: "resize-none",
			both: "resize",
			horizontal: "resize-x",
			vertical: "resize-y",
		};

		const combinedClassName =
			`${textareaStyles} ${errorTextareaStyles} ${resizeStyles[resize]} ${className}`.trim();

		return (
			<div className={fullWidth ? "w-full" : ""}>
				{label && (
					<label
						htmlFor={textareaId}
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						{label}
					</label>
				)}
				<textarea
					ref={ref}
					id={textareaId}
					className={combinedClassName}
					rows={rows}
					aria-invalid={error ? "true" : "false"}
					aria-describedby={error ? errorId : helperText ? helperId : undefined}
					{...props}
				/>
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

Textarea.displayName = "Textarea";
