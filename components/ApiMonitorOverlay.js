"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useFloatingPanel } from "../hooks/useFloatingPanel";
import {
  applySearchQuery,
  clearApiMonitorLogs,
  getDurationColor,
  getApiMonitorSnapshot,
  getMethodStyle,
  getStatusStyle,
  prettyJson,
  reportMemoryPressure,
  subscribeApiMonitor,
} from "../lib/api-monitor";

const FILTER_SOURCES = [
  { key: "ALL", label: "All" },
  { key: "requestJson", label: "api" },
  { key: "auth", label: "auth" },
];
const FILTER_METHODS = ["ALL", "GET", "POST", "PATCH", "DELETE"];
const FILTER_STATUSES = [
  { key: "ALL", label: "All" },
  { key: "success", label: "OK" },
  { key: "error", label: "Err" },
  { key: "pending", label: "…" },
];

const formatTime = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
};

function FilterChips({ value, onChange, options, danger }) {
  return options.map((opt) => {
    const key = typeof opt === "string" ? opt : opt.key;
    const label = typeof opt === "string" ? opt : opt.label;
    const active = value === key;
    const isDanger = danger && key === "error";
    return (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{
          backgroundColor: active ? (isDanger ? "color-mix(in srgb, #ef4444 20%, transparent)" : "var(--button-bg)") : "color-mix(in srgb, var(--surface-strong) 60%, transparent)",
          color: active ? (isDanger ? "#ef4444" : "var(--button-text)") : "var(--text-muted)",
          border: `1px solid ${active ? (isDanger ? "color-mix(in srgb, #ef4444 30%, transparent)" : "color-mix(in srgb, var(--button-bg) 40%, transparent)") : "var(--surface-border)"}`,
          transition: "all 0.15s ease",
        }}
      >
        {label}
      </button>
    );
  });
}

function LogCard({ log, isExpanded, onToggle, onOpenDashboard }) {
  const mc = getMethodStyle(log.method);
  const durationColor = getDurationColor(log.durationMs);

  return (
    <div
      style={{
        borderRadius: "14px",
        border: `1px solid ${isExpanded ? "color-mix(in srgb, var(--button-bg) 35%, var(--surface-border))" : "var(--surface-border)"}`,
        backgroundColor: isExpanded ? "color-mix(in srgb, var(--surface-strong) 70%, transparent)" : "color-mix(in srgb, var(--surface) 80%, transparent)",
        transition: "border-color 0.2s ease, background-color 0.2s ease",
        overflow: "hidden",
      }}
    >
      <button type="button" onClick={onToggle} className="w-full px-3 py-2.5 text-left" style={{ cursor: "pointer" }}>
        <div className="flex items-center gap-2">
          <span
            className="shrink-0 rounded-[6px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] font-mono"
            style={{ backgroundColor: mc.bg, color: mc.color, minWidth: "2.8rem", textAlign: "center" }}
          >
            {log.method}
          </span>
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]"
            style={getStatusStyle(log.status)}
          >
            {log.status}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
            {log.url.replace(/^https?:\/\/[^/]+/, "")}
          </span>
          <span className="shrink-0 text-[10px] font-mono font-semibold" style={{ color: durationColor }}>
            {typeof log.durationMs === "number" ? `${log.durationMs}ms` : "—"}
          </span>
          <span className="shrink-0 text-[9px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
        {log.errorMessage && !isExpanded ? (
          <p className="mt-1 pl-0 text-[10px] font-mono leading-4" style={{ color: "#ef4444", paddingLeft: "3.2rem" }}>
            {log.errorMessage}
          </p>
        ) : null}
      </button>

      <div
        style={{
          maxHeight: isExpanded ? "600px" : "0",
          overflow: "hidden",
          transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="border-t px-3 pb-3 pt-2.5 space-y-2.5" style={{ borderColor: "var(--surface-border)" }}>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Time", formatTime(log.startedAt)],
              ["HTTP", log.statusCode ? String(log.statusCode) : "—"],
              ["Source", log.source || "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-0.5" style={{ color: "var(--text-muted)" }}>{k}</p>
                <p className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>{v}</p>
              </div>
            ))}
          </div>

          {[
            log.requestHeaders && { label: "Req Headers", value: JSON.stringify(log.requestHeaders, null, 2) },
            log.requestBody   && { label: "Req Body",    value: prettyJson(log.requestBody) },
            log.responseSnippet && { label: "Response",   value: prettyJson(log.responseSnippet) },
          ].filter(Boolean).map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
              <pre
                className="overflow-auto rounded-[10px] p-2 text-[10px] leading-[1.6] whitespace-pre-wrap break-all font-mono"
                style={{ maxHeight: "140px", background: "color-mix(in srgb, var(--surface-strong) 80%, transparent)", color: "var(--text-secondary)", border: "1px solid var(--surface-border)" }}
              >
                {value}
              </pre>
            </div>
          ))}

          {log.errorMessage ? (
            <div className="rounded-[10px] px-2.5 py-2" style={{ background: "color-mix(in srgb, #ef4444 10%, transparent)", border: "1px solid color-mix(in srgb, #ef4444 25%, transparent)" }}>
              <p className="text-[9px] uppercase tracking-[0.14em] font-semibold mb-0.5" style={{ color: "#ef4444" }}>
                Error{log.errorCode ? ` · ${log.errorCode}` : ""}
              </p>
              <p className="text-[10px] font-mono" style={{ color: "#ef4444" }}>{log.errorMessage}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onOpenDashboard}
            className="rounded-full px-3 py-1 text-[10px] font-semibold"
            style={{ backgroundColor: "var(--button-bg)", color: "var(--button-text)", transition: "opacity 0.15s" }}
          >
            Open in Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApiMonitorOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [memoryNotice, setMemoryNotice] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [snapshot, setSnapshot] = useState(() => getApiMonitorSnapshot());
  const [overlaySearch, setOverlaySearch] = useState("");
  const [overlayMethodFilter, setOverlayMethodFilter] = useState("ALL");
  const [overlayStatusFilter, setOverlayStatusFilter] = useState("ALL");
  const [overlaySourceFilter, setOverlaySourceFilter] = useState("ALL");
  const { panelRef, position, isDragging, handleDragStart, checkWasDragged } = useFloatingPanel({
    fallbackWidth: isClosed ? 44 : 420,
    fallbackHeight: isClosed ? 44 : isOpen && !isMinimized ? 500 : 90,
    getDefaultPosition: ({ viewportHeight }) => ({ x: 16, y: Math.max(16, viewportHeight - 120) }),
  });

  useEffect(() => subscribeApiMonitor(() => setSnapshot(getApiMonitorSnapshot())), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMinimized(window.localStorage.getItem("lumen_api_monitor_minimized") === "true");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("lumen_api_monitor_minimized", String(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event) => {
      const detail = event?.detail || {};
      setIsMinimized(true); setIsOpen(false); setIsClosed(false);
      setMemoryNotice(detail.usedMB ? `Memory guard trimmed at ${detail.usedMB} MB.` : "Memory guard trimmed.");
      reportMemoryPressure(detail);
    };
    window.addEventListener("lumen:memory-pressure", handler);
    return () => window.removeEventListener("lumen:memory-pressure", handler);
  }, []);

  const shouldHide = auth.isLoading || !auth.isAuthenticated || !auth.isSuperuser || pathname === "/auth" || pathname.startsWith("/auth/");

  const summary = useMemo(() => {
    const total = snapshot.logs.length;
    const errors = snapshot.logs.filter((l) => l.status === "error").length;
    const liveCount = snapshot.activeCount;
    const samples = snapshot.logs.filter((l) => typeof l.durationMs === "number");
    const avgLatency = samples.length ? Math.round(samples.reduce((s, l) => s + l.durationMs, 0) / samples.length) : null;
    return { total, errors, liveCount, avgLatency };
  }, [snapshot]);

  const filteredOverlayLogs = useMemo(() => applySearchQuery(
    snapshot.logs,
    overlaySearch,
    { method: overlayMethodFilter, status: overlayStatusFilter, source: overlaySourceFilter },
  ).slice(0, 12), [snapshot.logs, overlaySearch, overlayMethodFilter, overlayStatusFilter, overlaySourceFilter]);

  if (shouldHide) return null;

  const isContentVisible = isOpen && !isMinimized;

  const handleToggleMinimize = () => {
    setIsClosed(false);
    if (isContentVisible) { setIsMinimized(true); setIsOpen(false); }
    else { setIsMinimized(false); setIsOpen(true); }
  };

  const handleOpenPanel = () => { setIsClosed(false); setIsMinimized(false); setIsOpen(true); };
  const handleClosePanel = () => { setIsOpen(false); setIsMinimized(false); setIsClosed(true); };

  const handleOpenDashboard = (logId) => {
    setIsOpen(false); setIsClosed(true);
    router.push(`/admin?section=api-monitor${logId ? `&highlight=${logId}` : ""}`);
  };

  const hasFilters = overlaySearch || overlayMethodFilter !== "ALL" || overlayStatusFilter !== "ALL" || overlaySourceFilter !== "ALL";

  return (
    <div
      ref={panelRef}
      className={`fixed z-[92] ${isClosed ? "w-11" : "w-[min(26rem,calc(100vw-2rem))]"}`}
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : { left: "1rem", bottom: "1rem" }}
    >
      {isClosed ? (
        <button
          type="button"
          onPointerDown={handleDragStart}
          onClick={() => { if (checkWasDragged()) return; handleOpenPanel(); }}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_8px_24px_rgba(14,18,26,0.28)] backdrop-blur-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--surface-strong) 94%, transparent)",
            borderColor: summary.errors > 0 ? "color-mix(in srgb, #ef4444 40%, var(--surface-border))" : "var(--surface-border)",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            transition: "border-color 0.2s ease",
          }}
        >
          {summary.liveCount > 0 ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#10b981]" style={{ boxShadow: "0 0 6px #10b981" }} />
          ) : null}
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <polyline points="1,10 4,6 7,8 10,3 13,5 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="15" cy="2" r="1.5" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <div
          className="rounded-[24px] border shadow-[0_24px_56px_rgba(14,18,26,0.28)] backdrop-blur-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--surface-strong) 94%, transparent)",
            borderColor: "var(--surface-border)",
          }}
        >
          {/* Header */}
          <div
            onPointerDown={handleDragStart}
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: "var(--text-muted)" }}>API Monitor</p>
                {summary.liveCount > 0 ? (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: "color-mix(in srgb, #10b981 14%, transparent)", color: "#10b981" }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    {summary.liveCount} live
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm font-semibold leading-5" style={{ color: "var(--text-primary)" }}>
                {summary.liveCount > 0 ? `${summary.liveCount} active request${summary.liveCount > 1 ? "s" : ""}` : "Monitoring idle"}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                <span>{summary.total} tracked</span>
                {summary.errors > 0 ? <span style={{ color: "#ef4444" }}> · {summary.errors} errors</span> : <span style={{ color: "var(--text-muted)" }}> · 0 errors</span>}
                <span style={{ color: "var(--text-muted)" }}> · avg {summary.avgLatency !== null ? `${summary.avgLatency}ms` : "—"}</span>
              </p>
              {memoryNotice ? <p className="mt-1 text-[10px]" style={{ color: "#ef4444" }}>{memoryNotice}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleToggleMinimize}
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ backgroundColor: "var(--button-secondary-bg)", color: "var(--button-secondary-text)", border: "1px solid var(--surface-border)", transition: "opacity 0.15s" }}
              >
                {isContentVisible ? "—" : "Expand"}
              </button>
              <button
                type="button"
                onClick={handleClosePanel}
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  backgroundColor: summary.errors > 0 ? "color-mix(in srgb, #ef4444 14%, transparent)" : "var(--badge-bg)",
                  color: summary.errors > 0 ? "#ef4444" : "var(--badge-text)",
                  transition: "all 0.15s",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content — always in DOM, animated via max-height */}
          <div
            style={{
              maxHeight: isContentVisible ? "72vh" : "0",
              overflow: "hidden",
              transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--surface-border)" }}>
              {/* Toolbar */}
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={overlaySearch}
                    onChange={(e) => setOverlaySearch(e.target.value)}
                    placeholder="Search… or source:auth status:500"
                    className="min-w-0 flex-1 rounded-[10px] px-3 py-1.5 text-[11px]"
                    style={{ backgroundColor: "color-mix(in srgb, var(--surface-strong) 60%, transparent)", color: "var(--text-primary)", border: "1px solid var(--surface-border)", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenDashboard(null)}
                    className="shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "var(--button-bg)", color: "var(--button-text)", transition: "opacity 0.15s" }}
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={clearApiMonitorLogs}
                    className="shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "var(--button-secondary-bg)", color: "var(--button-secondary-text)", border: "1px solid var(--surface-border)", transition: "opacity 0.15s" }}
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <FilterChips value={overlayMethodFilter} onChange={setOverlayMethodFilter} options={FILTER_METHODS} />
                  <span className="self-center text-[9px] mx-0.5" style={{ color: "var(--surface-border)" }}>│</span>
                  <FilterChips value={overlayStatusFilter} onChange={setOverlayStatusFilter} options={FILTER_STATUSES} danger />
                  <span className="self-center text-[9px] mx-0.5" style={{ color: "var(--surface-border)" }}>│</span>
                  <FilterChips value={overlaySourceFilter} onChange={setOverlaySourceFilter} options={FILTER_SOURCES} />
                </div>
              </div>

              {/* Log list */}
              <div className="space-y-1.5 overflow-auto" style={{ maxHeight: "calc(72vh - 140px)" }}>
                {snapshot.pressureInfo ? (
                  <div className="rounded-[12px] border px-3 py-2.5" style={{ borderColor: "color-mix(in srgb, #ef4444 25%, var(--surface-border))", backgroundColor: "color-mix(in srgb, #ef4444 8%, transparent)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#ef4444" }}>Memory guard</p>
                    <p className="mt-1 text-[10px] leading-4" style={{ color: "var(--text-secondary)" }}>
                      Logs trimmed at {snapshot.pressureInfo.usedMB || "unknown"} MB.
                    </p>
                  </div>
                ) : null}

                {filteredOverlayLogs.length ? filteredOverlayLogs.map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    isExpanded={expandedId === log.id}
                    onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    onOpenDashboard={() => handleOpenDashboard(log.id)}
                  />
                )) : (
                  <div className="rounded-[14px] border px-4 py-5 text-center" style={{ borderColor: "var(--surface-border)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {hasFilters ? "No matching requests" : "No API activity yet"}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-5" style={{ color: "var(--text-secondary)" }}>
                      {hasFilters ? "Try adjusting your filters." : "Requests from auth and API flows will appear here."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiMonitorOverlay;
