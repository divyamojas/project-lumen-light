"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FALLBACK = `# Privacy Policy

**Last updated: April 2026**

Lumen is a private journal suite. Your entries are stored in your own AWS cloud infrastructure.

## What we collect

- Your email address, used for authentication only.
- Journal entries you write, stored in your AWS S3 bucket and database.

## What we don't do

- We don't sell your data.
- We don't train AI models on your private entries.
- We don't share data with third parties.

## Data deletion

You may delete your account and all associated data at any time from the Settings panel inside the app.

## Contact

For privacy questions, contact the operator of your Lumen instance.`;

export function PrivacyPage() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/legal/privacy`)
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
          <article
            className="prose prose-invert max-w-none"
            style={{ color: "#C8C4BC", lineHeight: 1.8 }}
          >
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
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "2rem", fontSize: "0.8125rem", color: "#4A4540" }}
        >
          <Link href="/legal/terms" style={{ color: "#6A6560", textDecoration: "none" }}>Terms of service →</Link>
          <Link href="/landing" style={{ color: "#6A6560", textDecoration: "none" }}>Back to Lumen</Link>
          <Link href="/auth" style={{ color: "#6A6560", textDecoration: "none" }}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}

export default PrivacyPage;
