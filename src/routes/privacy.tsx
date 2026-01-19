import { createFileRoute } from "@tanstack/react-router";
import { Database, Eye, Shield, Trash2, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCookieConsent } from "@/components/cookie-notice";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/Accordion";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { envConfig } from "@/lib/env";
import i18n from "@/lib/i18n";

/**
 * Generate dynamic meta tags for the privacy page
 */
function getPrivacyPageMeta() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: envConfig.baseUrl; // Default canonical base
	const canonical = `${baseUrl}/privacy`;

	return {
		title: i18n.t("privacy.seo.title", {
			ns: "privacy",
			defaultValue: "隱私權政策 | SmartPlay HK OSS",
		}),
		description: i18n.t("privacy.seo.description", {
			ns: "privacy",
			defaultValue:
				"了解 SmartPlay HK OSS 如何處理您的數據。我們的隱私優先方案確保在您查詢康文署設施可用性時，僅收集最少的數據。",
		}),
		ogTitle: i18n.t("privacy.seo.ogTitle", {
			ns: "privacy",
			defaultValue: "隱私權政策 - SmartPlay HK OSS",
		}),
		ogDescription: i18n.t("privacy.seo.ogDescription", {
			ns: "privacy",
			defaultValue:
				"SmartPlay HK OSS 康文署設施可用性查詢工具的數據保護和隱私實踐。",
		}),
		ogImage: `${baseUrl}/favicon/android-chrome-512x512.png`,
		twitterCard: "summary" as const,
		canonical,
	};
}

/**
 * Generate structured data (JSON-LD) for the privacy page
 */
function getPrivacyPageStructuredData() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: envConfig.baseUrl;

	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": `${baseUrl}/privacy#webpage`,
		url: `${baseUrl}/privacy`,
		name: i18n.t("privacy.seo.title", {
			ns: "privacy",
			defaultValue: "隱私權政策 - SmartPlay HK OSS",
		}),
		description: i18n.t("privacy.seo.description", {
			ns: "privacy",
			defaultValue: "SmartPlay HK OSS 服務的隱私權政策。",
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
					name: i18n.t("privacy.title", {
						ns: "privacy",
						defaultValue: "隱私權政策",
					}),
					item: `${baseUrl}/privacy`,
				},
			],
		},
	};
}

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
	head: () => {
		const {
			title,
			description,
			ogTitle,
			ogDescription,
			ogImage,
			twitterCard,
			canonical,
		} = getPrivacyPageMeta();

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
				{ name: "robots", content: "noindex, follow" },
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
			],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify(getPrivacyPageStructuredData()),
				},
			],
		};
	},
});

function PrivacyPage() {
	const { t } = useTranslation(["privacy", "common"]);
	const { hasConsented, resetConsent } = useCookieConsent();
	const [showResetSuccess, setShowResetSuccess] = useState(false);

	const handleResetConsent = () => {
		resetConsent();
		setShowResetSuccess(true);
		setTimeout(() => setShowResetSuccess(false), 3000);
	};

	return (
		<div className="min-h-screen bg-background/50 text-foreground flex flex-col items-center py-10 px-4 md:px-8">
			<div className="max-w-4xl w-full space-y-12">
				{/* Header */}
				<section className="text-center space-y-6">
					<div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6 ring-1 ring-primary/20 shadow-lg shadow-primary/5">
						<Shield className="w-10 h-10 text-primary" />
					</div>
					<h1 className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70 pb-2">
						{t("privacy.title")}
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
						{t("privacy.subtitle")}
					</p>
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
						<span>{t("privacy.lastUpdated")}</span>
						<time className="text-foreground">
							{new Date().toLocaleDateString()}
						</time>
					</div>
				</section>

				{/* Quick Overview Cards */}
				<div className="grid md:grid-cols-3 gap-6">
					<Card className="hover:border-primary/20">
						<CardHeader>
							<div className="w-12 h-12 rounded-xl bg-pacific-blue-100/50 flex items-center justify-center mb-4 text-pacific-blue-600 ring-1 ring-pacific-blue-200">
								<Database className="w-6 h-6" />
							</div>
							<CardTitle className="text-lg font-bold">
								{t("privacy.overviewCards.dataCollected.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("privacy.overviewCards.dataCollected.description")}
							</p>
						</CardContent>
					</Card>

					<Card className="hover:border-primary/20">
						<CardHeader>
							<div className="w-12 h-12 rounded-xl bg-meadow-green-100/50 flex items-center justify-center mb-4 text-meadow-green-600 ring-1 ring-meadow-green-200">
								<Shield className="w-6 h-6" />
							</div>
							<CardTitle className="text-lg font-bold">
								{t("privacy.overviewCards.dataProtection.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("privacy.overviewCards.dataProtection.description")}
							</p>
						</CardContent>
					</Card>

					<Card className="hover:border-primary/20">
						<CardHeader>
							<div className="w-12 h-12 rounded-xl bg-vanilla-custard-100/50 flex items-center justify-center mb-4 text-vanilla-custard-700 ring-1 ring-vanilla-custard-200">
								<User className="w-6 h-6" />
							</div>
							<CardTitle className="text-lg font-bold">
								{t("privacy.overviewCards.userRights.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("privacy.overviewCards.userRights.description")}
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Cookie Management Section */}
				{hasConsented && (
					<Alert variant="info" title={t("privacy.cookieManagement.title")}>
						<div className="space-y-3">
							<p className="text-sm">
								{t("privacy.cookieManagement.hasConsented")}{" "}
								{t("privacy.cookieManagement.description")}
							</p>
							<div className="flex gap-3">
								<Button
									variant="secondary"
									size="sm"
									onClick={handleResetConsent}
								>
									<Trash2 className="w-4 h-4 mr-2" />
									{t("privacy.cookieManagement.resetButton")}
								</Button>
							</div>
							{showResetSuccess && (
								<p className="text-sm text-success mt-2">
									{t("privacy.cookieManagement.resetSuccess")}
								</p>
							)}
						</div>
					</Alert>
				)}

				{/* Detailed Privacy Information */}
				{/* Detailed Privacy Information */}
				<Accordion className="space-y-4">
					{/* Overview */}
					<AccordionItem value="overview">
						<AccordionTrigger className="text-lg font-semibold">
							1. {t("privacy.sections.overview.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t(
											"privacy.sections.overview.items.anonymousSession.title",
										)}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t(
											"privacy.sections.overview.items.anonymousSession.content",
										)}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t(
											"privacy.sections.overview.items.watcherPreferences.title",
										)}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t(
											"privacy.sections.overview.items.watcherPreferences.content",
										)}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.overview.items.webhookUrls.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.overview.items.webhookUrls.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* Data Usage */}
					<AccordionItem value="usage">
						<AccordionTrigger className="text-lg font-semibold">
							2. {t("privacy.sections.usage.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-3">
								<div className="flex gap-3">
									<div className="shrink-0 w-2 h-2 rounded-full bg-pacific-blue-600 mt-2" />
									<div>
										<p className="text-sm text-foreground font-medium">
											{t("privacy.sections.usage.items.monitor.title")}
										</p>
										<p className="text-sm text-muted-foreground">
											{t("privacy.sections.usage.items.monitor.content")}
										</p>
									</div>
								</div>

								<div className="flex gap-3">
									<div className="shrink-0 w-2 h-2 rounded-full bg-pacific-blue-600 mt-2" />
									<div>
										<p className="text-sm text-foreground font-medium">
											{t("privacy.sections.usage.items.notify.title")}
										</p>
										<p className="text-sm text-muted-foreground">
											{t("privacy.sections.usage.items.notify.content")}
										</p>
									</div>
								</div>

								<div className="flex gap-3">
									<div className="shrink-0 w-2 h-2 rounded-full bg-pacific-blue-600 mt-2" />
									<div>
										<p className="text-sm text-foreground font-medium">
											{t("privacy.sections.usage.items.improve.title")}
										</p>
										<p className="text-sm text-muted-foreground">
											{t("privacy.sections.usage.items.improve.content")}
										</p>
									</div>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* Cookies */}
					<AccordionItem value="cookies">
						<AccordionTrigger className="text-lg font-semibold">
							3. {t("privacy.sections.cookies.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.cookies.items.necessary.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.cookies.items.necessary.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.cookies.items.analytics.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.cookies.items.analytics.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.cookies.items.preferences.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.cookies.items.preferences.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.cookies.items.marketing.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.cookies.items.marketing.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* Data Protection */}
					<AccordionItem value="protection">
						<AccordionTrigger className="text-lg font-semibold">
							4. {t("privacy.sections.protection.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t(
											"privacy.sections.protection.items.anonymousByDesign.title",
										)}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t(
											"privacy.sections.protection.items.anonymousByDesign.content",
										)}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.protection.items.storage.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.protection.items.storage.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.protection.items.retention.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.protection.items.retention.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.protection.items.thirdParty.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.protection.items.thirdParty.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* User Rights */}
					<AccordionItem value="rights">
						<AccordionTrigger className="text-lg font-semibold">
							5. {t("privacy.sections.rights.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.rights.items.access.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.rights.items.access.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.rights.items.delete.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.rights.items.delete.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.rights.items.portability.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.rights.items.portability.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.rights.items.optOut.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.rights.items.optOut.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("privacy.sections.rights.items.withdrawConsent.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("privacy.sections.rights.items.withdrawConsent.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* Children's Privacy */}
					<AccordionItem value="children">
						<AccordionTrigger className="text-lg font-semibold">
							6. {t("privacy.sections.children.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("privacy.sections.children.content1")}
							</p>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("privacy.sections.children.content2")}
							</p>
						</AccordionContent>
					</AccordionItem>

					{/* Changes */}
					<AccordionItem value="changes">
						<AccordionTrigger className="text-lg font-semibold">
							7. {t("privacy.sections.changes.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("privacy.sections.changes.content")}
							</p>
							<ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1 ml-4">
								<li>{t("privacy.sections.changes.list.item1")}</li>
								<li>{t("privacy.sections.changes.list.item2")}</li>
								<li>{t("privacy.sections.changes.list.item3")}</li>
							</ul>
							<p className="text-sm text-muted-foreground leading-relaxed mt-3">
								{t("privacy.sections.changes.acceptance")}
							</p>
						</AccordionContent>
					</AccordionItem>

					{/* Contact */}
					<AccordionItem value="contact">
						<AccordionTrigger className="text-lg font-semibold">
							8. {t("privacy.sections.contact.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("privacy.sections.contact.content")}
							</p>
							<div className="bg-porcelain-50 p-4 rounded-lg space-y-2">
								<p className="text-sm text-foreground">
									<strong>GitHub:</strong>{" "}
									<a
										href="https://github.com/lst97/smartplay-hk-oss"
										target="_blank"
										rel="noopener noreferrer"
										className="text-pacific-blue-600 hover:text-pacific-blue-700 underline"
									>
										{t("privacy.sections.contact.github")}
									</a>
								</p>
								<p className="text-sm text-foreground">
									<strong>Issues:</strong>{" "}
									<a
										href="https://github.com/lst97/smartplay-hk-oss/issues"
										target="_blank"
										rel="noopener noreferrer"
										className="text-pacific-blue-600 hover:text-pacific-blue-700 underline"
									>
										{t("privacy.sections.contact.issues")}
									</a>
								</p>
								<p className="text-xs text-muted-foreground mt-3">
									{t("privacy.sections.contact.note")}
								</p>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>

				{/* Quick Actions */}
				<Card className="">
					<CardHeader>
						<CardTitle className="text-xl">
							{t("privacy.quickActions.title")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid sm:grid-cols-2 gap-4">
							<Button
								variant="secondary"
								className="justify-start"
								onClick={() => {
									window.location.href = "/scheduler";
								}}
							>
								<Eye className="w-4 h-4 mr-2" />
								{t("privacy.quickActions.manageWatchers")}
							</Button>
							<Button
								variant="secondary"
								className="justify-start"
								onClick={handleResetConsent}
								disabled={!hasConsented}
							>
								<Trash2 className="w-4 h-4 mr-2" />
								{t("privacy.quickActions.resetCookiePreferences")}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Footer Note */}
				<div className="text-center text-sm text-muted-foreground pt-4">
					<p>{t("privacy.footerNote")}</p>
				</div>
			</div>
		</div>
	);
}
