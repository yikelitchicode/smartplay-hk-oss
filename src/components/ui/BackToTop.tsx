import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";

export function BackToTop() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
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
		};
	}, []);

	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};

	if (!isVisible) {
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
