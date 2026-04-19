"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FALLBACK = `# Terms of Service

**Last updated: April 2026**

By using Lumen, you agree to these terms.

## Service

Lumen provides a private journaling application. The service is provided as-is.

## Your data

Your journal entries belong to you. You are responsible for maintaining backups.

## Acceptable use

You may not use Lumen to store illegal content or to violate the rights of others.

## Termination

You may delete your account at any time from within the app. All associated data will be removed.

## Limitation of liability

Lumen is provided without warranty. The operator is not liable for data loss.

## Contact

For questions, contact the operator of your Lumen instance.`;

export function TermsPage() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/legal/terms`)
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then(setContent)
      .catch(() => setContent(FALLBACK))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main
      className="min-h-screen px-5 py-12 md:px-8"
      style={{ backgroundColor: "#0F1018", color: "#E8E4DC" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/landing"
            style={{
              borderRadius: "9999px",
              padding: "0.5rem 1.125rem",
              fontSize: "0.875rem",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#9A9591",
              textDecoration: "none",
            }}
          >
            ← Back
          </Link>
          <p style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.22em", color: "#4A4540" }}>
            Legal
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="skeleton h-5 rounded-lg"
                style={{ width: `${60 + (i % 3) * 15}%`, backgroundColor: "rgba(255,255,255,0.06)", animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        ) : (
          <article style={{ color: "#C8C4BC", lineHeight: 1.8 }}>
            {content.split("\n").map((line, i) => {
              if (line.startsWith("# ")) {
                return (
                  <h1 key={i} style={{ fontFamily: "var(--font-playfair, serif)", color: "#F0ECE4", fontSize: "2rem", marginBottom: "1rem" }}>
                    {line.slice(2)}
                  </h1>
                );
              }
              if (line.startsWith("## ")) {
                return (
                  <h2 key={i} style={{ color: "#E8E4DC", fontSize: "1.25rem", fontWeight: 700, marginTop: "2rem", marginBottom: "0.5rem" }}>
                    {line.slice(3)}
                  </h2>
                );
              }
              if (line.startsWith("- ")) {
                return (
                  <li key={i} style={{ marginLeft: "1.5rem", color: "#9A9591", marginBottom: "0.25rem" }}>
                    {line.slice(2)}
                  </li>
                );
              }
              if (!line.trim()) {
                return <div key={i} style={{ height: "0.75rem" }} />;
              }
              return (
                <p key={i} style={{ color: "#9A9591", marginBottom: "0.5rem" }}>
                  {line}
                </p>
              );
            })}
          </article>
        )}

        <div
          className="mt-10 flex flex-wrap gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "2rem", fontSize: "0.8125rem" }}
        >
          <Link href="/legal/privacy" style={{ color: "#6A6560", textDecoration: "none" }}>Privacy policy →</Link>
          <Link href="/landing" style={{ color: "#6A6560", textDecoration: "none" }}>Back to Lumen</Link>
          <Link href="/auth" style={{ color: "#6A6560", textDecoration: "none" }}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}

export default TermsPage;
