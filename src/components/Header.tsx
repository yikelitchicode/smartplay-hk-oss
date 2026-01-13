import { Link } from "@tanstack/react-router";
import { CalendarDays, Home, Menu } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import type { NavigationItem } from "./ui";
import { Button, Drawer, NavigationList } from "./ui";

export default function Header() {
	const { t } = useTranslation("common");
	const [isOpen, setIsOpen] = useState(false);

	const navigationItems: NavigationItem[] = [
		{
			id: "home",
			label: t("menu"),
			to: "/",
			icon: <Home size={20} />,
		},
		{
			id: "booking",
			label: "Booking",
			to: "/booking",
			icon: <CalendarDays size={20} />,
		},
	];

	return (
		<>
			<header className="p-4 flex items-center justify-between bg-card border-b border-border shadow-lg z-40 sticky top-0">
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsOpen(true)}
						aria-label={t("menu")}
						className="text-foreground hover:bg-muted"
					>
						<Menu size={24} />
					</Button>
					<h1 className="ml-4 text-xl font-semibold flex items-center gap-2">
						<Link to="/" className="text-card-foreground hover:text-primary">
							SmartPlay HK OSS
						</Link>
						<span className="text-muted-foreground">|</span>
						<span className="text-primary">Booking</span>
					</h1>
				</div>
				<LanguageSwitcher />
			</header>

			<Drawer
				open={isOpen}
				onClose={() => setIsOpen(false)}
				anchor="left"
				size="lg"
			>
				<NavigationList
					items={navigationItems}
					onItemClick={() => setIsOpen(false)}
					className="p-4"
				/>
			</Drawer>
		</>
	);
}
