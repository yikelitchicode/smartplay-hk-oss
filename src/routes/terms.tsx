import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileText, Gavel, Shield, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/Accordion";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { envConfig } from "@/lib/env";
import i18n from "@/lib/i18n";

/**
 * Generate dynamic meta tags for the terms page
 */
function getTermsPageMeta() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: envConfig.baseUrl; // Default canonical base
	const canonical = `${baseUrl}/terms`;

	return {
		title: i18n.t("terms.seo.title", {
			ns: "terms",
			defaultValue: "條款與條件 | SmartPlay HK OSS",
		}),
		description: i18n.t("terms.seo.description", {
			ns: "terms",
			defaultValue:
				"閱讀 SmartPlay HK OSS 的條款與條件，這是一個用於檢查香港康文署體育設施可用性的非官方開源工具。",
		}),
		ogTitle: i18n.t("terms.seo.ogTitle", {
			ns: "terms",
			defaultValue: "條款與條件 - SmartPlay HK OSS",
		}),
		ogDescription: i18n.t("terms.seo.ogDescription", {
			ns: "terms",
			defaultValue:
				"SmartPlay HK OSS 康文署設施可用性查詢工具的服務條款和法律限制。",
		}),
		ogImage: `${baseUrl}/favicon/android-chrome-512x512.png`,
		twitterCard: "summary" as const,
		canonical,
	};
}

/**
 * Generate structured data (JSON-LD) for the terms page
 */
function getTermsPageStructuredData() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: envConfig.baseUrl;

	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": `${baseUrl}/terms#webpage`,
		url: `${baseUrl}/terms`,
		name: i18n.t("terms.seo.title", {
			ns: "terms",
			defaultValue: "條款與條件 - SmartPlay HK OSS",
		}),
		description: i18n.t("terms.seo.description", {
			ns: "terms",
			defaultValue: "SmartPlay HK OSS 服務的條款與條件。",
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
					name: i18n.t("terms.title", { ns: "terms", defaultValue: "條款" }),
					item: `${baseUrl}/terms`,
				},
			],
		},
	};
}

export const Route = createFileRoute("/terms")({
	component: TermsPage,
	head: () => {
		const {
			title,
			description,
			ogTitle,
			ogDescription,
			ogImage,
			twitterCard,
			canonical,
		} = getTermsPageMeta();

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
				{ name: "robots", content: "noindex, follow" }, // Usually terms/privacy don't need heavy indexing but follow links
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
					children: JSON.stringify(getTermsPageStructuredData()),
				},
			],
		};
	},
});

function TermsPage() {
	const { t } = useTranslation(["terms", "common"]);

	return (
		<div className="min-h-screen bg-background/50 text-foreground flex flex-col items-center py-10 px-4 md:px-8">
			<div className="max-w-4xl w-full space-y-12">
				{/* Header */}
				<section className="text-center space-y-6">
					<div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6 ring-1 ring-primary/20 shadow-lg shadow-primary/5">
						<FileText className="w-10 h-10 text-primary" />
					</div>
					<h1 className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70 pb-2">
						{t("terms.title")}
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
						{t("terms.subtitle")}
					</p>
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
						<span>{t("terms.lastUpdated")}</span>
						<time className="text-foreground">
							{new Date().toLocaleDateString()}
						</time>
					</div>
				</section>

				{/* Important Notice */}
				<Alert variant="warning" title={t("terms.importantNotice.title")}>
					<div className="space-y-2 text-sm leading-relaxed">
						<p>
							<strong className="text-foreground font-semibold">
								{t("terms.importantNotice.disclaimer")}
							</strong>
						</p>
						<p>
							{t("terms.importantNotice.verify")}{" "}
							<a
								href="https://www.smartplay.lcsd.gov.hk/home"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
							>
								SmartPlay website
							</a>
							.
						</p>
					</div>
				</Alert>

				{/* Quick Overview Cards */}
				<div className="grid md:grid-cols-3 gap-6">
					<Card className="hover:border-primary/20">
						<CardHeader>
							<div className="w-12 h-12 rounded-xl bg-pacific-blue-100/50 flex items-center justify-center mb-4 text-pacific-blue-600 ring-1 ring-pacific-blue-200">
								<Gavel className="w-6 h-6" />
							</div>
							<CardTitle className="text-lg font-bold">
								{t("terms.overviewCards.acceptance.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("terms.overviewCards.acceptance.description")}
							</p>
						</CardContent>
					</Card>

					<Card className="hover:border-primary/20">
						<CardHeader>
							<div className="w-12 h-12 rounded-xl bg-vanilla-custard-100/50 flex items-center justify-center mb-4 text-vanilla-custard-700 ring-1 ring-vanilla-custard-200">
								<AlertTriangle className="w-6 h-6" />
							</div>
							<CardTitle className="text-lg font-bold">
								{t("terms.overviewCards.noGuarantees.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("terms.overviewCards.noGuarantees.description")}
							</p>
						</CardContent>
					</Card>

					<Card className="hover:border-primary/20">
						<CardHeader>
							<div className="w-12 h-12 rounded-xl bg-meadow-green-100/50 flex items-center justify-center mb-4 text-meadow-green-600 ring-1 ring-meadow-green-200">
								<Users className="w-6 h-6" />
							</div>
							<CardTitle className="text-lg font-bold">
								{t("terms.overviewCards.responsibility.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("terms.overviewCards.responsibility.description")}
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Detailed Terms */}
				{/* Detailed Terms */}
				<Accordion className="space-y-4">
					{/* 1. Agreement to Terms */}
					<AccordionItem value="agreement">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.agreement.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-3">
								<p className="text-sm text-muted-foreground leading-relaxed">
									{t("terms.sections.agreement.items.binding")}
								</p>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{t("terms.sections.agreement.items.modification")}
								</p>
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.agreement.items.ageRequirement.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.agreement.items.ageRequirement.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 2. Service Description */}
					<AccordionItem value="service">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.service.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.service.items.whatWeProvide.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.service.items.whatWeProvide.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.service.items.whatWeDontProvide.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t(
											"terms.sections.service.items.whatWeDontProvide.content",
										)}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.service.items.availability.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.service.items.availability.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 3. Unofficial Status */}
					<AccordionItem value="unofficial">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.unofficial.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div className="bg-porcelain-50 border-l-4 border-vanilla-custard-500 p-4 rounded-r">
									<p className="text-sm font-medium text-pacific-blue-950">
										<strong>
											{t("terms.sections.unofficial.items.status")}
										</strong>
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.unofficial.items.dataSource.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.unofficial.items.dataSource.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.unofficial.items.accuracy.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.unofficial.items.accuracy.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.unofficial.items.noBooking.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.unofficial.items.noBooking.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 4. User Responsibilities */}
					<AccordionItem value="responsibilities">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.responsibilities.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t(
											"terms.sections.responsibilities.items.accurateInfo.title",
										)}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t(
											"terms.sections.responsibilities.items.accurateInfo.content",
										)}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t(
											"terms.sections.responsibilities.items.verification.title",
										)}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t(
											"terms.sections.responsibilities.items.verification.content",
										)}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t(
											"terms.sections.responsibilities.items.prohibited.title",
										)}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t(
											"terms.sections.responsibilities.items.prohibited.content",
										)}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t(
											"terms.sections.responsibilities.items.accountSecurity.title",
										)}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t(
											"terms.sections.responsibilities.items.accountSecurity.content",
										)}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 5. Intellectual Property */}
					<AccordionItem value="ip">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.ip.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.ip.items.ourContent.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.ip.items.ourContent.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.ip.items.mitLicense.title")}
									</h4>
									<div className="bg-porcelain-50 border-l-4 border-pacific-blue-500 p-4 rounded-r my-3">
										<p className="text-sm font-medium text-pacific-blue-950 mb-2">
											Copyright (c) {new Date().getFullYear()} SmartPlay HK OSS
											Contributors
										</p>
										<p className="text-sm text-muted-foreground leading-relaxed">
											{t("terms.sections.ip.items.mitLicense.content")}
										</p>
									</div>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.ip.items.mitLicense.availabilityPrefix")}
										<a
											href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
											target="_blank"
											rel="noopener noreferrer"
											className="text-pacific-blue-600 hover:text-pacific-blue-700 underline font-medium"
										>
											CC BY-NC-SA 4.0
										</a>
										{t("terms.sections.ip.items.mitLicense.availabilitySuffix")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.ip.items.lcsdContent.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.ip.items.lcsdContent.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.ip.items.yourContent.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.ip.items.yourContent.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 6. Limitation of Liability */}
					<AccordionItem value="liability">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.liability.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div className="bg-tangerine-dream-50 border-l-4 border-tangerine-dream-500 p-4 rounded-r">
									<p className="text-sm font-medium text-pacific-blue-950">
										<strong>
											{t("terms.sections.liability.items.introduction")}
										</strong>
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.liability.items.noWarranties.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.liability.items.noWarranties.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.liability.items.exclusions.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.liability.items.exclusions.content")}
									</p>
								</div>

								<div className="bg-tangerine-dream-50 border-l-4 border-tangerine-dream-500 p-4 rounded-r">
									<h4 className="font-semibold text-pacific-blue-950 mb-2">
										{t("terms.sections.liability.items.serverWarning.heading")}
									</h4>
									<p className="text-xs text-pacific-blue-900 leading-relaxed">
										{t("terms.sections.liability.items.serverWarning.text")}
									</p>
									<p className="text-xs text-pacific-blue-900 mt-2">
										{t("terms.sections.liability.items.serverWarning.risk")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.liability.items.dataAccuracy.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.liability.items.dataAccuracy.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 7. Indemnification */}
					<AccordionItem value="indemnification">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.indemnification.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-3">
								<p className="text-sm text-muted-foreground leading-relaxed">
									{t("terms.sections.indemnification.intro")}
								</p>
								<ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
									<li>{t("terms.sections.indemnification.list.item1")}</li>
									<li>{t("terms.sections.indemnification.list.item2")}</li>
									<li>{t("terms.sections.indemnification.list.item3")}</li>
									<li>{t("terms.sections.indemnification.list.item4")}</li>
								</ul>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 8. Privacy & Data */}
					<AccordionItem value="privacy">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.privacy.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<p className="text-sm text-muted-foreground leading-relaxed">
									{t("terms.sections.privacy.items.link")}
								</p>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.privacy.items.keyPointsTitle")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.privacy.items.keyPoints")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 9. Termination */}
					<AccordionItem value="termination">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.termination.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.termination.items.ourRight.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.termination.items.ourRight.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.termination.items.yourRight.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.termination.items.yourRight.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.termination.items.deletion.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.termination.items.deletion.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 10. Modifications */}
					<AccordionItem value="changes">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.changes.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.changes.policy.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.changes.policy.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.changes.notification.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.changes.notification.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 11. Governing Law */}
					<AccordionItem value="law">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.law.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.law.items.governingLaw.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.law.items.governingLaw.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.law.items.disputeResolution.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.law.items.disputeResolution.content")}
									</p>
								</div>

								<div>
									<h4 className="font-semibold text-foreground mb-2">
										{t("terms.sections.law.items.severability.title")}
									</h4>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{t("terms.sections.law.items.severability.content")}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* 12. Contact */}
					<AccordionItem value="contact">
						<AccordionTrigger className="text-lg font-semibold">
							{t("terms.sections.contact.title")}
						</AccordionTrigger>
						<AccordionContent className="space-y-4 pt-4">
							<p className="text-sm text-muted-foreground leading-relaxed">
								{t("terms.sections.contact.content")}
							</p>

							<div className="bg-porcelain-50 p-4 rounded-lg space-y-2">
								<div>
									<p className="text-sm text-foreground font-medium mb-1">
										{t("terms.sections.contact.repoTitle")}
									</p>
									<a
										href="https://github.com/lst97/smartplay-hk-oss"
										target="_blank"
										rel="noopener noreferrer"
										className="text-pacific-blue-600 hover:text-pacific-blue-700 underline text-sm"
									>
										github.com/lst97/smartplay-hk-oss
									</a>
								</div>

								<div>
									<p className="text-sm text-foreground font-medium mb-1">
										{t("terms.sections.contact.issuesTitle")}
									</p>
									<a
										href="https://github.com/lst97/smartplay-hk-oss/issues"
										target="_blank"
										rel="noopener noreferrer"
										className="text-pacific-blue-600 hover:text-pacific-blue-700 underline text-sm"
									>
										{t("terms.sections.contact.issuesTitle")}
									</a>
								</div>

								<div>
									<p className="text-sm text-foreground font-medium mb-1">
										{t("terms.sections.contact.discussionsTitle")}
									</p>
									<a
										href="https://github.com/lst97/smartplay-hk-oss/discussions"
										target="_blank"
										rel="noopener noreferrer"
										className="text-pacific-blue-600 hover:text-pacific-blue-700 underline text-sm"
									>
										{t("terms.sections.contact.discussionsTitle")}
									</a>
								</div>

								<p className="text-xs text-muted-foreground mt-4 pt-2 border-t border-porcelain-200">
									{t("terms.sections.contact.note")}
								</p>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>

				{/* Acknowledgment */}
				<Card className="bg-pacific-blue-50 border-pacific-blue-100 shadow-sm mt-8">
					<CardHeader>
						<CardTitle className="text-xl">
							{t("terms.acknowledgment.title")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-pacific-blue-900 leading-relaxed">
							{t("terms.acknowledgment.content")}
						</p>
					</CardContent>
				</Card>

				{/* Quick Links */}
				<Card className="">
					<CardHeader>
						<CardTitle className="text-xl">
							{t("terms.relatedPages.title")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid sm:grid-cols-2 gap-3">
							<a
								href="/privacy"
								className="flex items-center gap-2 text-sm text-pacific-blue-600 hover:text-pacific-blue-700 transition-colors p-2 rounded hover:bg-pacific-blue-50"
							>
								<Shield className="w-4 h-4" />
								{t("terms.relatedPages.privacy")}
							</a>
							<a
								href="/about"
								className="flex items-center gap-2 text-sm text-pacific-blue-600 hover:text-pacific-blue-700 transition-colors p-2 rounded hover:bg-pacific-blue-50"
							>
								<FileText className="w-4 h-4" />
								{t("terms.relatedPages.about")}
							</a>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
