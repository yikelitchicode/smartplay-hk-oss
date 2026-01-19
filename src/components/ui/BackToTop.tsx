import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";

export function BackToTop() {
	const [isVisible, setIsVisible] = useState(false);

	const [isScrollLocked, setIsScrollLocked] = useState(false);

	useEffect(() => {
		const checkScrollLock = () => {
			const locked = document.body.hasAttribute("data-scroll-locked");
			setIsScrollLocked(locked);
		};

		// Initial check
		checkScrollLock();

		// Observe body for attribute changes
		const observer = new MutationObserver(checkScrollLock);
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["data-scroll-locked"],
		});

		const toggleVisibility = () => {
			if (window.scrollY > 300) {
				setIsVisible(true);
			} else {
				setIsVisible(false);
			}
		};

		window.addEventListener("scroll", toggleVisibility);

		return () => {
			window.removeEventListener("scroll", toggleVisibility);
			observer.disconnect();
		};
	}, []);

	const scrollToTop = () => {
		if (isScrollLocked) return;
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};

	if (!isVisible || isScrollLocked) {
		return null;
	}

	return (
		<Button
			onClick={scrollToTop}
			variant="primary"
			size="md"
			aria-label="Back to top"
			className="fixed bottom-8 right-8 z-50 rounded-full shadow-lg p-3 h-12 w-12 opacity-90 hover:opacity-100 transition-all duration-300"
		>
			<ArrowUp size={24} />
		</Button>
	);
}
