import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface BookingHeaderProps {
	availableDatesCount: number;
}

export function BookingHeader(_props: BookingHeaderProps) {
	const { t } = useTranslation(["booking", "common"]);

	return (
		<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-4">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
					{t("booking:page_title", "康文署體育設施預訂查詢")}
					<Badge variant="primary" size="sm">
						Beta
					</Badge>
				</h1>
				<p className="text-muted-foreground mt-1 text-base md:text-lg">
					{t(
						"booking:page_description",
						"實時橫跨全港各地區查詢網球場、籃球場、羽毛球場及壁球場等康文署設施的最新可用時段。",
					)}
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
