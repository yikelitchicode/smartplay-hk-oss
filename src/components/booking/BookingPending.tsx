import type { JSX } from "react";
import { Skeleton } from "../ui/Skeleton";
import { VenueListSkeleton } from "./VenueListSkeleton";

export function BookingPending(): JSX.Element {
	return (
		<output
			className="min-h-screen bg-background/50 flex flex-col font-sans"
			aria-live="polite"
			aria-label="Loading booking information"
		>
			{/* Date Selector Skeleton */}
			<div className="bg-white border-b border-gray-200" aria-hidden="true">
				<div className="max-w-7xl mx-auto px-4 py-4">
					{/* Header Skeleton */}
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-4">
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<Skeleton className="h-8 w-64 md:w-80 rounded-lg" />
								<Skeleton className="h-6 w-12 rounded-full" />
							</div>
							<Skeleton className="h-5 w-full max-w-xl rounded-md" />
						</div>
						<Skeleton className="h-9 w-24 rounded-md shrink-0" />
					</div>

					<div className="flex items-center gap-3 overflow-hidden pb-1">
						{Array.from({ length: 7 }, (_, i) => (
							<Skeleton
								// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items, never reordered
								key={i}
								className="h-[74px] w-[70px] rounded-xl shrink-0"
							/>
						))}
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
				{/* Filter Bar Skeleton */}
				<div
					className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-0 divide-y divide-gray-100"
					aria-hidden="true"
				>
					{/* Search Bar */}
					<div className="p-5 border-b border-gray-100">
						<div className="flex items-center gap-4">
							<Skeleton className="h-[46px] w-full rounded-xl" />
							<Skeleton className="h-[46px] w-24 rounded-xl hidden sm:block" />
						</div>
					</div>
					{/* Location */}
					<div className="p-5 space-y-4">
						<div className="flex items-center justify-between">
							<Skeleton className="h-5 w-24" />
						</div>
						<div className="flex gap-1">
							<Skeleton className="h-9 w-1/3 rounded-lg" />
							<Skeleton className="h-9 w-1/3 rounded-lg" />
							<Skeleton className="h-9 w-1/3 rounded-lg" />
						</div>
						<div className="flex gap-2 overflow-hidden">
							<Skeleton className="h-9 w-24 rounded-full" />
							<Skeleton className="h-9 w-24 rounded-full" />
							<Skeleton className="h-9 w-24 rounded-full" />
							<Skeleton className="h-9 w-24 rounded-full" />
						</div>
					</div>
					{/* Filters */}
					<div className="p-5 flex flex-col md:flex-row gap-6 bg-porcelain-50/50">
						<div className="w-full md:w-1/3 space-y-2">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-10 w-full rounded-xl" />
						</div>
						<div className="flex-1 space-y-2">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-10 w-full rounded-md" />
						</div>
						<div className="flex-1 space-y-2">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-10 w-full rounded-md" />
						</div>
					</div>
				</div>

				{/* Results Info */}
				<div className="flex items-center justify-between" aria-hidden="true">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-5 w-32" />
				</div>

				{/* Venues Grid Skeleton */}
				<VenueListSkeleton />
			</main>
		</output>
	);
}
