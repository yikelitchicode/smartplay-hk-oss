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

export const Route = createFileRoute("/about")({
	component: AboutPage,
});

function AboutPage() {
	const { t } = useTranslation(["common"]);

	const qaItems = t("about.qa.items", { returnObjects: true }) as Array<{
		q: string;
		a: string;
	}>;

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col items-center py-10 px-4 md:px-8">
			<div className="max-w-4xl w-full space-y-12">
				{/* Hero Section */}
				<section className="text-center space-y-6">
					<div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
						<Info className="w-10 h-10 text-primary" />
					</div>
					<h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
						{t("about.title")}
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
						{t("about.subtitle")}
					</p>
				</section>

				{/* Mission & How it Works Grid */}
				<div className="grid md:grid-cols-2 gap-8">
					<Card className="border-border/50 hover:border-primary/50 transition-colors shadow-sm bg-card/50 backdrop-blur-sm">
						<CardHeader>
							<div className="w-12 h-12 rounded-lg bg-pacific-blue-100 flex items-center justify-center mb-4 text-pacific-blue-600">
								<Users className="w-6 h-6" />
							</div>
							<CardTitle className="text-2xl">
								{t("about.mission.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground leading-relaxed">
								{t("about.mission.description")}
							</p>
						</CardContent>
					</Card>

					<Card className="border-border/50 hover:border-primary/50 transition-colors shadow-sm bg-card/50 backdrop-blur-sm">
						<CardHeader>
							<div className="w-12 h-12 rounded-lg bg-meadow-green-100 flex items-center justify-center mb-4 text-meadow-green-600">
								<Zap className="w-6 h-6" />
							</div>
							<CardTitle className="text-2xl">
								{t("about.mechanism.title")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground leading-relaxed">
								{t("about.mechanism.description")}
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Q&A Section */}
				<section>
					<div className="flex items-center gap-3 mb-8">
						<div className="p-2 bg-vanilla-custard-100 rounded-lg text-vanilla-custard-700">
							<Shield className="w-6 h-6" />
						</div>
						<h2 className="text-3xl font-bold tracking-tight">
							{t("about.qa.title")}
						</h2>
					</div>

					<Accordion className="space-y-4">
						{qaItems.map((item, index) => (
							<AccordionItem key={item.q} value={`item-${index}`}>
								<AccordionTrigger>{item.q}</AccordionTrigger>
								<AccordionContent>{item.a}</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</section>
			</div>
		</div>
	);
}
