import { Switch as BaseSwitch } from "@base-ui/react/switch";
import * as React from "react";

export interface SwitchProps
	extends Omit<React.ComponentProps<"input">, "size"> {
	label?: string;
	description?: string;
	error?: string;
	size?: "sm" | "md" | "lg";
}

const sizeStyles = {
	sm: {
		switch: "h-5 w-9",
		thumb: "h-3 w-3 translate-x-0.5 data-[checked]:translate-x-4.5",
		label: "text-sm",
	},
	md: {
		switch: "h-6 w-11",
		thumb: "h-4 w-4 translate-x-0.5 data-[checked]:translate-x-6",
		label: "text-base",
	},
	lg: {
		switch: "h-7 w-13",
		thumb: "h-5 w-5 translate-x-0.5 data-[checked]:translate-x-7.5",
		label: "text-lg",
	},
};

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
	(
		{ label, description, error, size = "md", disabled, className = "", id },
		ref,
	) => {
		const generatedId = React.useId();
		const switchId = id || generatedId;
		const errorId = `${switchId}-error`;
		const descriptionId = `${switchId}-description`;

		const currentSize = sizeStyles[size];

		const switchStyles =
			"relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

		const thumbStyles =
			"pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out";

		const backgroundColor = disabled
			? "bg-gray-300"
			: error
				? "bg-destructive data-[checked]:bg-destructive"
				: "bg-gray-200 data-[checked]:bg-primary";

		return (
			<div>
				<div className="flex items-start">
					<div className="flex items-center">
						<BaseSwitch.Root
							ref={ref}
							id={switchId}
							className={`${switchStyles} ${currentSize.switch} ${backgroundColor} ${className}`.trim()}
							aria-invalid={error ? "true" : "false"}
							aria-describedby={
								error ? errorId : description ? descriptionId : undefined
							}
							disabled={disabled}
						>
							<span
								aria-hidden="true"
								className={`${thumbStyles} ${currentSize.thumb}`}
							/>
						</BaseSwitch.Root>
					</div>
					{label && (
						<div className="ml-3">
							<label
								htmlFor={switchId}
								className={`font-medium text-gray-900 ${error ? "text-destructive" : ""} ${currentSize.label} block`}
							>
								{label}
							</label>
							{description && (
								<p id={descriptionId} className="text-sm text-gray-500">
									{description}
								</p>
							)}
						</div>
					)}
				</div>
				{error && (
					<p id={errorId} className="mt-1 text-sm text-red-600 ml-12">
						{error}
					</p>
				)}
			</div>
		);
	},
);

Switch.displayName = "Switch";
