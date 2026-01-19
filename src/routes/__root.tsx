import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import {
	CookieConsentProvider,
	CookieNotice,
} from "../components/cookie-notice";
import Footer from "../components/Footer";
import Header from "../components/Header";
import NotFound from "../components/NotFound";
import { BackToTop } from "../components/ui/BackToTop";
import i18n, { detectLanguage, initializeI18n } from "../lib/i18n";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	beforeLoad: async () => {
		if (typeof window === "undefined") {
			// Server: detect language FIRST, then initialize i18n with it
			try {
				let getRequest: (() => Request) | undefined;
				const serverModule = await import("@tanstack/react-start/server");
				if (typeof serverModule.getRequest === "function") {
					getRequest = serverModule.getRequest;
				}

				if (!getRequest) {
					throw new Error("getRequest is missing from server module");
				}

				const request = getRequest();
				const cookieHeader = request?.headers.get("cookie");
				let lang: string | undefined;

				// 1. Try to get language from cookie "i18next"
				if (cookieHeader) {
					const match = cookieHeader.match(/i18next=([^;]+)/);
					if (match) {
						const cookieLang = match[1];
						// Validate cookie lang
						if (["en", "zh", "cn"].includes(cookieLang)) {
							lang = cookieLang;
						}
					}
				}

				// 2. Fallback to Accept-Language header
				if (!lang) {
					const acceptLanguage =
						request?.headers.get("accept-language") ?? null;
					lang = detectLanguage(acceptLanguage);
				}
				await initializeI18n(lang);

				// Ensure scheduler is initialized on server start
				const { ensureSchedulerInitialized } = await import(
					"@/lib/server-init"
				);
				await ensureSchedulerInitialized().catch((err) => {
					console.error("Failed to initialize scheduler:", err);
				});

				return { lang };
			} catch (err) {
				console.error("Failed to initialize i18n on server:", err);
				await initializeI18n("zh"); // Fallback to Traditional Chinese

				// Ensure scheduler is initialized even if i18n fails
				const { ensureSchedulerInitialized } = await import(
					"@/lib/server-init"
				);
				await ensureSchedulerInitialized().catch((err) => {
					console.error("Failed to initialize scheduler:", err);
				});

				return { lang: "zh" };
			}
		} else {
			// Client: ensure i18n is initialized (will use browser detection)
			await initializeI18n();
		}
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "SmartPlay HK (OSS)",
			},
			{
				name: "description",
				content: "Open Source SmartPlay HK Venue Booking Assistant",
			},
			{
				name: "keywords",
				content:
					"SmartPlay HK OSS, Hong Kong LCSD, sports facility availability, tennis court availability Hong Kong, basketball court Hong Kong, badminton booking, LCSD facilities checker, open source sports, Leisure and Cultural Services Department",
			},
			{
				property: "og:site_name",
				content: "SmartPlay HK OSS",
			},
			{
				name: "theme-color",
				content: "#0ea5e9",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{
				rel: "manifest",
				href: "/favicon/site.webmanifest",
			},
			{
				rel: "icon",
				type: "image/x-icon",
				href: "/favicon/favicon.ico",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "32x32",
				href: "/favicon/favicon-32x32.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "16x16",
				href: "/favicon/favicon-16x16.png",
			},
			{
				rel: "apple-touch-icon",
				href: "/favicon/apple-touch-icon.png",
			},
		],
	}),

	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	const context = Route.useRouteContext();
	const detectedLang = (context as { lang?: string })?.lang || "en";

	// Create QueryClient with optimized caching defaults
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000,
						gcTime: 30 * 60 * 1000,
						refetchOnWindowFocus: false,
						retry: 1,
					},
				},
			}),
	);

	return (
		<I18nextProvider i18n={i18n}>
			<QueryClientProvider client={queryClient}>
				<CookieConsentProvider
					expiryDays={365}
					onAccept={(categories: {
						necessary: boolean;
						analytics: boolean;
						marketing: boolean;
						preferences: boolean;
					}) => {
						// Initialize services based on consent
						if (categories.analytics) {
							// Initialize your analytics here
							console.log("Analytics consent granted");
						}
						if (categories.marketing) {
							// Initialize marketing pixels here
							console.log("Marketing consent granted");
						}
					}}
				>
					<RootDocument detectedLang={detectedLang}>
						<Outlet />
					</RootDocument>
				</CookieConsentProvider>
			</QueryClientProvider>
		</I18nextProvider>
	);
}

function RootDocument({
	children,
	detectedLang,
}: {
	children: React.ReactNode;
	detectedLang: string;
}) {
	const location = useLocation();
	const isDocsPage = location.pathname.startsWith("/docs");

	return (
		<html lang={detectedLang} suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="flex flex-col min-h-screen">
				<Header />
				<div className="flex-1">{children}</div>
				{!isDocsPage && <Footer />}
				{!isDocsPage && <BackToTop />}
				{/* Cookie Notice Banner */}
				{!isDocsPage && (
					<CookieNotice
						privacyPolicyUrl="/privacy"
						onAccept={(categories: {
							necessary: boolean;
							analytics: boolean;
							marketing: boolean;
							preferences: boolean;
						}) => console.log("User accepted cookies:", categories)}
						onDecline={() => console.log("User declined cookies")}
					/>
				)}
				{/* Inject detected language for client-side init */}
				<script
					dangerouslySetInnerHTML={{
						__html: `window.__INITIAL_LANG__ = "${detectedLang}";`,
					}}
				/>
				{!isDocsPage && <TanStackRouterDevtoolsPanel />}
				{!isDocsPage && <TanStackDevtools />}
				<Scripts />
			</body>
		</html>
	);
}
