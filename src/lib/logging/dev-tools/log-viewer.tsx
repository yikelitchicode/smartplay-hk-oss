/**
 * Log Viewer Component
 *
 * Development-only component for viewing client-side logs
 * Should only be rendered in development mode
 */

import { useMemo, useState } from "react";
import { browserLogger } from "../browser-logger";
import type { LogLevel } from "../types";

interface LogViewerProps {
	maxEntries?: number;
	initialFilter?: LogLevel | "all";
}

/**
 * Filter options for log viewer
 */
const LOG_LEVELS: Array<
	"all" | "trace" | "debug" | "info" | "warn" | "error" | "fatal"
> = ["all", "trace", "debug", "info", "warn", "error", "fatal"];

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
	trace: "#6b7280",
	debug: "#3b82f6",
	info: "#10b981",
	warn: "#f59e0b",
	error: "#ef4444",
	fatal: "#7f1d1d",
};

const LOG_LEVEL_ICONS: Record<LogLevel, string> = {
	trace: "·",
	debug: "🔍",
	info: "ℹ️",
	warn: "⚠️",
	error: "❌",
	fatal: "💀",
};

/**
 * Log Viewer Component
 */
export function LogViewer({
	maxEntries = 100,
	initialFilter = "all",
}: LogViewerProps) {
	const [filter, setFilter] = useState<LogLevel | "all">(initialFilter);
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedEntries, setExpandedEntries] = useState<Set<number>>(
		new Set(),
	);

	// Get logs from buffer
	const logs = useMemo(() => {
		return browserLogger.getBuffer().slice(-maxEntries);
	}, [maxEntries]);

	// Filter logs
	const filteredLogs = useMemo(() => {
		return logs.filter((entry) => {
			// Level filter
			if (filter !== "all" && entry.level !== filter) {
				return false;
			}

			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return (
					entry.message.toLowerCase().includes(query) ||
					JSON.stringify(entry.context || {})
						.toLowerCase()
						.includes(query) ||
					entry.error?.message.toLowerCase().includes(query)
				);
			}

			return true;
		});
	}, [logs, filter, searchQuery]);

	// Statistics
	const stats = useMemo(() => {
		const levelCounts: Record<LogLevel, number> = {
			trace: 0,
			debug: 0,
			info: 0,
			warn: 0,
			error: 0,
			fatal: 0,
		};

		logs.forEach((entry) => {
			levelCounts[entry.level]++;
		});

		return levelCounts;
	}, [logs]);

	// Toggle entry expansion
	const toggleEntry = (index: number) => {
		setExpandedEntries((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	};

	// Clear logs
	const handleClearLogs = () => {
		browserLogger.clearBuffer();
	};

	// Export logs
	const handleExportLogs = () => {
		browserLogger.downloadLogs();
	};

	// Copy logs to clipboard
	const handleCopyLogs = async () => {
		const logsJson = browserLogger.exportLogs();
		await navigator.clipboard.writeText(logsJson);
		alert("Logs copied to clipboard!");
	};

	return (
		<div
			style={{
				fontFamily: "monospace",
				fontSize: "14px",
				padding: "1rem",
				backgroundColor: "#1f2937",
				color: "#f3f4f6",
				borderRadius: "0.5rem",
				maxHeight: "80vh",
				overflow: "auto",
			}}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "1rem",
					paddingBottom: "1rem",
					borderBottom: "1px solid #374151",
				}}
			>
				<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>
					Log Viewer ({filteredLogs.length} / {logs.length})
				</h2>

				{/* Actions */}
				<div style={{ display: "flex", gap: "0.5rem" }}>
					<button
						type="button"
						onClick={handleClearLogs}
						style={{
							padding: "0.5rem 1rem",
							backgroundColor: "#ef4444",
							color: "white",
							border: "none",
							borderRadius: "0.375rem",
							cursor: "pointer",
						}}
					>
						Clear
					</button>
					<button
						type="button"
						onClick={handleCopyLogs}
						style={{
							padding: "0.5rem 1rem",
							backgroundColor: "#3b82f6",
							color: "white",
							border: "none",
							borderRadius: "0.375rem",
							cursor: "pointer",
						}}
					>
						Copy
					</button>
					<button
						type="button"
						onClick={handleExportLogs}
						style={{
							padding: "0.5rem 1rem",
							backgroundColor: "#10b981",
							color: "white",
							border: "none",
							borderRadius: "0.375rem",
							cursor: "pointer",
						}}
					>
						Download
					</button>
				</div>
			</div>

			{/* Filters */}
			<div
				style={{
					display: "flex",
					gap: "1rem",
					marginBottom: "1rem",
					flexWrap: "wrap",
				}}
			>
				{/* Level Filter */}
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<label htmlFor="level-filter">Level:</label>
					<select
						id="level-filter"
						value={filter}
						onChange={(e) => setFilter(e.target.value as LogLevel | "all")}
						style={{
							padding: "0.25rem 0.5rem",
							backgroundColor: "#374151",
							color: "#f3f4f6",
							border: "1px solid #4b5563",
							borderRadius: "0.25rem",
						}}
					>
						{LOG_LEVELS.map((level) => (
							<option key={level} value={level}>
								{level.toUpperCase()}
							</option>
						))}
					</select>
				</div>

				{/* Search */}
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<label htmlFor="search-input">Search:</label>
					<input
						id="search-input"
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Filter logs..."
						style={{
							padding: "0.25rem 0.5rem",
							backgroundColor: "#374151",
							color: "#f3f4f6",
							border: "1px solid #4b5563",
							borderRadius: "0.25rem",
							flex: 1,
						}}
					/>
				</div>
			</div>

			{/* Statistics */}
			<div
				style={{
					display: "flex",
					gap: "1rem",
					marginBottom: "1rem",
					padding: "0.5rem",
					backgroundColor: "#111827",
					borderRadius: "0.375rem",
					flexWrap: "wrap",
				}}
			>
				{Object.entries(stats).map(([level, count]) => (
					<div
						key={level}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.25rem",
						}}
					>
						<span>{LOG_LEVEL_ICONS[level as LogLevel]}</span>
						<span style={{ color: LOG_LEVEL_COLORS[level as LogLevel] }}>
							{level.toUpperCase()}:
						</span>
						<span style={{ fontWeight: "bold" }}>{count}</span>
					</div>
				))}
			</div>

			{/* Log Entries */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
				}}
			>
				{filteredLogs.length === 0 ? (
					<div
						style={{
							padding: "2rem",
							textAlign: "center",
							color: "#9ca3af",
						}}
					>
						No logs match the current filters
					</div>
				) : (
					filteredLogs.map((entry, index) => {
						const isExpanded = expandedEntries.has(index);
						const originalIndex = logs.indexOf(entry);

						return (
							<button
								key={originalIndex}
								type="button"
								onClick={() => toggleEntry(index)}
								style={{
									padding: "0.5rem",
									backgroundColor: "#111827",
									borderLeft: `3px solid ${LOG_LEVEL_COLORS[entry.level]}`,
									borderRadius: "0.25rem",
									cursor: "pointer",
									transition: "background-color 0.2s",
									border: "none",
									width: "100%",
									textAlign: "left",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = "#1f2937";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "#111827";
								}}
							>
								{/* Summary */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
									}}
								>
									<span style={{ fontSize: "1.2rem" }}>
										{LOG_LEVEL_ICONS[entry.level]}
									</span>
									<span
										style={{
											color: LOG_LEVEL_COLORS[entry.level],
											fontWeight: "bold",
											minWidth: "60px",
										}}
									>
										{entry.level.toUpperCase()}
									</span>
									<span style={{ flex: 1 }}>{entry.message}</span>
									<span
										style={{
											fontSize: "0.75rem",
											color: "#9ca3af",
										}}
									>
										{new Date(entry.timestamp).toLocaleTimeString()}
									</span>
								</div>

								{/* Details (expanded) */}
								{isExpanded && (
									<div
										style={{
											marginTop: "0.5rem",
											paddingTop: "0.5rem",
											borderTop: "1px solid #374151",
											fontSize: "0.875rem",
										}}
									>
										{/* Context */}
										{entry.context && Object.keys(entry.context).length > 0 && (
											<div style={{ marginBottom: "0.5rem" }}>
												<div
													style={{
														color: "#9ca3af",
														marginBottom: "0.25rem",
														fontWeight: "bold",
													}}
												>
													Context:
												</div>
												<pre
													style={{
														margin: 0,
														padding: "0.5rem",
														backgroundColor: "#1f2937",
														borderRadius: "0.25rem",
														overflow: "auto",
														color: "#d1d5db",
													}}
												>
													{JSON.stringify(entry.context, null, 2)}
												</pre>
											</div>
										)}

										{/* Error */}
										{entry.error && (
											<div>
												<div
													style={{
														color: "#f87171",
														marginBottom: "0.25rem",
														fontWeight: "bold",
													}}
												>
													Error:
												</div>
												<div
													style={{
														padding: "0.5rem",
														backgroundColor: "#1f2937",
														borderRadius: "0.25rem",
														color: "#fca5a5",
													}}
												>
													{entry.error.message}
												</div>
												{entry.error.stack && (
													<details
														style={{
															marginTop: "0.5rem",
														}}
													>
														<summary
															style={{
																cursor: "pointer",
																color: "#9ca3af",
															}}
														>
															Stack Trace
														</summary>
														<pre
															style={{
																margin: "0.5rem 0 0 0",
																padding: "0.5rem",
																backgroundColor: "#1f2937",
																borderRadius: "0.25rem",
																overflow: "auto",
																color: "#d1d5db",
																fontSize: "0.75rem",
															}}
														>
															{entry.error.stack}
														</pre>
													</details>
												)}
											</div>
										)}
									</div>
								)}
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}
