import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export default function NotFound() {
	const { t } = useTranslation();

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="text-center">
				<h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
				<h2 className="mb-4 text-2xl font-semibold text-foreground">
					{t("notFound.title", "Page Not Found")}
				</h2>
				<p className="mb-8 text-muted-foreground">
					{t(
						"notFound.description",
						"Sorry, we couldn't find the page you're looking for."
					)}
				</p>
				<Link
					to="/"
					className="inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
				>
					{t("notFound.backToHome", "Back to Home")}
				</Link>
			</div>
		</div>
	);
}
