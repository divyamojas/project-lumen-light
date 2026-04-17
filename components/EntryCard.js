import Link from "next/link";
import { formatDate } from "../lib/utils";
import { getThemePalette } from "../lib/themes";

export function EntryCard({
  entry,
  index = 0,
  appearance = "dark",
  previewLength = 100,
}) {
  const theme = getThemePalette(entry.theme, appearance);
  const preview =
    entry.body.length > previewLength
      ? `${entry.body.slice(0, previewLength).trimEnd()}...`
      : entry.body;

  return (
    <Link
      href={`/entry/${entry.id}`}
      className="block animate-card-in opacity-0 transition duration-300 hover:-translate-y-0.5 hover:brightness-[1.03] focus:outline-none"
      aria-label={`Open entry ${entry.title}`}
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >
      <article
        className="h-full rounded-[28px] p-5 shadow-[0_18px_40px_rgba(34,41,52,0.08)] backdrop-blur"
        style={{
          backgroundColor: theme.cardBg,
          borderLeft: `3px solid ${theme.accent}`,
          border: "1px solid var(--surface-border)",
          color: "var(--text-primary)",
          boxShadow:
            appearance === "light"
              ? "0 18px 40px rgba(77, 72, 61, 0.08)"
              : "0 18px 40px rgba(5, 8, 14, 0.24)",
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              className="max-w-full overflow-hidden text-lg font-semibold leading-7"
              style={{
                color: "var(--text-primary)",
                overflowWrap: "anywhere",
              }}
            >
              {entry.title}
            </h2>
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
        <p
          className="overflow-hidden text-sm leading-7"
          style={{
            color: "var(--text-secondary)",
            overflowWrap: "anywhere",
          }}
        >
          {preview}
        </p>
      </article>
    </Link>
  );
}

export default EntryCard;
