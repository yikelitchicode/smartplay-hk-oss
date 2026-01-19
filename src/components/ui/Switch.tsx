import { Switch as BaseSwitch } from "@base-ui/react/switch";
import * as React from "react";

export interface SwitchProps
	extends Omit<
		React.HTMLAttributes<HTMLSpanElement>,
		"onChange" | "defaultValue"
	> {
	label?: string;
	description?: string;
	error?: string;
	size?: "sm" | "md" | "lg";
	checked?: boolean;
	defaultChecked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	value?: string;
	disabled?: boolean;
}

const sizeStyles = {
	sm: {
		switch: "h-5 w-9",
		thumb: "h-3 w-3 data-[checked]:translate-x-4.5",
		label: "text-sm",
	},
	md: {
		switch: "h-6 w-11",
		thumb: "h-4 w-4 data-[checked]:translate-x-6",
		label: "text-base",
	},
	lg: {
		switch: "h-7 w-13",
		thumb: "h-5 w-5 data-[checked]:translate-x-7.5",
		label: "text-lg",
	},
};

export const Switch = React.forwardRef<HTMLSpanElement, SwitchProps>(
	(
		{
			label,
			description,
			error,
			size = "md",
			disabled,
			className = "",
			id,
			checked,
			defaultChecked,
			onCheckedChange,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const switchId = id || generatedId;
		const errorId = `${switchId}-error`;
		const descriptionId = `${switchId}-description`;

		const currentSize = sizeStyles[size];

		const switchStyles =
			"relative inline-flex flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

		const thumbStyles =
			"pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0.5";

		const backgroundColor = disabled
			? "bg-muted"
			: error
				? "bg-destructive data-[checked]:bg-destructive"
				: "bg-input data-[checked]:bg-primary";

		return (
			<div>
				<div className="flex items-start">
					<div className="flex items-center">
						<BaseSwitch.Root
							ref={ref}
							id={switchId}
							checked={checked}
							defaultChecked={defaultChecked}
							onCheckedChange={onCheckedChange}
							disabled={disabled}
							className={`${switchStyles} ${currentSize.switch} ${backgroundColor} ${className}`.trim()}
							aria-invalid={error ? true : undefined}
							aria-describedby={
								error ? errorId : description ? descriptionId : undefined
							}
							{...props}
						>
							<BaseSwitch.Thumb
								className={`${thumbStyles} ${currentSize.thumb}`}
							/>
						</BaseSwitch.Root>
					</div>
					{label && (
						<div className="ml-3">
							<label
								htmlFor={switchId}
								className={`font-medium text-foreground ${error ? "text-destructive" : ""} ${currentSize.label} cursor-pointer select-none block`}
							>
								{label}
							</label>
							{description && (
								<p id={descriptionId} className="text-sm text-muted-foreground">
									{description}
								</p>
							)}
						</div>
					)}
				</div>
				{error && (
					<p id={errorId} className="mt-1 text-sm text-destructive ml-12">
						{error}
					</p>
				)}
			</div>
		);
	},
);

Switch.displayName = "Switch";
