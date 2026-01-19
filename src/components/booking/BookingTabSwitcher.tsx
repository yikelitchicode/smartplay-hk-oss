import { useTranslation } from "react-i18next";

interface BookingTabSwitcherProps {
	activeTab: "live" | "future";
	onTabChange: (tab: "live" | "future") => void;
}

export function BookingTabSwitcher({
	activeTab,
	onTabChange,
}: BookingTabSwitcherProps) {
	const { t } = useTranslation(["booking"]);

	return (
		<div className="flex justify-center mb-6">
			<div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1 shadow-inner ring-1 ring-slate-200">
				<button
					type="button"
					onClick={() => onTabChange("live")}
					className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
						activeTab === "live"
							? "bg-white text-pacific-blue-600 shadow-sm ring-1 ring-black/5"
							: "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
					}`}
				>
					{t("booking:live_sessions", "Live Sessions")}
				</button>
				{/* Hidden for Alpha 
        <button
          onClick={() => onTabChange("future")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === "future"
              ? "bg-white text-purple-600 shadow-sm ring-1 ring-black/5"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          {t("booking:future_sessions", "Future Planning (4 Weeks)")}
        </button>
        */}
			</div>
		</div>
	);
}
