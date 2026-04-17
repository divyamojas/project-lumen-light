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
      ? `${entry.body.slice(0, previewLength).trimEnd()}...`
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
      style={{
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div
        className="absolute inset-y-3 right-3 z-0 flex items-center gap-2"
        style={{
          opacity: isActionRevealed ? 1 : 0,
          transform: isActionRevealed ? "translateX(0)" : "translateX(14px)",
          transition: "all 180ms ease",
        }}
      >
        <button
          type="button"
          aria-label={entry.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggleFavorite?.(entry.id)}
          className="touch-target rounded-full px-4 py-2 text-xs font-semibold"
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
          onClick={() => onTogglePinned?.(entry.id)}
          className="touch-target rounded-full px-4 py-2 text-xs font-semibold"
          style={{
            backgroundColor: "var(--button-secondary-bg)",
            border: "1px solid var(--surface-border)",
            color: "var(--button-secondary-text)",
          }}
        >
          {entry.pinned ? "Unpin" : "Pin"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpen?.(entry.id)}
        className="relative z-10 block h-full w-full animate-card-in rounded-[28px] p-5 text-left opacity-0 transition duration-300 hover:-translate-y-0.5 hover:brightness-[1.03]"
        style={{
          backgroundColor: theme.cardBg,
          borderLeft: `3px solid ${theme.accent}`,
          border: "1px solid var(--surface-border)",
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
                style={{
                  color: "var(--text-primary)",
                  overflowWrap: "anywhere",
                }}
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
            className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: entry.accentColor.bg }}
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
                style={{
                  backgroundColor: "var(--badge-bg)",
                  color: "var(--badge-text)",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <p
          className="overflow-hidden text-sm leading-7"
          style={{
            color: "var(--text-secondary)",
            overflowWrap: "anywhere",
          }}
        >
          {preview}
        </p>

        {entry.checklist?.length ? (
          <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {entry.checklist.filter((item) => item.checked).length}/{entry.checklist.length} checklist items completed
          </p>
        ) : null}
      </button>
    </article>
  );
}

export default EntryCard;
