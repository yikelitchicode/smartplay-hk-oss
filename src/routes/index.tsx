import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	ArrowRight,
	Bell,
	CalendarDays,
	Info,
	LayoutGrid,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BackgroundSlideshow } from "@/components/BackgroundSlideshow";
import { Badge } from "@/components/ui/Badge";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/Card";

export const Route = createFileRoute("/")({ component: App });

function App() {
	const { t } = useTranslation(["home", "common"]);

	// Button styles replicated from Button.tsx for Link usage
	const buttonBase =
		"inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed";
	const buttonPrimary =
		"bg-primary text-primary-foreground hover:bg-primary-hover focus:bg-primary-hover";
	const linkButtonClasses = `${buttonBase} ${buttonPrimary} w-full justify-between group-hover:bg-pacific-blue-600 group-hover:text-white transition-all px-4 py-2 text-base`;

	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
			{/* Background Slideshow */}
			<div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
				<BackgroundSlideshow />
				{/* Dimming & Gradient Overlays (Bright Mode) */}
				<div className="absolute inset-0 bg-porcelain-50/95 z-10" />
				<div className="absolute inset-0 bg-linear-to-b from-white/20 via-transparent to-background z-20" />
			</div>

			<main className="w-full max-w-5xl z-10 grid gap-12 relative">
				{/* Hero Section */}
				<div className="text-center space-y-6">
					<h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground text-pretty text-shadow-sm">
						<span className="bg-linear-to-r from-pacific-blue-600 via-icy-blue-500 to-pacific-blue-600 bg-clip-text text-transparent bg-size-[200%] animate-gradient">
							{t("hero.title")}
						</span>
					</h1>

					<p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto text-pretty text-shadow-sm">
						{t("hero.description")}
					</p>
				</div>

				{/* Feature Cards Grid */}
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
					{/* Booking Card - Active */}
					<Card className="group relative overflow-hidden border-pacific-blue-100 hover:border-pacific-blue-300 transition-all duration-300 hover:shadow-xl hover:shadow-pacific-blue-500/10 bg-white/60 backdrop-blur-md flex flex-col h-full">
						<div className="absolute top-0 right-0 p-6 pointer-events-none">
							<CalendarDays className="w-24 h-24 text-pacific-blue-500/5 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-transform duration-500" />
						</div>

						<CardHeader className="flex-1">
							<div className="flex justify-between items-start mb-2">
								<div className="p-3 bg-pacific-blue-50 rounded-2xl group-hover:bg-pacific-blue-100 transition-colors">
									<LayoutGrid className="w-6 h-6 text-pacific-blue-600" />
								</div>
								<Badge className="bg-pacific-blue-100 text-pacific-blue-700 hover:bg-pacific-blue-200 border-none">
									{t("features.booking.badge")}
								</Badge>
							</div>
							<CardTitle className="text-2xl">
								{t("features.booking.title")}
							</CardTitle>
							<CardDescription className="text-base line-clamp-2">
								{t("features.booking.description")}
							</CardDescription>
						</CardHeader>

						<CardFooter className="pt-4">
							<Link to="/booking" className={linkButtonClasses}>
								{t("features.booking.cta")}
								<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
							</Link>
						</CardFooter>
					</Card>

					{/* Scheduler Card - New */}
					<Card className="group relative overflow-hidden border-pacific-blue-100 hover:border-pacific-blue-300 transition-all duration-300 hover:shadow-xl hover:shadow-pacific-blue-500/10 bg-white/60 backdrop-blur-md flex flex-col h-full">
						<div className="absolute top-0 right-0 p-6 pointer-events-none">
							<Bell className="w-24 h-24 text-meadow-green-500/5 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-transform duration-500" />
						</div>

						<CardHeader className="flex-1">
							<div className="flex justify-between items-start mb-2">
								<div className="p-3 bg-meadow-green-50 rounded-2xl group-hover:bg-meadow-green-100 transition-colors">
									<Bell className="w-6 h-6 text-meadow-green-600" />
								</div>
								<Badge className="bg-meadow-green-100 text-meadow-green-700 hover:bg-meadow-green-200 border-none">
									{t("features.scheduler.badge")}
								</Badge>
							</div>
							<CardTitle className="text-2xl">
								{t("features.scheduler.title")}
							</CardTitle>
							<CardDescription className="text-base line-clamp-2">
								{t("features.scheduler.description")}
							</CardDescription>
						</CardHeader>

						<CardFooter className="pt-4">
							<Link to="/scheduler" className={linkButtonClasses}>
								{t("features.scheduler.cta")}
								<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
							</Link>
						</CardFooter>
					</Card>

					{/* Activity Card - Coming Soon */}
					<Card className="group relative overflow-hidden border-pacific-blue-100 hover:border-pacific-blue-300 transition-all duration-300 hover:shadow-xl hover:shadow-pacific-blue-500/10 bg-white/60 backdrop-blur-md flex flex-col h-full">
						<div className="absolute top-0 right-0 p-6 pointer-events-none">
							<Activity className="w-24 h-24 text-gray-500/5 rotate-12" />
						</div>

						<CardHeader className="flex-1">
							<div className="flex justify-between items-start mb-2">
								<div className="p-3 bg-pacific-blue-50 rounded-2xl group-hover:bg-pacific-blue-100 transition-colors">
									<Activity className="w-6 h-6 text-pacific-blue-600" />
								</div>
								<Badge
									variant="secondary"
									className="bg-pacific-blue-100 text-pacific-blue-700 hover:bg-pacific-blue-200 border-none"
								>
									{t("features.activity.badge")}
								</Badge>
							</div>
							<CardTitle className="text-2xl text-gray-700">
								{t("features.activity.title")}
							</CardTitle>
							<CardDescription className="text-base">
								{t("features.activity.description")}
							</CardDescription>
						</CardHeader>

						<CardFooter className="pt-4">
							<Link to="/activity" className={linkButtonClasses}>
								{t("features.activity.cta")}
								<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
							</Link>
						</CardFooter>
					</Card>
				</div>

				{/* Disclaimer */}
				<div className="flex items-center gap-2 justify-center text-sm text-muted-foreground/80 bg-porcelain-50/80 p-3 rounded-lg border border-border/50 backdrop-blur-sm max-w-fit mx-auto">
					<Info className="w-4 h-4 shrink-0" />
					<p>{t("disclaimer")}</p>
				</div>
			</main>
		</div>
	);
}
