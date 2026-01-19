import { ApiReferenceReact } from "@scalar/api-reference-react";
import { createFileRoute } from "@tanstack/react-router";
import "@scalar/api-reference-react/style.css";
import { useEffect } from "react";
import i18n from "@/lib/i18n";
import { Skeleton } from "../../components/ui/Skeleton";
import spec from "../../docs/openapi.yaml?raw";

/**
 * Generate dynamic meta tags for the webhooks page
 */
function getWebhooksPageMeta() {
	const baseUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: "https://smartplay.hk";
	const canonical = `${baseUrl}/docs/webhooks`;

	const title = i18n.t("common.seo.webhooks.title", {
		ns: "common",
		defaultValue: "Webhook 文檔 | SmartPlay HK OSS 開發者",
	});
	const description = i18n.t("common.seo.webhooks.description", {
		ns: "common",
		defaultValue:
			"了解如何使用 Webhook 將 SmartPlay HK OSS 通知整合到您自己的應用程式中。詳細的 API 參考與數據格式文件。",
	});
	const ogTitle = i18n.t("common.seo.webhooks.ogTitle", {
		ns: "common",
		defaultValue: "開發者文檔 - SmartPlay HK OSS Webhooks",
	});
	const ogDescription = i18n.t("common.seo.webhooks.ogDescription", {
		ns: "common",
		defaultValue:
			"使用 SmartPlay HK OSS Webhook API 構建您自己的體育設施通知系統。",
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

export const Route = createFileRoute("/docs/webhooks")({
	ssr: false,
	component: WebhooksDocs,
	pendingComponent: WebhooksDocsSkeleton,
	head: () => {
		const {
			title,
			description,
			ogTitle,
			ogDescription,
			ogImage,
			twitterCard,
			canonical,
		} = getWebhooksPageMeta();

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
		};
	},
});

function WebhooksDocsSkeleton() {
	return (
		<div className="flex h-[calc(100vh-var(--header-height,70px))] w-full overflow-hidden bg-white">
			{/* Sidebar Skeleton */}
			<div className="hidden w-[280px] shrink-0 flex-col border-r border-gray-100 bg-gray-50/50 p-4 md:flex">
				<div className="mb-6">
					<Skeleton className="h-9 w-full rounded-md" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-4 w-24 rounded-full" />
					<div className="space-y-3 pl-3">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-4 w-36" />
					</div>
					<Skeleton className="mt-8 h-4 w-28 rounded-full" />
					<div className="space-y-3 pl-3">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-4 w-40" />
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex flex-1 overflow-hidden">
				{/* Middle Column - Documentation */}
				<div className="flex-1 overflow-y-auto p-8 lg:p-12">
					<div className="mx-auto max-w-3xl space-y-12">
						{/* Intro Section */}
						<div className="space-y-6">
							{/* Badges */}
							<div className="flex items-center gap-3">
								<Skeleton className="h-5 w-16 rounded-full" />
								<Skeleton className="h-5 w-16 rounded-full" />
							</div>
							{/* Title */}
							<Skeleton className="h-10 w-3/4" />

							{/* Download Link */}
							<Skeleton className="h-5 w-48" />

							{/* Description */}
							<div className="space-y-3 pt-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-[90%]" />
							</div>
						</div>

						{/* Trigger Test Webhook Section */}
						<div className="space-y-4">
							<Skeleton className="h-8 w-56" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
							</div>
						</div>

						{/* Supported Payloads Section */}
						<div className="space-y-4">
							<Skeleton className="h-8 w-64" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-[85%]" />
							</div>
							{/* Bullet points */}
							<div className="pl-4 space-y-3 pt-2">
								<div className="flex items-center gap-2">
									<div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
									<Skeleton className="h-4 w-48" />
								</div>
								<div className="flex items-center gap-2">
									<div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
									<Skeleton className="h-4 w-56" />
								</div>
								<div className="flex items-center gap-2">
									<div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
									<Skeleton className="h-4 w-52" />
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Right Column - Playground/Console */}
				<div className="hidden w-[400px] shrink-0 flex-col border-l border-gray-100 bg-white p-6 xl:flex">
					{/* Server Configuration */}
					<div className="mb-8 space-y-3">
						<Skeleton className="h-4 w-16" /> {/* Label: Server */}
						<Skeleton className="h-10 w-full rounded-md border border-gray-100" />{" "}
						{/* Input */}
					</div>

					{/* Client Libraries */}
					<div className="space-y-4">
						<Skeleton className="h-4 w-24" /> {/* Label: Client Libraries */}
						{/* Tabs */}
						<div className="flex gap-2 border-b border-gray-100 pb-2">
							<Skeleton className="h-8 w-20 rounded-md" />
							<Skeleton className="h-8 w-16 rounded-md" />
							<Skeleton className="h-8 w-16 rounded-md" />
							<Skeleton className="h-8 w-16 rounded-md" />
						</div>
						{/* Code Block */}
						<div className="space-y-2 pt-2">
							<Skeleton className="h-40 w-full rounded-md bg-gray-50" />
						</div>
						{/* Response Area Placeholder */}
						<div className="pt-4 space-y-2">
							<div className="flex justify-between">
								<Skeleton className="h-4 w-12" />
								<Skeleton className="h-4 w-12" />
							</div>
							<Skeleton className="h-24 w-full rounded-md bg-gray-50" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function WebhooksDocs() {
	// Intercept history.replaceState to prevent Scalar from updating URL hash
	// This fixes the scroll conflict with TanStack Router
	useEffect(() => {
		const originalReplaceState = window.history.replaceState.bind(
			window.history,
		);

		window.history.replaceState = (
			data: unknown,
			unused: string,
			url?: string | URL | null,
		) => {
			// If Scalar is trying to add a hash, ignore it
			if (typeof url === "string" && url.includes("#")) {
				return;
			}
			originalReplaceState(data, unused, url);
		};

		// Lock body scroll for full-screen docs layout
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			window.history.replaceState = originalReplaceState;
			document.body.style.overflow = originalOverflow;
		};
	}, []);

	return (
		<>
			{/* Custom theme overrides to match application design system */}
			<style>
				{`
          .light-mode,
          .scalar-app {
            --scalar-color-1: #031e21;
            --scalar-color-2: rgba(3, 30, 33, 0.7);
            --scalar-color-3: rgba(3, 30, 33, 0.5);
            --scalar-color-accent: #10adbc;
            --scalar-background-1: #ffffff;
            --scalar-background-2: #f6f4ee;
            --scalar-background-3: #eee8dd;
            --scalar-background-accent: rgba(16, 173, 188, 0.08);
            --scalar-border-color: rgba(136, 113, 68, 0.15);
            
            /* Ensure Scalar header sits below our main header */
            --scalar-header-z-index: 30;
          }
          /* Fix mobile layout: disable sticky, correct z-index */
          .scalar-api-reference-mobile-header,
          .t-doc__header {
            z-index: 30 !important;
            position: relative !important;
            top: 0 !important;
          }
        `}
			</style>
			{/* 
				Subtract header height (var(--header-height)) to ensure Scalar fits in viewport.
				Use min-h-0 to allow flex child to shrink if needed.
                Add padding-top to ensure content clears the site header if layout overlaps.
			*/}
			<div
				className="overflow-y-auto overscroll-contain pt-(--header-height)"
				style={{ height: "100vh" }}
			>
				<ApiReferenceReact
					configuration={{
						content: spec,
						theme: "alternate",
						layout: "modern",
						hideDarkModeToggle: true,
						hideClientButton: false,
						showSidebar: true,
						operationTitleSource: "summary",
						hideModels: true,
						hideTestRequestButton: false,
						hideSearch: false,
						withDefaultFonts: true,
						defaultOpenAllTags: false,
						darkMode: false,
					}}
				/>
			</div>
		</>
	);
}
