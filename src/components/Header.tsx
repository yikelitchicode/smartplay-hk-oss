import { Link, useLocation } from "@tanstack/react-router";
import { Activity, CalendarDays, Home, Menu } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import type { NavigationItem } from "./ui";
import { Button, Drawer, NavigationList } from "./ui";

function HKClock() {
	const [time, setTime] = useState(() =>
		new Date().toLocaleTimeString("en-HK", {
			timeZone: "Asia/Hong_Kong",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		}),
	);

	useEffect(() => {
		const update = () => {
			setTime(
				new Date().toLocaleTimeString("en-HK", {
					timeZone: "Asia/Hong_Kong",
					hour: "2-digit",
					minute: "2-digit",
					hour12: true,
				}),
			);
		};
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-muted/30 rounded-full border border-border/40 backdrop-blur-md">
			<div className="relative flex h-2 w-2">
				<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
				<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
			</div>
			<span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">
				HKT
			</span>
			<span
				className="text-sm font-black tabular-nums text-foreground/90 tracking-tight"
				suppressHydrationWarning
			>
				{time}
			</span>
		</div>
	);
}

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
			{
				id: "activity",
				label: t("nav.activity"),
				to: "/activity",
				icon: <Activity size={20} />,
			},
			{
				id: "scheduler",
				label: t("nav.scheduler"),
				to: "/scheduler",
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
				<div className="flex items-center gap-4">
					<HKClock />
					<LanguageSwitcher />
				</div>
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
