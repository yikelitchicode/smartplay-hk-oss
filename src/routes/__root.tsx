import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import Footer from "../components/Footer";
import Header from "../components/Header";
import NotFound from "../components/NotFound";
import { BackToTop } from "../components/ui/BackToTop";
import i18n, { ensureI18nInitialized } from "../lib/i18n";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	beforeLoad: async () => {
		await ensureI18nInitialized();
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
				title: "SmartPlay HK OSS - LCSD Sports Facilities Availability Checker",
			},
			{
				name: "description",
				content:
					"Open-source availability checker for Hong Kong LCSD sports facilities. Check real-time availability for tennis, basketball, badminton courts across all districts. Booking must be completed on the official LCSD SmartPlay website.",
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
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "icon",
				type: "image/x-icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				href: "/logo192.png",
			},
		],
	}),

	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const i18nInstance = i18n;

	// Create QueryClient with optimized caching defaults
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
						gcTime: 30 * 60 * 1000, // Cache retained for 30 minutes
						refetchOnWindowFocus: false, // Don't refetch on tab focus
						retry: 1, // Only retry once on failure
					},
				},
			}),
	);

	return (
		<I18nextProvider i18n={i18n}>
			<QueryClientProvider client={queryClient}>
				<html lang={i18nInstance.language}>
					<head>
						<HeadContent />
					</head>
					<body className="flex flex-col min-h-screen">
						<Header />
						<div className="flex-1">{children}</div>
						<Footer />
						<BackToTop />
						<TanStackDevtools
							config={{
								position: "bottom-right",
							}}
							plugins={[
								{
									name: "Tanstack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
							]}
						/>
						<Scripts />
					</body>
				</html>
			</QueryClientProvider>
		</I18nextProvider>
	);
}
