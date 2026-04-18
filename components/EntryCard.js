"use client";

import { useMemo, useState } from "react";
import { formatDate } from "../lib/utils";
import { getThemePalette } from "../lib/themes";

export function EntryCard({
  entry,
  index = 0,
  appearance = "dark",
  previewLength = 100,
  onOpen,
  onToggleFavorite,
  onTogglePinned,
}) {
  const [touchStartX, setTouchStartX] = useState(0);
  const [isActionRevealed, setIsActionRevealed] = useState(false);
  const theme = getThemePalette(entry.theme, appearance);
  const preview = useMemo(() => {
    return entry.body.length > previewLength
      ? `${entry.body.slice(0, previewLength).trimEnd()}…`
      : entry.body;
  }, [entry.body, previewLength]);

  const handleTouchStart = (event) => {
    setTouchStartX(event.changedTouches[0].clientX);
  };

  const handleTouchEnd = (event) => {
    const delta = event.changedTouches[0].clientX - touchStartX;

    if (delta < -36) {
      setIsActionRevealed(true);
      return;
    }

    if (delta > 24) {
      setIsActionRevealed(false);
    }
  };

  return (
    <article
      className="group relative h-full overflow-hidden rounded-[28px]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Quick-action tray — revealed on swipe (mobile) or group-hover (desktop) */}
      <div
        className="absolute inset-y-3 right-3 z-0 flex items-center gap-2"
        style={{
          opacity: isActionRevealed ? 1 : 0,
          transform: isActionRevealed ? "translateX(0)" : "translateX(14px)",
          transition: "opacity 180ms ease, transform 180ms ease",
          pointerEvents: isActionRevealed ? "auto" : "none",
        }}
      >
        <button
          type="button"
          aria-label={entry.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(entry.id); }}
          className="interactive touch-target rounded-full px-4 py-2 text-xs font-semibold"
          style={{
            backgroundColor: "var(--button-secondary-bg)",
            border: "1px solid var(--surface-border)",
            color: "var(--button-secondary-text)",
          }}
        >
          {entry.favorite ? "Unfavorite" : "Favorite"}
        </button>
        <button
          type="button"
          aria-label={entry.pinned ? "Unpin entry" : "Pin entry"}
          onClick={(e) => { e.stopPropagation(); onTogglePinned?.(entry.id); }}
          className="interactive touch-target rounded-full px-4 py-2 text-xs font-semibold"
          style={{
            backgroundColor: "var(--button-secondary-bg)",
            border: "1px solid var(--surface-border)",
            color: "var(--button-secondary-text)",
          }}
        >
          {entry.pinned ? "Unpin" : "Pin"}
        </button>
      </div>

      {/* Desktop-only hover action row */}
      <div
        className="pointer-events-none absolute inset-y-3 right-3 z-20 hidden items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:flex"
        style={{ pointerEvents: isActionRevealed ? "none" : undefined }}
        aria-hidden="true"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={entry.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(entry.id); }}
          className="interactive pointer-events-auto rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{
            backgroundColor: "var(--button-secondary-bg)",
            border: "1px solid var(--surface-border)",
            color: "var(--button-secondary-text)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {entry.favorite ? "★" : "☆"}
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label={entry.pinned ? "Unpin entry" : "Pin entry"}
          onClick={(e) => { e.stopPropagation(); onTogglePinned?.(entry.id); }}
          className="interactive pointer-events-auto rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{
            backgroundColor: "var(--button-secondary-bg)",
            border: "1px solid var(--surface-border)",
            color: "var(--button-secondary-text)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {entry.pinned ? "📌" : "Pin"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpen?.(entry.id)}
        className="relative z-10 block h-full w-full animate-card-in rounded-[28px] p-5 text-left opacity-0 transition-all duration-200 hover:shadow-[0_24px_52px_rgba(0,0,0,0.14)] hover:-translate-y-0.5"
        style={{
          backgroundColor: theme.cardBg,
          border: "1px solid var(--surface-border)",
          borderLeftWidth: "3px",
          borderLeftColor: theme.accent,
          color: "var(--text-primary)",
          boxShadow:
            appearance === "light"
              ? "0 18px 40px rgba(77, 72, 61, 0.08)"
              : "0 18px 40px rgba(5, 8, 14, 0.24)",
          transform: isActionRevealed ? "translateX(-122px)" : "translateX(0)",
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="max-w-full overflow-hidden text-lg font-semibold leading-7"
                style={{ color: "var(--text-primary)", overflowWrap: "anywhere" }}
              >
                {entry.title}
              </h2>
              {entry.pinned ? (
                <span
                  className="rounded-full px-2 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}
                >
                  Pinned
                </span>
              ) : null}
              {entry.favorite ? (
                <span
                  className="rounded-full px-2 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}
                >
                  Favorite
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {formatDate(entry.createdAt)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="mt-1 h-3 w-3 flex-shrink-0 rounded-full ring-2 ring-offset-1"
            style={{
              backgroundColor: entry.accentColor.bg,
              ringColor: entry.accentColor.bg,
              ringOffsetColor: theme.cardBg,
            }}
            title={entry.accentColor.name}
          />
        </div>

        {entry.collection ? (
          <p className="mb-3 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            {entry.collection}
          </p>
        ) : null}

        {entry.tags?.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {entry.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-1 text-[11px]"
                style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <p
          className="overflow-hidden text-sm leading-7"
          style={{ color: "var(--text-secondary)", overflowWrap: "anywhere" }}
        >
          {preview}
        </p>

        {entry.checklist?.length ? (
          <div className="mt-4 flex items-center gap-2">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--surface-border)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  backgroundColor: theme.accent,
                  width: `${Math.round((entry.checklist.filter((i) => i.checked).length / entry.checklist.length) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {entry.checklist.filter((i) => i.checked).length}/{entry.checklist.length}
            </p>
          </div>
        ) : null}
      </button>
    </article>
  );
}

export default EntryCard;
