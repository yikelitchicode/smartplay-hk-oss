import { Github, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
	const { t } = useTranslation("common");

	return (
		<footer className="border-t border-border bg-card py-8 mt-auto">
			<div className="container mx-auto px-4">
				<div className="flex flex-col md:flex-row justify-between items-center gap-6">
					<div className="flex flex-col gap-2 text-center md:text-left">
						<p className="text-sm text-muted-foreground font-medium">
							{t("footer.disclaimer")}
						</p>
						<a
							href="https://www.smartplay.lcsd.gov.hk/home"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-primary hover:underline transition-colors block"
						>
							{t("footer.visit_official")}
						</a>
					</div>

					<div className="flex flex-col md:flex-row items-center gap-6">
						<a
							href="tel:39545150"
							className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
						>
							<div className="p-2 rounded-full bg-muted group-hover:bg-accent transition-colors">
								<Phone size={16} className="text-primary" />
							</div>
							<div className="flex flex-col">
								<span className="text-xs text-muted-foreground">
									{t("footer.inquiry_hotline")}
								</span>
								<span className="font-medium">3954 5150</span>
							</div>
						</a>

						<a
							href="https://github.com/lst97/smartplay-hk-oss"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
						>
							<div className="p-2 rounded-full bg-muted group-hover:bg-accent transition-colors">
								<Github size={16} className="text-primary" />
							</div>
							<span>{t("footer.open_source")}</span>
						</a>
					</div>
				</div>

				<div className="mt-8 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
					<p>{t("footer.copyright")}</p>
				</div>
			</div>
		</footer>
	);
}
