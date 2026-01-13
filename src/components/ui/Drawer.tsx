import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type * as React from "react";

export interface DrawerProps {
	open: boolean;
	onClose: () => void;
	children: React.ReactNode;
	anchor?: "left" | "right" | "top" | "bottom";
	size?: "sm" | "md" | "lg" | "xl" | "full";
	showCloseButton?: boolean;
	closeOnEscape?: boolean;
	closeOnOutsideClick?: boolean;
}

const sizeStyles = {
	sm: "w-64",
	md: "w-80",
	lg: "w-[400px]",
	xl: "max-w-xl",
	full: "w-full",
};

const anchorStyles = {
	left: "fixed top-0 left-0 h-full ",
	right: "fixed top-0 right-0 h-full",
	top: "fixed top-0 left-0 w-full h-auto",
	bottom: "fixed bottom-0 left-0 w-full h-auto",
};

const transformStyles = {
	left: "data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
	right: "data-[state=closed]:translate-x-full data-[state=open]:translate-x-0",
	top: "data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0",
	bottom:
		"data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
};

export const Drawer = ({
	open,
	onClose,
	children,
	anchor = "left",
	size = "md",
	showCloseButton = true,
	closeOnOutsideClick = true,
}: DrawerProps) => {
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
					className={`${anchorStyles[anchor]} ${sizeStyles[size]} ${transformStyles[anchor]} bg-white shadow-2xl z-50 flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 transition-transform duration-300 ease-in-out`}
				>
					{showCloseButton && (
						<div className="flex items-center justify-between p-4 border-b border-gray-200">
							<h2 className="text-xl font-semibold text-gray-900">
								Navigation
							</h2>
							<button
								type="button"
								onClick={onClose}
								className="inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 p-2 hover:bg-gray-100 transition-colors"
								aria-label="Close drawer"
							>
								<X className="h-6 w-6" />
							</button>
						</div>
					)}
					<div className="flex-1 overflow-y-auto">{children}</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
