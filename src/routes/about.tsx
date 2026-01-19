import { createFileRoute } from "@tanstack/react-router";
import { Info, Shield, Users, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/Accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { envConfig } from "@/lib/env";
import i18n from "@/lib/i18n";

/**
 * Generate dynamic meta tags for the about page
 */
function getAboutPageMeta() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: envConfig.baseUrl;
	const canonical = `${baseUrl}/about`;

	const title = i18n.t("common.seo.about.title", {
		ns: "common",
		defaultValue: "關於 SmartPlay HK OSS | 社群項目",
	});
	const description = i18n.t("common.seo.about.description", {
		ns: "common",
		defaultValue:
			"以開放技術賦能香港體育社群。了解更多關於 SmartPlay HK OSS 的使命、運作機制及團隊背景。",
	});
	const ogTitle = i18n.t("common.seo.about.ogTitle", {
		ns: "common",
		defaultValue: "關於我們 - SmartPlay HK OSS",
	});
	const ogDescription = i18n.t("common.seo.about.ogDescription", {
		ns: "common",
		defaultValue: "我們的使命是讓香港的體育設施資訊對每個人都觸手可及。",
	});

	return {
		title,
		description,
		ogTitle,
		ogDescription,
		ogImage: `${baseUrl}/favicon/android-chrome-512x512.png`,
		twitterCard: "summary" as const,
		canonical,
	};
}

/**
 * Generate structured data (JSON-LD) for the about page
 */
function getAboutPageStructuredData() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: envConfig.baseUrl;

	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": `${baseUrl}/about#webpage`,
		url: `${baseUrl}/about`,
		name: i18n.t("common.seo.about.title", {
			ns: "common",
			defaultValue: "關於 SmartPlay HK OSS",
		}),
		description: i18n.t("common.seo.about.description", {
			ns: "common",
			defaultValue: "了解 SmartPlay HK OSS 的使命與機制。",
		}),
		breadcrumb: {
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Home",
					item: baseUrl,
				},
				{
					"@type": "ListItem",
					position: 2,
					name: "About",
					item: `${baseUrl}/about`,
				},
			],
		},
	};
}

export const Route = createFileRoute("/about")({
	component: AboutPage,
	head: () => {
		const {
			title,
			description,
			ogTitle,
			ogDescription,
			ogImage,
			twitterCard,
			canonical,
		} = getAboutPageMeta();

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
				// English
				{ rel: "alternate", hrefLang: "en", href: `${canonical}?lng=en` },
				// Chinese Simplified
				{ rel: "alternate", hrefLang: "zh-Hans", href: `${canonical}?lng=cn` },
				// Chinese Traditional
				{ rel: "alternate", hrefLang: "zh-Hant", href: `${canonical}?lng=zh` },
				// Hong Kong Chinese (default)
				{ rel: "alternate", hrefLang: "zh-HK", href: canonical },
				// x-default
				{
					rel: "alternate",
					hrefLang: "x-default",
					href: `${canonical}?lng=en`,
				},
			],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify(getAboutPageStructuredData()),
				},
			],
		};
	},
});

function AboutPage() {
	const { t } = useTranslation(["common"]);

	const qaItems = t("about.qa.items", { returnObjects: true }) as Array<{
		q: string;
		a: string;
	}>;

	return (
		<div className="min-h-screen bg-background/50 text-foreground flex flex-col items-center py-10 px-4 md:px-8">
			<div className="max-w-4xl w-full space-y-16">
				{/* Hero Section */}
				<section className="text-center space-y-6">
					<div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6 ring-1 ring-primary/20 shadow-lg shadow-primary/5">
						<Info className="w-10 h-10 text-primary" />
					</div>
					<h1 className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70 pb-2">
						{t("about.title", { defaultValue: "關於 SmartPlay HK OSS" })}
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
						{t("about.subtitle", {
							defaultValue: "以開放技術賦能香港體育社群",
						})}
					</p>
				</section>

				{/* Mission & How it Works Grid */}
				<div className="grid md:grid-cols-2 gap-8">
					<Card className="hover:border-primary/20">
						<CardHeader>
							<div className="w-12 h-12 rounded-xl bg-pacific-blue-100/50 flex items-center justify-center mb-4 text-pacific-blue-600 ring-1 ring-pacific-blue-200">
								<Users className="w-6 h-6" />
							</div>
							<CardTitle className="text-2xl font-bold">
								{t("about.mission.title", { defaultValue: "我們的使命" })}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground leading-relaxed">
								{t("about.mission.description", {
									defaultValue:
										"SmartPlay HK OSS 的成立是因為官方網站難以閱讀和導航，施加了不必要的限制（如 5 個地區限制），且缺乏某些功能。我們旨在讓所有人都能輕鬆獲取體育場地資訊。",
								})}
							</p>
						</CardContent>
					</Card>

					<Card className="hover:border-primary/20">
						<CardHeader>
							<div className="w-12 h-12 rounded-xl bg-meadow-green-100/50 flex items-center justify-center mb-4 text-meadow-green-600 ring-1 ring-meadow-green-200">
								<Zap className="w-6 h-6" />
							</div>
							<CardTitle className="text-2xl font-bold">
								{t("about.mechanism.title", { defaultValue: "運作原理" })}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground leading-relaxed">
								{t("about.mechanism.description", {
									defaultValue:
										"此工具作為一個專門的瀏覽器，高效地掃描官方康文署 SmartPlay 系統為空缺時段。它實時聚合這些數據，為您提供跨所有區域的統一概覽。",
								})}
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Q&A Section */}
				<section>
					<div className="flex items-center gap-4 justify-center mb-12">
						<div className="p-3 bg-vanilla-custard-100/50 rounded-xl text-vanilla-custard-700 ring-1 ring-vanilla-custard-200">
							<Shield className="w-8 h-8" />
						</div>
						<h2 className="text-4xl font-black tracking-tight">
							{t("about.qa.title", { defaultValue: "常見問題" })}
						</h2>
					</div>

					<Accordion className="space-y-4">
						{qaItems.map((item, index) => (
							<AccordionItem key={item.q} value={`item-${index}`}>
								<AccordionTrigger className="text-lg text-left">
									{index + 1}. {item.q}
								</AccordionTrigger>
								<AccordionContent className="text-muted-foreground text-base leading-relaxed">
									{item.a}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</section>
			</div>
		</div>
	);
}
