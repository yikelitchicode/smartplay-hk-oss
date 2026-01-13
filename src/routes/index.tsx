import { createFileRoute } from "@tanstack/react-router";

import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/")({ component: App });

function App() {
	const { t } = useTranslation(["home", "common"]);

	return (
		<div className="min-h-screen bg-linear-to-b from-porcelain-50 via-icy-blue-50 to-pacific-blue-50">
			<section className="relative py-20 px-6 text-center overflow-hidden">
				<div className="absolute inset-0 bg-linear-to-r from-pacific-blue-500/10 via-icy-blue-500/10 to-vanilla-custard-500/10"></div>
				<div className="relative max-w-5xl mx-auto">
					<h1 className="text-6xl md:text-7xl font-black text-porcelain-900 mb-6 tracking-[-0.08em]">
						<span className="bg-linear-to-r from-pacific-blue-600 to-icy-blue-500 bg-clip-text text-transparent">
							{t("common:welcome")}
						</span>
					</h1>
					<p className="text-2xl md:text-3xl text-porcelain-700 mb-4 font-light">
						{t("home:title")}
					</p>
					<p className="text-lg text-porcelain-600 max-w-3xl mx-auto mb-8">
						{t("home:description")}
					</p>
				</div>
			</section>
		</div>
	);
}
