import { useEffect, useState } from "react";

const IMAGES = [
	"/images/basketball-bg.jpg",
	"/images/football-bg.jpg",
	"/images/gim-bg.jpg",
];

export function BackgroundSlideshow() {
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
		}, 15000); // Change image every 15 seconds

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="absolute inset-0 w-full h-full">
			{IMAGES.map((src, index) => (
				<img
					key={src}
					src={src}
					alt="Background"
					className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-5000 ease-in-out ${
						index === currentIndex ? "opacity-100" : "opacity-0"
					}`}
					loading="eager"
					decoding="async"
					fetchPriority={index === 0 ? "high" : "auto"}
				/>
			))}
		</div>
	);
}
