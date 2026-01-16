import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import * as React from "react";

export interface ModalProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	description?: string;
	children: React.ReactNode;
	size?: "sm" | "md" | "lg" | "xl" | "full";
	showCloseButton?: boolean;
	floatingCloseButton?: boolean;
	closeButtonClassName?: string;
	closeOnEscape?: boolean;
	closeOnOutsideClick?: boolean;
}

const sizeStyles = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-xl",
	full: "max-w-full mx-4",
};

export const Modal = ({
	open,
	onClose,
	title,
	description,
	children,
	size = "md",
	showCloseButton = true,
	floatingCloseButton = false,
	closeButtonClassName,
	closeOnOutsideClick = true,
}: ModalProps) => {
	const modalId = React.useId();

	const shouldRenderHeader = title || (showCloseButton && !floatingCloseButton);

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(isOpen) => !isOpen && onClose()}
			modal
		>
			<Dialog.Portal>
				<Dialog.Backdrop
					onClick={closeOnOutsideClick ? onClose : undefined}
					className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
				/>
				<Dialog.Popup
					role="dialog"
					aria-modal="true"
					aria-labelledby={title ? `${modalId}-title` : undefined}
					aria-describedby={description ? `${modalId}-description` : undefined}
					className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${sizeStyles[size]} w-full bg-white rounded-lg shadow-xl z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]`}
				>
					{shouldRenderHeader && (
						<div className="flex items-center justify-between p-6 border-b border-gray-200">
							<div className="flex-1">
								{title && (
									<h2
										id={`${modalId}-title`}
										className="text-xl font-semibold text-gray-900"
									>
										{title}
									</h2>
								)}
								{description && (
									<p
										id={`${modalId}-description`}
										className="mt-1 text-sm text-gray-500"
									>
										{description}
									</p>
								)}
							</div>
							{showCloseButton && !floatingCloseButton && (
								<button
									type="button"
									onClick={onClose}
									className={`ml-4 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${closeButtonClassName || ""}`}
									aria-label="Close modal"
								>
									<X className="h-6 w-6" />
								</button>
							)}
						</div>
					)}
					{showCloseButton && floatingCloseButton && (
						<button
							type="button"
							onClick={onClose}
							className={`absolute top-4 right-4 z-10 inline-flex items-center justify-center rounded-full p-1 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-primary ${closeButtonClassName || "text-gray-400 hover:text-gray-500"}`}
							aria-label="Close modal"
						>
							<X className="h-6 w-6" />
						</button>
					)}
					<div className="p-6">{children}</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
