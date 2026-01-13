/**
 * Simple utility to merge Tailwind CSS classes
 * This is a lightweight alternative to clsx + tailwind-merge
 */
export function cn(...classes: (string | undefined | null | false)[]) {
	return classes
		.filter(Boolean)
		.join(" ")
		.replace(/(\S+)\s+\1/g, "$1") // Remove duplicates
		.trim();
}
