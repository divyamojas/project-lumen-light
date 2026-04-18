"use client";

import { useMemo, useState } from "react";

export function ApiErrorSnackbar({ error, onClose }) {
  const [isOpen, setIsOpen] = useState(false);

  const statusLabel = useMemo(() => {
    if (!error?.status) {
      return "Request failed";
    }

    return `HTTP ${error.status}`;
  }, [error?.status]);

  if (!error) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 right-4 z-[95] mx-auto w-auto max-w-xl rounded-[24px] border px-4 py-3 text-left shadow-[0_24px_50px_rgba(14,18,26,0.22)] backdrop-blur-xl md:left-auto md:right-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface-strong) 94%, transparent)",
          borderColor: "color-mix(in srgb, var(--button-danger-bg) 38%, var(--surface-border))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--button-danger-bg)" }}>
              API Error
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {error.title || error.message}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              {statusLabel} • Tap to inspect full details
            </p>
          </div>
          <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: "color-mix(in srgb, var(--button-danger-bg) 14%, transparent)", color: "var(--button-danger-bg)" }}>
            Details
          </span>
        </div>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 px-4 py-4 md:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-[30px] border p-5 md:p-6"
            style={{
              backgroundColor: "var(--surface-strong)",
              borderColor: "var(--surface-border)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--button-danger-bg)" }}>
                  API Error
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl" style={{ color: "var(--text-primary)" }}>
                  {error.title || "Request failed"}
                </h2>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  {error.message}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--button-secondary-bg)",
                    color: "var(--button-secondary-text)",
                    border: "1px solid var(--surface-border)",
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--button-bg)",
                    color: "var(--button-text)",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border px-3 py-3" style={{ borderColor: "var(--surface-border)" }}>
                <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                  Status
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {statusLabel}
                </p>
              </div>
              <div className="rounded-[20px] border px-3 py-3" style={{ borderColor: "var(--surface-border)" }}>
                <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                  Method
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {error.method || "unknown"}
                </p>
              </div>
              <div className="rounded-[20px] border px-3 py-3" style={{ borderColor: "var(--surface-border)" }}>
                <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                  Endpoint
                </p>
                <p className="mt-1 break-all text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {error.url || "unknown"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border p-4" style={{ borderColor: "var(--surface-border)" }}>
              <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                Full Stack
              </p>
              <pre
                className="mt-3 max-h-[46vh] overflow-auto whitespace-pre-wrap break-words text-xs leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {error.stack || error.message}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ApiErrorSnackbar;
