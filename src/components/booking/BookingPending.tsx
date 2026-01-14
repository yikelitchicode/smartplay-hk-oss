import { Skeleton } from "@/components/ui/Skeleton";

export function BookingPending() {
	return (
		<div className="min-h-screen bg-background/50 flex flex-col font-sans">
			{/* Date Selector Skeleton */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto">
					<div className="flex items-center gap-1 p-2 overflow-hidden">
						{Array.from({ length: 7 }, (_, i) => (
							<Skeleton
								// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items, never reordered
								key={i}
								className="h-[74px] w-[66px] rounded-xl shrink-0"
							/>
						))}
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
				{/* Filter Bar Skeleton */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-0 divide-y divide-gray-100">
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
				<div className="flex items-center justify-between">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-5 w-32" />
				</div>

				{/* Venues Grid Skeleton */}
				<div className="grid grid-cols-1 gap-6">
					{Array.from({ length: 3 }, (_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items, never reordered
							key={i}
							className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6 space-y-6"
						>
							<div className="flex justify-between items-start">
								<div className="space-y-2">
									<Skeleton className="h-6 w-64" />
									<Skeleton className="h-4 w-48" />
								</div>
								<Skeleton className="h-6 w-20 rounded-full" />
							</div>
							<div className="space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-5 w-40" />
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
										{Array.from({ length: 6 }, (_, j) => (
											<Skeleton
												// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items, never reordered
												key={j}
												className="h-20 w-full rounded-xl"
											/>
										))}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</main>
		</div>
	);
}
