import { Link } from "@tanstack/react-router";
import { FileText, Github, Phone, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
	const { t } = useTranslation("common");

	return (
		<footer className="w-full py-12 border-t border-border/40 bg-footer/95 backdrop-blur supports-backdrop-filter:bg-footer/60">
			<div className="container px-4 md:px-6 mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
					<div className="col-span-1 md:col-span-2 space-y-4">
						<div className="flex items-center gap-2">
							<span className="font-bold text-xl tracking-tight">
								SmartPlay HK OSS
							</span>
						</div>
						<p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
							{t("footer.disclaimer")}
						</p>
						<a
							href="https://www.smartplay.lcsd.gov.hk/home"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block"
						>
							{t("footer.visit_official")} &rarr;
						</a>
					</div>

					<div className="space-y-4">
						<h4 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">
							{t("footer.resources")}
						</h4>
						<ul className="space-y-3">
							<li>
								<a
									href="https://github.com/lst97/smartplay-hk-oss"
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
								>
									<Github
										size={16}
										className="group-hover:text-primary transition-colors"
									/>
									{t("footer.open_source")}
								</a>
							</li>
							<li>
								<a
									href="tel:39545150"
									className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
								>
									<Phone
										size={16}
										className="group-hover:text-primary transition-colors"
									/>
									<span className="flex flex-col">
										<span>{t("footer.inquiry_hotline")}</span>
										<span className="text-xs text-muted-foreground/70">
											3954 5150
										</span>
									</span>
								</a>
							</li>
						</ul>
					</div>

					<div className="space-y-4">
						<h4 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">
							{t("footer.legal")}
						</h4>
						<ul className="space-y-3">
							<li>
								<Link
									to="/privacy"
									className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
								>
									<Shield
										size={16}
										className="group-hover:text-primary transition-colors"
									/>
									{t("footer.privacy_policy")}
								</Link>
							</li>
							<li>
								<Link
									to="/terms"
									className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
								>
									<FileText
										size={16}
										className="group-hover:text-primary transition-colors"
									/>
									{t("footer.terms_conditions")}
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
					<p className="text-xs text-muted-foreground">
						{t("footer.copyright")}
					</p>
					<div className="flex gap-4">
						{/* Social icons or extras could go here */}
					</div>
				</div>
			</div>
		</footer>
	);
}
