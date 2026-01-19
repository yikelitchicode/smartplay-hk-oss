import { Info } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { useCookieConsent } from "./hooks";
import type { AcceptedCategories, CookieNoticeProps } from "./types";

export const CookieNotice: React.FC<CookieNoticeProps> = ({
	position = "bottom",
	persistent = true,
	title,
	description,
	privacyPolicyUrl = "/privacy",
	learnMoreLabel,
	categories,
	className = "",
	showOnMount = false,
	onAccept,
	onDecline,
	onPartialAccept,
}) => {
	const { t } = useTranslation(["cookie", "common"]);
	const { hasConsented, updateConsent, isLoading } = useCookieConsent();

	// Use translations if not explicitly provided
	const displayTitle = title ?? t("cookie.title");
	const displayDescription = description ?? t("cookie.description");
	const displayLearnMore = learnMoreLabel ?? t("cookie.learnMore");
	const displayCategories = categories ?? [
		{
			id: "necessary",
			name: t("cookie.categories.necessary.name"),
			description: t("cookie.categories.necessary.description"),
			required: true,
			defaultValue: true,
		},
		{
			id: "analytics",
			name: t("cookie.categories.analytics.name"),
			description: t("cookie.categories.analytics.description"),
			required: false,
			defaultValue: false,
		},
		{
			id: "preferences",
			name: t("cookie.categories.preferences.name"),
			description: t("cookie.categories.preferences.description"),
			required: false,
			defaultValue: false,
		},
		{
			id: "marketing",
			name: t("cookie.categories.marketing.name"),
			description: t("cookie.categories.marketing.description"),
			required: false,
			defaultValue: false,
		},
	];
	const [showSettings, setShowSettings] = React.useState(false);
	const [selectedCategories, setSelectedCategories] =
		React.useState<AcceptedCategories>(() => {
			const initial: AcceptedCategories = {
				necessary: true,
				analytics: false,
				marketing: false,
				preferences: false,
			};
			displayCategories.forEach((cat) => {
				initial[cat.id as keyof AcceptedCategories] = cat.defaultValue ?? false;
			});
			return initial;
		});
	const [isVisible, setIsVisible] = React.useState(false);

	// Check if we should show the banner
	React.useEffect(() => {
		if (isLoading) return;

		if (showOnMount) {
			setIsVisible(true);
		} else if (!hasConsented && persistent) {
			setIsVisible(true);
		} else if (hasConsented) {
			setIsVisible(false);
		}
	}, [hasConsented, persistent, showOnMount, isLoading]);

	const handleAcceptAll = () => {
		const allAccepted: AcceptedCategories = {
			necessary: true,
			analytics: true,
			marketing: true,
			preferences: true,
		};
		updateConsent(allAccepted);
		setIsVisible(false);
		onAccept?.(allAccepted);
	};

	const handleDecline = () => {
		const declined: AcceptedCategories = {
			necessary: true,
			analytics: false,
			marketing: false,
			preferences: false,
		};
		updateConsent(declined);
		setIsVisible(false);
		onDecline?.();
	};

	const handleAcceptSelected = () => {
		updateConsent(selectedCategories);
		setIsVisible(false);
		setShowSettings(false);
		onPartialAccept?.(selectedCategories);
	};

	const handleCategoryChange = (categoryId: string, checked: boolean) => {
		setSelectedCategories((prev) => ({
			...prev,
			[categoryId]: checked,
		}));
	};

	if (!isVisible) {
		return null;
	}

	const positionStyles = {
		bottom: "bottom-0 left-0 right-0",
		"bottom-left": "bottom-4 left-4 max-w-md",
		"bottom-right": "bottom-4 right-4 max-w-md",
		top: "top-0 left-0 right-0",
	};

	const privacyLink = privacyPolicyUrl ? (
		<a
			href={privacyPolicyUrl}
			className="text-pacific-blue-600 hover:text-pacific-blue-700 underline font-medium transition-colors"
		>
			{displayLearnMore}
		</a>
	) : null;

	return (
		<div
			className={`fixed ${positionStyles[position]} z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl transition-all duration-500 ease-in-out ${className} ${
				isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
			}`}
			role="dialog"
			aria-labelledby="cookie-notice-title"
			aria-describedby="cookie-notice-description"
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex flex-col gap-6">
					{/* Header */}
					<div className="flex items-start gap-4">
						<div className="p-2 bg-primary/10 rounded-full shrink-0">
							<Info className="h-5 w-5 text-primary" />
						</div>
						<div className="flex-1 space-y-1">
							<h2
								id="cookie-notice-title"
								className="text-lg font-bold tracking-tight mb-2"
							>
								{displayTitle}
							</h2>
							<p
								id="cookie-notice-description"
								className="text-sm text-muted-foreground leading-relaxed max-w-3xl"
							>
								{displayDescription}
								{privacyLink && <> {privacyLink}.</>}
							</p>
						</div>
					</div>

					{/* Settings Panel */}
					{showSettings && (
						<div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 border-t border-border/50 pt-6">
							<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
								{t("cookie.customizePreferences")}
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{displayCategories.map((category) => (
									<div
										key={category.id}
										className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border/50 transition-colors hover:bg-muted"
									>
										<div className="flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<label
													htmlFor={`cookie-${category.id}`}
													className={`font-medium ${
														category.required
															? "text-foreground"
															: "text-foreground"
													} cursor-pointer select-none`}
												>
													{category.name}
												</label>
												{category.required && (
													<span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
														{t("cookie.required")}
													</span>
												)}
											</div>
											<p className="text-xs text-muted-foreground leading-snug">
												{category.description}
											</p>
										</div>
										<Switch
											id={`cookie-${category.id}`}
											checked={selectedCategories[category.id]}
											onCheckedChange={(checked) =>
												handleCategoryChange(category.id, checked)
											}
											disabled={category.required}
										/>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
						{!showSettings ? (
							<>
								<Button
									variant="ghost"
									onClick={() => setShowSettings(true)}
									className="text-muted-foreground hover:text-foreground"
								>
									{t("cookie.customize")}
								</Button>
								<Button variant="secondary" onClick={handleDecline}>
									{t("cookie.decline")}
								</Button>
								<Button onClick={handleAcceptAll}>
									{t("cookie.acceptAll")}
								</Button>
							</>
						) : (
							<>
								<Button
									variant="ghost"
									onClick={() => setShowSettings(false)}
									className="text-muted-foreground hover:text-foreground"
								>
									{t("cookie.cancel")}
								</Button>
								<Button variant="secondary" onClick={handleDecline}>
									{t("cookie.declineAll")}
								</Button>
								<Button variant="secondary" onClick={handleAcceptSelected}>
									{t("cookie.acceptSelected")}
								</Button>
								<Button onClick={handleAcceptAll} className="ml-2">
									{t("cookie.acceptAll")}
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

CookieNotice.displayName = "CookieNotice";
