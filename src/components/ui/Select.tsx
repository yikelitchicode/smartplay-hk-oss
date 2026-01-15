import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { ScrollArea } from "@/components/ui/ScrollArea";

export interface SelectOptionType {
	value: string;
	label: string;
	disabled?: boolean;
	className?: string; // Added for dynamic styling
}

export interface SelectGroupType {
	label: string;
	options: SelectOptionType[];
}

export interface SelectProps {
	label?: string;
	options: (SelectOptionType | SelectGroupType)[];
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
	error?: string;
	helperText?: string;
	disabled?: boolean;
	required?: boolean;
	size?: "sm" | "md" | "lg";
	triggerClassName?: string; // Added for dynamic trigger styling
}

function isGroup(
	item: SelectOptionType | SelectGroupType,
): item is SelectGroupType {
	return (item as SelectGroupType).options !== undefined;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
	(
		{
			label,
			options,
			value,
			onChange,
			placeholder = "Select...",
			error,
			helperText,
			disabled = false,
			required = false,
			size = "md",
			triggerClassName,
		},
		ref,
	) => {
		const selectId = React.useId();
		const errorId = `${selectId}-error`;
		const helperId = `${selectId}-helper`;

		return (
			<div className="w-full">
				{label && (
					<label
						htmlFor={selectId}
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						{label}
						{required && <span className="text-red-500 ml-1">*</span>}
					</label>
				)}
				<BaseSelect.Root
					value={value}
					onValueChange={(val: string | null) => onChange(val ?? "")}
					disabled={disabled}
				>
					<BaseSelect.Trigger
						ref={ref}
						id={selectId}
						className={`flex w-full items-center justify-between gap-3 rounded-md border border-gray-200 bg-white text-gray-900 select-none hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary data-popup-open:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
							size === "sm"
								? "h-8 px-2 text-sm"
								: size === "lg"
									? "h-12 px-4 text-base"
									: "h-10 px-3 text-sm"
						} ${error ? "border-red-500" : ""} ${triggerClassName || ""}`}
						aria-invalid={error ? "true" : "false"}
						aria-describedby={
							error ? errorId : helperText ? helperId : undefined
						}
					>
						<BaseSelect.Value>
							{(val: string) => {
								if (!val) return placeholder;
								// Find label for value
								const findLabel = (
									items: (SelectOptionType | SelectGroupType)[],
								): string | undefined => {
									for (const item of items) {
										if (isGroup(item)) {
											const found = findLabel(item.options);
											if (found) return found;
										} else if (item.value === val) {
											return item.label;
										}
									}
									return undefined;
								};
								return findLabel(options) || val;
							}}
						</BaseSelect.Value>
						<BaseSelect.Icon className="flex text-gray-400">
							<ChevronDown className="h-4 w-4" />
						</BaseSelect.Icon>
					</BaseSelect.Trigger>
					<BaseSelect.Portal>
						<BaseSelect.Positioner
							className="outline-none select-none z-50"
							sideOffset={8}
						>
							<BaseSelect.Popup className="group min-w-(--anchor-width) origin-(--transform-origin) bg-clip-padding rounded-md bg-white text-gray-900 shadow-lg shadow-gray-200 outline outline-gray-200 transition-[transform,scale,opacity] data-ending-style:scale-90ata-[ending-style]:opacity-0 data-[side=none]:min-w-[calc(var(--anchor-width)+1rem)] data-[side=none]:data-ending-style:transition-none data-starting-style:scale-90 data-starting-style:opacity-0 data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100 data-[side=none]:data-starting-style:transition-none dark:shadow-none dark:outline-gray-300">
								<ScrollArea className="max-h-[300px]" viewportClassName="p-1">
									<BaseSelect.List className="outline-none">
										{options.map((item) => {
											if (isGroup(item)) {
												return (
													<BaseSelect.Group
														key={item.label}
														className="py-1 relative"
													>
														<BaseSelect.GroupLabel className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-white z-20 border-b border-gray-100 isolate shadow-[0_1px_2px_-1px_rgba(0,0,0,0.08)]">
															{item.label}
														</BaseSelect.GroupLabel>
														{item.options.map((option) => (
															<BaseSelect.Item
																key={option.value}
																value={option.value}
																disabled={option.disabled}
																className={`grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-highlighted:bg-gray-100 data-highlighted:text-gray-900 pointer-coarse:py-2.5 mx-1 rounded-md ${option.className || ""}`}
															>
																<BaseSelect.ItemIndicator className="col-start-1 text-primary">
																	<Check className="size-3" />
																</BaseSelect.ItemIndicator>
																<BaseSelect.ItemText className="col-start-2">
																	{option.label}
																</BaseSelect.ItemText>
															</BaseSelect.Item>
														))}
													</BaseSelect.Group>
												);
											}
											return (
												<BaseSelect.Item
													key={item.value}
													value={item.value}
													disabled={item.disabled}
													className={`grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-highlighted:bg-gray-100 data-highlighted:text-gray-900 pointer-coarse:py-2.5 mx-1 rounded-md ${item.className || ""}`}
												>
													<BaseSelect.ItemIndicator className="col-start-1 text-primary">
														<Check className="size-3" />
													</BaseSelect.ItemIndicator>
													<BaseSelect.ItemText className="col-start-2">
														{item.label}
													</BaseSelect.ItemText>
												</BaseSelect.Item>
											);
										})}
									</BaseSelect.List>
								</ScrollArea>
							</BaseSelect.Popup>
						</BaseSelect.Positioner>
					</BaseSelect.Portal>
				</BaseSelect.Root>
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

Select.displayName = "Select";
