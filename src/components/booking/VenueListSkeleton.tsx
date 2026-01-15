import type { JSX } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export function VenueListSkeleton(): JSX.Element {
	return (
		<div className="grid grid-cols-1 gap-6" aria-hidden="true">
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
	);
}
