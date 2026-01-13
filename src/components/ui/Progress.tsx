export interface ProgressProps {
	value?: number;
	max?: number;
	size?: "sm" | "md" | "lg";
	variant?: "default" | "primary" | "success" | "warning" | "error";
	showLabel?: boolean;
	label?: string;
	className?: string;
}

const sizeStyles = {
	sm: "h-1.5",
	md: "h-2.5",
	lg: "h-4",
};

const variantStyles = {
	default: "bg-gray-200 [&_.progress-fill]:bg-gray-600",
	primary: "bg-gray-200 [&_.progress-fill]:bg-primary",
	success: "bg-gray-200 [&_.progress-fill]:bg-success",
	warning: "bg-gray-200 [&_.progress-fill]:bg-warning",
	error: "bg-gray-200 [&_.progress-fill]:bg-destructive",
};

export const Progress = ({
	value = 0,
	max = 100,
	size = "md",
	variant = "primary",
	showLabel = false,
	label,
	className = "",
}: ProgressProps) => {
	const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

	return (
		<div className={`w-full ${className}`.trim()}>
			{(label || showLabel) && (
				<div className="flex justify-between mb-1">
					{label && (
						<span className="text-sm font-medium text-gray-700">{label}</span>
					)}
					{showLabel && (
						<span className="text-sm font-medium text-gray-700">
							{Math.round(percentage)}%
						</span>
					)}
				</div>
			)}
			<div
				className={`progress-fill w-full overflow-hidden rounded-full ${sizeStyles[size]} ${variantStyles[variant]}`.trim()}
				role="progressbar"
				aria-valuenow={value}
				aria-valuemin={0}
				aria-valuemax={max}
				aria-label={label}
			>
				<div
					className="progress-fill h-full transition-all duration-300 ease-out"
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
};
