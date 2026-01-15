import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, Home, Menu } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import type { NavigationItem } from "./ui";
import { Button, Drawer, NavigationList } from "./ui";

export default function Header(): React.ReactNode {
	const { t } = useTranslation("common");
	const [isOpen, setIsOpen] = useState(false);
	const location = useLocation();

	// Get current page name based on route
	const currentPageName = useMemo(() => {
		const path = location.pathname;
		if (path === "/") return t("nav.home");
		if (path === "/booking") return t("nav.booking");
		return t("nav.home"); // Default fallback
	}, [location.pathname, t]);

	const navigationItems = useMemo<NavigationItem[]>(
		() => [
			{
				id: "home",
				label: t("nav.home"),
				to: "/",
				icon: <Home size={20} />,
			},
			{
				id: "booking",
				label: t("nav.booking"),
				to: "/booking",
				icon: <CalendarDays size={20} />,
			},
		],
		[t],
	);

	const handleOpenDrawer = useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleCloseDrawer = useCallback(() => {
		setIsOpen(false);
	}, []);

	const handleItemClick = useCallback(() => {
		setIsOpen(false);
	}, []);

	return (
		<>
			<header className="p-4 flex items-center justify-between bg-card border-b border-border shadow-lg z-40 sticky top-0">
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleOpenDrawer}
						aria-label={t("menu")}
						className="text-foreground hover:bg-muted"
						aria-expanded={isOpen}
						aria-controls="navigation-drawer"
					>
						<Menu size={24} />
					</Button>
					<h1 className="ml-4 text-xl font-semibold flex items-center gap-2">
						<Link to="/" className="text-card-foreground hover:text-primary">
							SmartPlay HK OSS
						</Link>
						<span className="text-muted-foreground" aria-hidden="true">
							|
						</span>
						<span className="text-primary">{currentPageName}</span>
					</h1>
				</div>
				<LanguageSwitcher />
			</header>

			<Drawer
				open={isOpen}
				onClose={handleCloseDrawer}
				anchor="left"
				size="lg"
				title={t("nav.title")}
			>
				<NavigationList
					items={navigationItems}
					onItemClick={handleItemClick}
					className="p-4"
				/>
			</Drawer>
		</>
	);
}
