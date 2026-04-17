"use client";

import { getThemePalette } from "../lib/themes";
import { formatDate } from "../lib/utils";

export function EntryDetail({
  entry,
  isConfirmingDelete,
  onBack,
  onEdit,
  onDelete,
  appearance = "dark",
  mode = "auto",
  onModeChange,
}) {
  const theme = getThemePalette(entry.theme, appearance);

  return (
    <main
      className="min-h-screen px-5 pb-12 pt-5 transition-colors duration-500 md:px-8"
      style={{
        background:
          "radial-gradient(circle at top left, color-mix(in srgb, var(--app-bg-secondary) 48%, transparent), transparent 42%), linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 72%, var(--app-bg-secondary)) 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        <div className="mb-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition"
            style={{
              border: "1px solid var(--surface-border)",
              backgroundColor: "var(--button-secondary-bg)",
              color: "var(--button-secondary-text)",
            }}
          >
            <span aria-hidden="true">←</span>
            Back
          </button>
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center rounded-full p-1"
              style={{
                backgroundColor: "var(--chip-bg)",
                border: "1px solid var(--surface-border)",
              }}
            >
              {["auto", "light", "dark"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onModeChange(option)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
                  style={{
                    backgroundColor:
                      mode === option ? "var(--chip-active-bg)" : "transparent",
                    color: mode === option ? "var(--chip-active-text)" : "var(--chip-text)",
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
            <span
              className="h-3 w-3 rounded-full"
              aria-hidden="true"
              style={{ backgroundColor: theme.accent }}
            />
          </div>
        </div>

        <article
          className="rounded-[30px] p-6 backdrop-blur md:p-10"
          style={{
            backgroundColor: theme.cardBg,
            border: "1px solid var(--surface-border)",
            boxShadow:
              appearance === "light"
                ? "0 24px 60px rgba(94, 84, 63, 0.12)"
                : "0 24px 60px rgba(0, 0, 0, 0.18)",
          }}
        >
          <p className="mb-3 text-sm uppercase tracking-[0.22em]" style={{ color: "var(--text-secondary)" }}>
            {formatDate(entry.createdAt)}
          </p>
          <h1
            className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl"
            style={{
              color: "var(--text-primary)",
              overflowWrap: "anywhere",
            }}
          >
            {entry.title}
          </h1>
          <div
            className="mt-8 max-w-[65ch] whitespace-pre-wrap text-base leading-[1.8]"
            style={{
              color: "var(--text-primary)",
              overflowWrap: "anywhere",
            }}
          >
            {entry.body}
          </div>
        </article>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full px-4 py-2 text-sm font-medium transition"
            style={{
              border: "1px solid var(--surface-border)",
              backgroundColor: "var(--button-secondary-bg)",
              color: "var(--button-secondary-text)",
            }}
          >
            Edit Entry
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full px-4 py-2 text-sm transition"
            style={{
              border: "1px solid rgba(224, 128, 128, 0.25)",
              backgroundColor:
                appearance === "light" ? "rgba(214, 102, 102, 0.08)" : "rgba(255, 105, 105, 0.1)",
              color: appearance === "light" ? "#8A4141" : "#FFD0D0",
            }}
          >
            {isConfirmingDelete ? "Confirm Delete" : "Delete Entry"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default EntryDetail;
