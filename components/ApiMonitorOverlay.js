"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useFloatingPanel } from "../hooks/useFloatingPanel";
import {
  clearApiMonitorLogs,
  getApiMonitorSnapshot,
  reportMemoryPressure,
  subscribeApiMonitor,
} from "../lib/api-monitor";

const formatDuration = (value) => {
  if (typeof value !== "number") return "—";
  return `${value} ms`;
};

const formatTime = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
};

const formatTimestamp = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
};

const statusStyle = (status) => ({
  backgroundColor:
    status === "error"
      ? "color-mix(in srgb, var(--button-danger-bg) 14%, transparent)"
      : status === "pending"
        ? "var(--chip-bg)"
        : "var(--badge-bg)",
  color:
    status === "error"
      ? "var(--button-danger-bg)"
      : status === "pending"
        ? "var(--chip-text)"
        : "var(--badge-text)",
});

function LogCard({ log, isExpanded, onToggle, isAdmin, onOpenDashboard }) {
  return (
    <div
      className="rounded-[18px] border"
      style={{
        borderColor: isExpanded
          ? "color-mix(in srgb, var(--button-bg) 40%, var(--surface-border))"
          : "var(--surface-border)",
        backgroundColor: "color-mix(in srgb, var(--surface) 88%, transparent)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-3 text-left"
        style={{ cursor: "pointer" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {log.method}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={statusStyle(log.status)}
            >
              {log.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {formatTime(log.startedAt)}
            </p>
            <span className="text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
              {isExpanded ? "▲" : "▼"}
            </span>
          </div>
        </div>
        <p className="mt-2 break-all text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
          {log.url}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span>{log.statusCode ? `HTTP ${log.statusCode}` : "No status"}</span>
          <span>{formatDuration(log.durationMs)}</span>
        </div>
        {log.errorMessage && !isExpanded ? (
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--button-danger-bg)" }}>
            {log.errorMessage}
          </p>
        ) : null}
      </button>

      {isExpanded ? (
        <div
          className="border-t px-3 pb-3 pt-2 text-xs space-y-2"
          style={{ borderColor: "var(--surface-border)", color: "var(--text-secondary)" }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--text-muted)" }}>
              Timestamp
            </p>
            <p className="leading-5">{formatTimestamp(log.startedAt)}</p>
          </div>

          {log.requestBody ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--text-muted)" }}>
                Request body
              </p>
              <pre
                className="overflow-auto rounded-[10px] p-2 text-[11px] leading-5 whitespace-pre-wrap break-all"
                style={{ backgroundColor: "color-mix(in srgb, var(--surface-strong) 60%, transparent)" }}
              >
                {log.requestBody}
              </pre>
            </div>
          ) : null}

          {log.responseSnippet ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--text-muted)" }}>
                Response
              </p>
              <pre
                className="overflow-auto rounded-[10px] p-2 text-[11px] leading-5 whitespace-pre-wrap break-all"
                style={{ backgroundColor: "color-mix(in srgb, var(--surface-strong) 60%, transparent)" }}
              >
                {log.responseSnippet}
              </pre>
            </div>
          ) : null}

          {log.errorMessage ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: "var(--button-danger-bg)" }}>
                Error{log.errorCode ? ` · ${log.errorCode}` : ""}
              </p>
              <p className="leading-5" style={{ color: "var(--button-danger-bg)" }}>
                {log.errorMessage}
              </p>
            </div>
          ) : null}

          {isAdmin ? (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="mt-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
              }}
            >
              Open in Dashboard →
            </button>
          ) : null}
        </div>
      ) : null}
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
  const { panelRef, position, isDragging, handleDragStart, checkWasDragged } = useFloatingPanel({
    fallbackWidth: isClosed ? 44 : 420,
    fallbackHeight: isClosed ? 44 : isOpen && !isMinimized ? 420 : 86,
    getDefaultPosition: ({ viewportHeight }) => ({
      x: 16,
      y: Math.max(16, viewportHeight - 120),
    }),
  });

  useEffect(() => {
    return subscribeApiMonitor(() => {
      setSnapshot(getApiMonitorSnapshot());
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedValue = window.localStorage.getItem("lumen_api_monitor_minimized");
    setIsMinimized(savedValue === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("lumen_api_monitor_minimized", String(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMemoryPressure = (event) => {
      const detail = event?.detail || {};
      setIsMinimized(true);
      setIsOpen(false);
      setIsClosed(false);
      setMemoryNotice(
        detail.usedMB
          ? `Memory guard trimmed monitor activity at ${detail.usedMB} MB.`
          : "Memory guard trimmed monitor activity."
      );
      reportMemoryPressure(detail);
    };

    window.addEventListener("lumen:memory-pressure", handleMemoryPressure);
    return () => window.removeEventListener("lumen:memory-pressure", handleMemoryPressure);
  }, []);

  const shouldHide =
    auth.isLoading ||
    !auth.isAuthenticated ||
    !auth.isAdmin ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/");

  const summary = useMemo(() => {
    const total = snapshot.logs.length;
    const errors = snapshot.logs.filter((log) => log.status === "error").length;
    const avgLatencyLogs = snapshot.logs.filter((log) => typeof log.durationMs === "number");
    const avgLatency = avgLatencyLogs.length
      ? Math.round(avgLatencyLogs.reduce((sum, log) => sum + log.durationMs, 0) / avgLatencyLogs.length)
      : null;

    return { total, errors, avgLatency };
  }, [snapshot.logs]);

  if (shouldHide) return null;

  const handleToggleMinimize = () => {
    setIsClosed(false);
    const isContentVisible = isOpen && !isMinimized;
    if (isContentVisible) {
      setIsMinimized(true);
      setIsOpen(false);
    } else {
      setIsMinimized(false);
      setIsOpen(true);
    }
  };

  const handleOpenPanel = () => {
    setIsClosed(false);
    setIsMinimized(false);
    setIsOpen(true);
  };

  const handleClosePanel = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsClosed(true);
  };

  const handleOpenDashboard = () => {
    router.push("/admin?section=api-monitor");
  };

  return (
    <div
      ref={panelRef}
      className={`fixed z-[92] ${isClosed ? "w-11" : "w-[min(26rem,calc(100vw-2rem))]"}`}
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : { left: "1rem", bottom: "1rem" }
      }
    >
      {isClosed ? (
        <button
          type="button"
          onPointerDown={handleDragStart}
          onClick={() => { if (checkWasDragged()) return; handleOpenPanel(); }}
          className="flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_8px_24px_rgba(14,18,26,0.22)] backdrop-blur-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--surface-strong) 92%, transparent)",
            borderColor: "var(--surface-border)",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <polyline points="1,10 4,6 7,8 10,3 13,5 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="15" cy="2" r="1.5" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <div
          className="rounded-[26px] border shadow-[0_24px_50px_rgba(14,18,26,0.22)] backdrop-blur-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--surface-strong) 92%, transparent)",
            borderColor: "var(--surface-border)",
          }}
        >
          <div
            onPointerDown={handleDragStart}
            className="flex cursor-grab items-center justify-between gap-3 px-4 py-3 active:cursor-grabbing"
            style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--text-muted)" }}>
                API Monitor
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {snapshot.activeCount > 0 ? `${snapshot.activeCount} live request${snapshot.activeCount > 1 ? "s" : ""}` : "Monitoring idle"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {summary.total} tracked • {summary.errors} errors • avg {summary.avgLatency !== null ? `${summary.avgLatency} ms` : "—"}
              </p>
              {memoryNotice ? (
                <p className="mt-1 text-[11px]" style={{ color: "var(--button-danger-bg)" }}>
                  {memoryNotice}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleToggleMinimize}
                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{
                  backgroundColor: "var(--button-secondary-bg)",
                  color: "var(--button-secondary-text)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                {isOpen && !isMinimized ? "Minimize" : "Expand"}
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleClosePanel}
                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{
                  backgroundColor: summary.errors ? "color-mix(in srgb, var(--button-danger-bg) 14%, transparent)" : "var(--badge-bg)",
                  color: summary.errors ? "var(--button-danger-bg)" : "var(--badge-text)",
                }}
              >
                Close
              </button>
            </div>
          </div>

          {isOpen && !isMinimized ? (
            <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--surface-border)" }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Recent frontend-tracked API activity for this session.
                </p>
                <div className="flex items-center gap-2">
                  {auth.isAdmin ? (
                    <button
                      type="button"
                      onClick={handleOpenDashboard}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        backgroundColor: "var(--button-bg)",
                        color: "var(--button-text)",
                      }}
                    >
                      Dashboard
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearApiMonitorLogs}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--button-secondary-bg)",
                      color: "var(--button-secondary-text)",
                      border: "1px solid var(--surface-border)",
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-[52vh] space-y-2 overflow-auto">
                {snapshot.pressureInfo ? (
                  <div
                    className="rounded-[18px] border px-3 py-3"
                    style={{
                      borderColor: "color-mix(in srgb, var(--button-danger-bg) 28%, var(--surface-border))",
                      backgroundColor: "color-mix(in srgb, var(--button-danger-bg) 8%, var(--surface))",
                    }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--button-danger-bg)" }}>
                      Memory guard
                    </p>
                    <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                      Monitor logs were trimmed at {snapshot.pressureInfo.usedMB || "unknown"} MB
                      {snapshot.pressureInfo.thresholdMB ? ` (threshold ${snapshot.pressureInfo.thresholdMB} MB)` : ""}.
                    </p>
                  </div>
                ) : null}

                {snapshot.logs.length ? snapshot.logs.slice(0, 12).map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    isExpanded={expandedId === log.id}
                    onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    isAdmin={auth.isAdmin}
                    onOpenDashboard={handleOpenDashboard}
                  />
                )) : (
                  <div
                    className="rounded-[18px] border px-4 py-5 text-center"
                    style={{ borderColor: "var(--surface-border)" }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      No API activity yet
                    </p>
                    <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                      Requests from auth, journal, and admin flows will appear here as you use the app.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ApiMonitorOverlay;
