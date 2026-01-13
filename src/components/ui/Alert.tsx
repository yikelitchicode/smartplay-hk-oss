import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import type * as React from "react";

export interface AlertProps {
	variant?: "info" | "success" | "warning" | "error";
	title?: string;
	children: React.ReactNode;
	onClose?: () => void;
	icon?: React.ReactNode;
}

const variantStyles = {
	info: "border-info bg-icy-blue-50 text-icy-blue-800",
	success: "border-success bg-pacific-blue-50 text-pacific-blue-800",
	warning: "border-warning bg-vanilla-custard-50 text-vanilla-custard-800",
	error: "border-destructive bg-tangerine-dream-50 text-tangerine-dream-800",
};

const defaultIcons = {
	info: <Info className="h-5 w-5" />,
	success: <CheckCircle className="h-5 w-5" />,
	warning: <AlertTriangle className="h-5 w-5" />,
	error: <AlertCircle className="h-5 w-5" />,
};

export const Alert = ({
	variant = "info",
	title,
	children,
	onClose,
	icon,
}: AlertProps) => {
	const Icon = icon || defaultIcons[variant];

	return (
		<div
			className={`border-l-4 p-4 rounded-r-md ${variantStyles[variant]} relative`}
			role="alert"
		>
			<div className="flex">
				<div className="shrink-0">{Icon}</div>
				<div className="ml-3 flex-1">
					{title && <h3 className="text-sm font-medium">{title}</h3>}
					<div className={`text-sm ${title ? "mt-2" : ""}`}>{children}</div>
				</div>
				{onClose && (
					<div className="ml-auto pl-3">
						<div className="-mx-1.5 -my-1.5">
							<button
								type="button"
								onClick={onClose}
								className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-current focus:ring-current"
							>
								<span className="sr-only">Dismiss</span>
								<X className="h-5 w-5" />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
