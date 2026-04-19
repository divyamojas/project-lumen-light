"use client";

import { useRouter } from "next/navigation";
import { getExtraFields, getJournalType } from "../lib/journalTypes";
import { getThemePalette } from "../lib/themes";
import { formatDate } from "../lib/utils";

export function EntryDetail({
  entry,
  isConfirmingDelete,
  onBack,
  onEdit,
  onReflect,
  onDuplicate,
  onDelete,
  onCancelDelete,
  appearance = "dark",
  mode = "auto",
  onModeChange,
  relatedEntries = [],
  onThisDayEntries = [],
}) {
  const router = useRouter();
  const theme = getThemePalette(entry.theme, appearance);

  const handleOpenEntry = (id) => {
    router.push(`/entry/${id}`);
  };

  const checkmarkColor = appearance === "dark" ? "#f3efe9" : "#111827";

  return (
    <main
      className="min-h-screen px-5 pb-24 pt-6 transition-colors duration-500 md:px-8 md:pt-8"
      style={{
        background:
          "radial-gradient(circle at top left, color-mix(in srgb, var(--app-bg-secondary) 48%, transparent), transparent 42%), linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 72%, var(--app-bg-secondary)) 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col">
        {/* Top navigation bar */}
        <div
          className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-full px-3 py-2 backdrop-blur"
          style={{
            backgroundColor: "var(--topbar-bg)",
            border: "1px solid var(--surface-border)",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            className="interactive touch-target inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition"
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
                  className="touch-target rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
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

        {/* Entry article */}
        <article
          className="animate-fade-in rounded-[30px] p-6 backdrop-blur md:p-10"
          style={{
            backgroundColor: theme.cardBg,
            border: "1px solid var(--surface-border)",
            boxShadow:
              appearance === "light"
                ? "0 24px 60px rgba(94, 84, 63, 0.12)"
                : "0 24px 60px rgba(0, 0, 0, 0.18)",
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm uppercase tracking-[0.22em]" style={{ color: "var(--text-secondary)" }}>
              {formatDate(entry.createdAt)}
            </p>
            {entry.collection ? (
              <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                {entry.collection}
              </span>
            ) : null}
            {entry.favorite ? (
              <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                Favorite
              </span>
            ) : null}
            {entry.pinned ? (
              <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                Pinned
              </span>
            ) : null}
          </div>

          <h1
            className="mt-4 font-[family-name:var(--font-playfair)] text-4xl md:text-5xl"
            style={{ color: "var(--text-primary)", overflowWrap: "anywhere" }}
          >
            {entry.title}
          </h1>

          {entry.tags?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-xs"
                  style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          <div
            className="mt-8 max-w-[70ch] whitespace-pre-wrap text-base leading-[1.8]"
            style={{ color: "var(--text-primary)", overflowWrap: "anywhere" }}
          >
            {entry.body}
          </div>

          {/* Type metadata details */}
          {(() => {
            const extraFields = getExtraFields(entry.journal_type);
            const meta = entry.type_metadata || {};
            const populated = extraFields.filter((f) => meta[f.key] && String(meta[f.key]).trim());
            if (!populated.length) return null;
            const jt = getJournalType(entry.journal_type);
            return (
              <details className="mt-8" open={false}>
                <summary
                  className="cursor-pointer list-none rounded-[24px] p-4 text-sm font-semibold"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)", color: "var(--text-primary)" }}
                >
                  {jt.icon} {jt.label} details
                </summary>
                <div
                  className="mt-2 space-y-3 rounded-[24px] p-4"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
                >
                  {populated.map((field) => (
                    <div key={field.key}>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                        {field.label}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        {meta[field.key]}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            );
          })()}

          {entry.checklist?.length ? (
            <div
              className="mt-8 rounded-[24px] p-4"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Checklist
              </p>
              <ul className="mt-3 space-y-2">
                {entry.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span
                      aria-hidden="true"
                      className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: item.checked ? theme.accent : "transparent",
                        border: `1.5px solid ${theme.accent}`,
                        color: item.checked ? checkmarkColor : theme.accent,
                      }}
                    >
                      {item.checked ? "✓" : ""}
                    </span>
                    <span style={{ textDecoration: item.checked ? "line-through" : "none", opacity: item.checked ? 0.6 : 1 }}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>

        {/* Action row */}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onReflect}
            className="interactive touch-target rounded-full px-4 py-2 text-sm font-medium transition"
            style={{
              border: "1px solid var(--surface-border)",
              backgroundColor: "var(--button-secondary-bg)",
              color: "var(--button-secondary-text)",
            }}
          >
            Follow-up Reflection
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="interactive touch-target rounded-full px-4 py-2 text-sm font-medium transition"
            style={{
              border: "1px solid var(--surface-border)",
              backgroundColor: "var(--button-secondary-bg)",
              color: "var(--button-secondary-text)",
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="interactive touch-target rounded-full px-4 py-2 text-sm font-medium transition"
            style={{
              border: "1px solid var(--surface-border)",
              backgroundColor: "var(--button-secondary-bg)",
              color: "var(--button-secondary-text)",
            }}
          >
            Edit Entry
          </button>

          {isConfirmingDelete ? (
            <div
              className="animate-scale-in flex items-center gap-3 rounded-full px-4 py-2"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--surface-border)",
              }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Delete this entry?
              </span>
              <button
                type="button"
                onClick={onDelete}
                className="interactive rounded-full px-3 py-1.5 text-sm font-semibold"
                style={{
                  backgroundColor: "var(--button-danger-bg)",
                  color: "var(--button-danger-text)",
                }}
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="interactive rounded-full px-3 py-1.5 text-sm font-medium"
                style={{
                  border: "1px solid var(--surface-border)",
                  backgroundColor: "var(--button-secondary-bg)",
                  color: "var(--button-secondary-text)",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              className="interactive touch-target rounded-full px-4 py-2 text-sm font-medium transition"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--button-secondary-bg)",
                color: "var(--button-secondary-text)",
              }}
            >
              Delete Entry
            </button>
          )}
        </div>

        {/* Related / On This Day sidebars */}
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <section
            className="rounded-[28px] p-5"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--surface-border)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Related Entries
            </p>
            {relatedEntries.length === 0 ? (
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                Add tags or collections to make related reflections easier to find.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {relatedEntries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenEntry(item.id)}
                    className="interactive block w-full rounded-2xl p-3 text-left transition"
                    style={{
                      backgroundColor: "var(--surface-strong)",
                      border: "1px solid var(--surface-border)",
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {formatDate(item.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section
            className="rounded-[28px] p-5"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--surface-border)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              On This Day
            </p>
            {onThisDayEntries.length === 0 ? (
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                No earlier reflections share this calendar day yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {onThisDayEntries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenEntry(item.id)}
                    className="interactive block w-full rounded-2xl p-3 text-left transition"
                    style={{
                      backgroundColor: "var(--surface-strong)",
                      border: "1px solid var(--surface-border)",
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {formatDate(item.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default EntryDetail;
