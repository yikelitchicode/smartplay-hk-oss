import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/Pagination";

interface BookingPaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	isLoading: boolean;
}

export function BookingPagination({
	currentPage,
	totalPages,
	onPageChange,
	isLoading,
}: BookingPaginationProps) {
	if (isLoading || totalPages <= 1) return null;

	return (
		<Pagination className="mt-8">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						onClick={() => onPageChange(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
					/>
				</PaginationItem>

				{/* First Page */}
				{currentPage > 2 && (
					<PaginationItem>
						<PaginationLink
							onClick={() => onPageChange(1)}
							isActive={currentPage === 1}
						>
							1
						</PaginationLink>
					</PaginationItem>
				)}

				{/* Ellipsis Start */}
				{currentPage > 3 && (
					<PaginationItem>
						<PaginationEllipsis />
					</PaginationItem>
				)}

				{/* Current Range */}
				{Array.from({ length: totalPages }, (_, i) => i + 1)
					.filter(
						(page) =>
							page === currentPage ||
							page === currentPage - 1 ||
							page === currentPage + 1,
					)
					.map((page) => (
						<PaginationItem key={page}>
							<PaginationLink
								onClick={() => onPageChange(page)}
								isActive={currentPage === page}
							>
								{page}
							</PaginationLink>
						</PaginationItem>
					))}

				{/* Ellipsis End */}
				{currentPage < totalPages - 2 && (
					<PaginationItem>
						<PaginationEllipsis />
					</PaginationItem>
				)}

				{/* Last Page */}
				{currentPage < totalPages - 1 && (
					<PaginationItem>
						<PaginationLink
							onClick={() => onPageChange(totalPages)}
							isActive={currentPage === totalPages}
						>
							{totalPages}
						</PaginationLink>
					</PaginationItem>
				)}

				<PaginationItem>
					<PaginationNext
						onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
