import Link from "next/link";
import { JOURNAL_TYPE_LIST } from "../../lib/journalTypes";

export const metadata = {
  title: "Lumen — Private journal suite",
  description:
    "Lumen is a private, AI-ready journal suite. Write personal reflections, lab notes, travel logs, fitness records, and more — on your own AWS cloud.",
};

const ROADMAP = [
  { phase: 1, label: "Phase 1", title: "Write & reflect", description: "Full journal suite — 6 types, mood tracking, calendar, timeline, prompts.", status: "now" },
  { phase: 2, label: "Phase 2", title: "S3 sync", description: "Every entry backed up to your own AWS S3 bucket.", status: "coming" },
  { phase: 3, label: "Phase 3", title: "Search & query", description: "Natural-language search across all your entries with AWS OpenSearch.", status: "coming" },
  { phase: 4, label: "Phase 4", title: "AI reflection", description: "AWS Bedrock generates weekly summaries and prompts based on your own writing.", status: "coming" },
  { phase: 5, label: "Phase 5", title: "Sentiment & mood", description: "AWS Comprehend auto-tags entries with mood and theme patterns over time.", status: "coming" },
];

const ACCENT_COLORS = {
  purple: "#9BA1FF",
  teal: "#7BC0FF",
  amber: "#F6C65B",
  coral: "#FF8D8D",
  blue: "#6080CC",
  pink: "#F0A0C0",
};

export function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F1018",
        color: "#E8E4DC",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "rgba(15,16,24,0.88)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span style={{ fontFamily: "var(--font-playfair, serif)", fontSize: "1.25rem", color: "#E8E4DC" }}>
          Lumen
        </span>
        <Link
          href="/auth"
          style={{
            borderRadius: "9999px",
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            backgroundColor: "#E8E4DC",
            color: "#0F1018",
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: "56rem",
          margin: "0 auto",
          padding: "5rem 1.5rem 4rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.28em",
            color: "#7BC0FF",
            marginBottom: "1.5rem",
          }}
        >
          Private · AI-ready · Your cloud
        </p>
        <h1
          style={{
            fontFamily: "var(--font-playfair, serif)",
            fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
            lineHeight: 1.1,
            color: "#F0ECE4",
            marginBottom: "1.5rem",
          }}
        >
          Your journal.{" "}
          <span style={{ color: "#7BC0FF" }}>Your AWS.</span>{" "}
          Your AI.
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            lineHeight: 1.75,
            color: "#9A9591",
            maxWidth: "44rem",
            margin: "0 auto 2.5rem",
          }}
        >
          A calm, private journal suite that keeps your data on your own cloud — and will eventually let you query it with AI.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/auth"
            style={{
              borderRadius: "9999px",
              padding: "0.875rem 2rem",
              fontSize: "1rem",
              fontWeight: 700,
              backgroundColor: "#E8E4DC",
              color: "#0F1018",
              textDecoration: "none",
            }}
          >
            Get started free
          </Link>
          <a
            href="#how-it-works"
            style={{
              borderRadius: "9999px",
              padding: "0.875rem 2rem",
              fontSize: "1rem",
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#C8C4BC",
              textDecoration: "none",
            }}
          >
            See how it works
          </a>
        </div>
      </section>

      {/* Journal types grid */}
      <section
        style={{
          maxWidth: "64rem",
          margin: "0 auto",
          padding: "2rem 1.5rem 5rem",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: "#6A6560",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          6 journal types
        </p>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 17rem), 1fr))",
          }}
        >
          {JOURNAL_TYPE_LIST.map((jt) => {
            const accent = ACCENT_COLORS[jt.accentRamp] || "#8D98B8";
            return (
              <div
                key={jt.id}
                style={{
                  borderRadius: "1.75rem",
                  padding: "1.5rem",
                  backgroundColor: "#16181F",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span style={{ fontSize: "1.75rem", color: accent }}>{jt.icon}</span>
                <p style={{ marginTop: "0.75rem", fontWeight: 700, color: "#E8E4DC", fontSize: "1rem" }}>
                  {jt.label}
                </p>
                <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: accent }}>{jt.tagline}</p>
                <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#7A7570", lineHeight: 1.6 }}>
                  {jt.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works / roadmap */}
      <section
        id="how-it-works"
        style={{
          maxWidth: "52rem",
          margin: "0 auto",
          padding: "2rem 1.5rem 6rem",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: "#6A6560",
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          The roadmap
        </p>
        <div style={{ position: "relative" }}>
          {/* Timeline line */}
          <div
            style={{
              position: "absolute",
              left: "1.375rem",
              top: 0,
              bottom: 0,
              width: "2px",
              backgroundColor: "rgba(255,255,255,0.07)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {ROADMAP.map((item) => {
              const isNow = item.status === "now";
              return (
                <div key={item.phase} style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      flexShrink: 0,
                      width: "2.75rem",
                      height: "2.75rem",
                      borderRadius: "9999px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      position: "relative",
                      zIndex: 1,
                      backgroundColor: isNow ? "#7BC0FF" : "#1E2028",
                      color: isNow ? "#0F1018" : "#4A4540",
                      border: isNow ? "none" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {item.phase}
                  </div>
                  <div style={{ paddingTop: "0.625rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <p style={{ fontWeight: 700, color: isNow ? "#E8E4DC" : "#5A5550", fontSize: "1rem" }}>
                        {item.title}
                      </p>
                      {isNow ? (
                        <span
                          style={{
                            borderRadius: "9999px",
                            padding: "0.125rem 0.625rem",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            backgroundColor: "rgba(123,192,255,0.15)",
                            color: "#7BC0FF",
                          }}
                        >
                          Available now
                        </span>
                      ) : (
                        <span
                          style={{
                            borderRadius: "9999px",
                            padding: "0.125rem 0.625rem",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            color: "#4A4540",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          Coming
                        </span>
                      )}
                    </div>
                    <p style={{ marginTop: "0.375rem", fontSize: "0.875rem", color: isNow ? "#9A9591" : "#4A4540", lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        style={{
          textAlign: "center",
          padding: "3rem 1.5rem 6rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-playfair, serif)",
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            color: "#F0ECE4",
            marginBottom: "1rem",
          }}
        >
          Start writing today.
        </h2>
        <p style={{ color: "#7A7570", marginBottom: "2rem", fontSize: "1rem" }}>
          No subscription. Your data stays yours.
        </p>
        <Link
          href="/auth"
          style={{
            borderRadius: "9999px",
            padding: "0.875rem 2.5rem",
            fontSize: "1rem",
            fontWeight: 700,
            backgroundColor: "#E8E4DC",
            color: "#0F1018",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Get started free
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "0.75rem",
          fontSize: "0.8125rem",
          color: "#4A4540",
        }}
      >
        <span>Lumen — Private journal suite</span>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <Link href="/legal/privacy" style={{ color: "#4A4540", textDecoration: "none" }}>Privacy</Link>
          <Link href="/legal/terms" style={{ color: "#4A4540", textDecoration: "none" }}>Terms</Link>
          <Link href="/auth" style={{ color: "#4A4540", textDecoration: "none" }}>Sign in</Link>
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;
