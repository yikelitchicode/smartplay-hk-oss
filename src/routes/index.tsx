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
import i18n from "@/lib/i18n";

/**
 * Generate dynamic meta tags for the Home page
 */
function getHomePageMeta() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: "https://smartplay.hk";
	const canonical = baseUrl;

	const title = i18n.t("home.seo.title", {
		ns: "home",
		defaultValue: "SmartPlay HK OSS | 康文署體育設施可用性查詢工具",
	});
	const description = i18n.t("home.seo.description", {
		ns: "home",
		defaultValue:
			"SmartPlay HK OSS 是一個開源、社群驅動的工具，用於查詢香港康文署體育設施的可用位置。實時監控網球場、籃球場等場地的可用情況。",
	});
	const ogTitle = i18n.t("home.seo.ogTitle", {
		ns: "home",
		defaultValue: "SmartPlay HK OSS - 社群康文署場地查詢工具",
	});
	const ogDescription = i18n.t("home.seo.ogDescription", {
		ns: "home",
		defaultValue:
			"更快、更簡潔的開源方案，用於查詢香港康文署設施可用性。獲取實時更新與通知。",
	});

	return {
		title,
		description,
		ogTitle,
		ogDescription,
		ogImage: `${baseUrl}/og-image.jpg`,
		twitterCard: "summary_large_image",
		canonical,
	};
}

/**
 * Generate structured data (JSON-LD) for the Home page
 */
function getHomePageStructuredData() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: "https://smartplay.hk";

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebApplication",
				"@id": `${baseUrl}/#webapp`,
				name: "SmartPlay HK OSS",
				description: i18n.t("home.seo.description", {
					ns: "home",
					defaultValue:
						"SmartPlay HK OSS 是一個開源、社群驅動的工具，用於查詢香港康文署體育設施的可用位置。",
				}),
				url: baseUrl,
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "Web",
				provider: {
					"@type": "Organization",
					name: "SmartPlay HK OSS",
					url: baseUrl,
				},
			},
		],
	};
}

export const Route = createFileRoute("/")({
	component: App,
	head: () => {
		const {
			title,
			description,
			ogTitle,
			ogDescription,
			ogImage,
			twitterCard,
			canonical,
		} = getHomePageMeta();

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: ogTitle },
				{ property: "og:description", content: ogDescription },
				{ property: "og:type", content: "website" },
				{ property: "og:image", content: ogImage },
				{ property: "og:url", content: canonical },
				{ name: "twitter:card", content: twitterCard },
				{ name: "twitter:title", content: ogTitle },
				{ name: "twitter:description", content: ogDescription },
				{ name: "twitter:image", content: ogImage },
				{ name: "twitter:url", content: canonical },
				{ name: "robots", content: "index, follow" },
			],
			links: [
				{ rel: "canonical", href: canonical },
				{ rel: "alternate", hrefLang: "en", href: `${canonical}?lng=en` },
				{ rel: "alternate", hrefLang: "zh-Hans", href: `${canonical}?lng=cn` },
				{ rel: "alternate", hrefLang: "zh-Hant", href: `${canonical}?lng=zh` },
				{ rel: "alternate", hrefLang: "zh-HK", href: canonical },
				{
					rel: "alternate",
					hrefLang: "x-default",
					href: `${canonical}?lng=en`,
				},
			],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify(getHomePageStructuredData()),
				},
			],
		};
	},
});

function App() {
	const { t } = useTranslation(["home", "common"]);

	// Button styles replicated from Button.tsx for Link usage
	const buttonBase =
		"inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed";
	const buttonPrimary =
		"bg-primary text-primary-foreground hover:bg-primary-hover focus:bg-primary-hover";
	const linkButtonClasses = `${buttonBase} ${buttonPrimary} w-full justify-between group-hover:bg-pacific-blue-600 group-hover:text-white transition-all px-4 py-2 text-base`;

	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 relative overflow-hidden ">
			{/* Background Slideshow */}
			<div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
				<BackgroundSlideshow />
				{/* Dimming & Gradient Overlays (Bright Mode) */}
				<div className="absolute inset-0 bg-porcelain-50/97 z-10" />
				<div className="absolute inset-0 bg-linear-to-b from-white/20 via-transparent to-background z-20" />
			</div>

			<main className="w-full max-w-5xl z-10 grid gap-12 relative">
				{/* Hero Section */}
				<div className="text-center space-y-8 relative z-10">
					<div className="inline-block px-8 py-10 md:px-12 md:py-16 rounded-[2.5rem] dark:bg-black/5 backdrop-blur-sm transition-all group">
						<h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground text-pretty text-shadow-sm mb-6 drop-shadow-sm">
							<span className="bg-linear-to-r from-pacific-blue-600 via-icy-blue-500 to-pacific-blue-600 bg-clip-text text-transparent bg-size-[200%] animate-gradient">
								{t("hero.title", { defaultValue: "SmartPlay HK OSS" })}
							</span>
						</h1>

						<p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto text-pretty text-shadow-sm leading-relaxed">
							{t("hero.description", {
								defaultValue:
									"更快、更簡潔的開源替代方案，用於查詢康文署設施可用性。實時監控與進階篩選。",
							})}
						</p>
					</div>
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
									{t("features.booking.badge", { defaultValue: "已啟用" })}
								</Badge>
							</div>
							<CardTitle className="text-2xl">
								{t("features.booking.title", { defaultValue: "場地查詢" })}
							</CardTitle>
							<CardDescription className="text-base">
								{t("features.booking.description", {
									defaultValue:
										"即時橫跨全港所有地區，一鍵查詢網球場、籃球場、羽毛球場及壁球場等康文署設施的最新可用時段，無需反覆切換地區介面。",
								})}
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
									{t("features.scheduler.badge", { defaultValue: "新功能" })}
								</Badge>
							</div>
							<CardTitle className="text-2xl">
								{t("features.scheduler.title", {
									defaultValue: "監測排程器",
								})}
							</CardTitle>
							<CardDescription className="text-base">
								{t("features.scheduler.description", {
									defaultValue:
										"設定專屬的監測規律，當您心儀的場地（如熱門時段的網球場）出現空缺時，系統將立即透過 Webhook 發送實時通知，確保您第一時間掌握訂場機會。",
								})}
							</CardDescription>
						</CardHeader>

						<CardFooter className="pt-4">
							<Link to="/scheduler" className={linkButtonClasses}>
								{t("features.scheduler.cta")}
								<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
							</Link>
						</CardFooter>
					</Card>

					{/* Activity Card - Disabled */}
					<Card className="group relative overflow-hidden border-gray-200 bg-gray-50/60 backdrop-blur-md flex flex-col h-full opacity-60 cursor-not-allowed">
						<div className="absolute top-0 right-0 p-6 pointer-events-none">
							<Activity className="w-24 h-24 text-gray-400/5 rotate-12" />
						</div>

						<CardHeader className="flex-1">
							<div className="flex justify-between items-start mb-2">
								<div className="p-3 bg-gray-100 rounded-2xl">
									<Activity className="w-6 h-6 text-gray-400" />
								</div>
								<Badge
									variant="secondary"
									className="bg-gray-200 text-gray-500 border-none cursor-default"
								>
									{t("features.activity.badge", { defaultValue: "計劃中" })}
								</Badge>
							</div>
							<CardTitle className="text-2xl text-gray-500">
								{t("features.activity.title", { defaultValue: "活動報名" })}
							</CardTitle>
							<CardDescription className="text-base text-gray-400">
								{t("features.activity.description", {
									defaultValue:
										"集中瀏覽各類體育課程、訓練班及競賽活動的餘額、報名日期與狀態。即將推出的功能將支援關鍵活動的名額監控。",
								})}
							</CardDescription>
						</CardHeader>

						<CardFooter className="pt-4">
							<div
								className={`${linkButtonClasses} bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200`}
							>
								{t("features.activity.cta")}
								<ArrowRight className="w-4 h-4 ml-2" />
							</div>
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
