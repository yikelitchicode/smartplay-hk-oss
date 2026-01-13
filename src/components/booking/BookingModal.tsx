import { Calendar, Clock, MapPin } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { NormalizedSession, NormalizedVenue } from "@/lib/booking/types";

interface BookingModalProps {
	session: NormalizedSession | null;
	venue: NormalizedVenue | null;
	onClose: () => void;
	onConfirm: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
	session,
	venue,
	onClose,
	onConfirm,
}) => {
	if (!session || !venue) return null;

	return (
		<Modal
			open={true}
			onClose={onClose}
			showCloseButton={false} // Drawing custom header
			size="md"
		>
			<div className="-m-6">
				{" "}
				{/* Negative margin to escape padding for header */}
				<div className="relative h-32 bg-primary flex items-center justify-center rounded-t-lg">
					{/* Close button integration if we wanted consistent look, but custom Design used specific close button in header */}
					{/* For Base UI Modal, 'showCloseButton={false}' removes default X. We can implement our own if needed, or rely on Modal's structure. 
               The draft had a custom header with Close. I'll stick to draft look but within Modal body. */}
					<h2 className="text-2xl font-bold text-white tracking-tight">
						Confirm Booking
					</h2>
				</div>
				<div className="p-6 space-y-6">
					<div className="space-y-4">
						<div className="flex items-start gap-4">
							<div className="p-2 bg-pacific-blue-100 text-primary rounded-lg">
								<MapPin size={24} />
							</div>
							<div>
								<h3 className="font-semibold text-gray-900">{venue.name}</h3>
								<p className="text-sm text-gray-500">{venue.districtName}</p>
								<p className="text-sm text-primary font-medium mt-1">
									{session.facilityName}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-4 p-4 bg-porcelain-50 rounded-xl">
							<div className="flex-1 text-center border-r border-porcelain-200">
								<div className="flex flex-col items-center gap-1">
									<Calendar size={18} className="text-gray-400" />
									<span className="text-sm font-semibold text-gray-900">
										{session.date}
									</span>
								</div>
							</div>
							<div className="flex-1 text-center">
								<div className="flex flex-col items-center gap-1">
									<Clock size={18} className="text-gray-400" />
									<span className="text-sm font-semibold text-gray-900">
										{session.startTime} - {session.endTime}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-3">
						<Button
							variant="primary"
							size="lg"
							className="w-full"
							onClick={onConfirm}
						>
							Confirm Booking
						</Button>
						<Button
							variant="secondary" // or ghost? Draft used white with border. Secondary in UI button is porcelain bg.
							// I'll use ghost with extra classes or just secondary. Secondary is bg-porcelain-100.
							// Draft was bg-white border-gray-200.
							// Let's us basic Button with className override if needed or just Secondary for consistency.
							size="lg"
							className="w-full bg-white border border-porcelain-200 hover:bg-porcelain-50"
							onClick={onClose}
						>
							Cancel
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default BookingModal;
