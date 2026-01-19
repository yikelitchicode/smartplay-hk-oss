import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function SchedulerHeader() {
	const { t } = useTranslation(["scheduler", "common"]);

	return (
		<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-4">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
					{t("scheduler:title", "Watch Scheduler")}
					<Badge variant="primary" size="sm">
						Beta
					</Badge>
				</h1>
				<p className="text-muted-foreground mt-1 text-base md:text-lg">
					{t("scheduler:subtitle", "Manage your availability watchers")}
				</p>
			</div>
			<Link to="/">
				<Button variant="ghost" size="sm" className="gap-2 shrink-0">
					<ArrowLeft size={16} /> {t("common:nav.home", "主頁")}
				</Button>
			</Link>
		</div>
	);
}
