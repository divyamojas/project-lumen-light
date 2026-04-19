"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JOURNAL_TYPE_LIST } from "../../lib/journalTypes";
import { savePendingNotice } from "../../lib/journal.mjs";
import { hasFeature } from "../../lib/featureFlags";
import { getApiBase, requestJson, setDefaultJournalType, setEnabledJournalTypes } from "../../lib/storage";
import { useAppearance } from "../../hooks/useAppearance";

const ONBOARDING_KEY = "lumen_onboarding_done";

const ACCENT_RAMP_COLORS = {
  purple: "#9BA1FF",
  teal: "#7BC0FF",
  amber: "#F6C65B",
  coral: "#FF8D8D",
  blue: "#6080CC",
  pink: "#F0A0C0",
};

export function OnboardingPage() {
  const router = useRouter();
  const { appearance } = useAppearance();
  const [selected, setSelected] = useState(["personal"]);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(ONBOARDING_KEY)) {
      router.replace("/app");
    }
  }, [router]);

  const toggleType = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((t) => t !== id)
          : prev
        : [...prev, id]
    );
  };

  const handleStart = async () => {
    const defaultJournalType = selected[0];
    setEnabledJournalTypes(selected);
    setDefaultJournalType(defaultJournalType);
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_KEY, "1");
      savePendingNotice(window.localStorage, "");
      document.cookie = `lumen_onboarding=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
    try {
      await requestJson(`${getApiBase()}/users/me/preferences`, {
        method: "PATCH",
        body: JSON.stringify({
          enabled_journal_types: selected,
          default_journal_type: defaultJournalType,
        }),
      });
    } catch (_e) {
      if (typeof window !== "undefined") {
        savePendingNotice(
          window.localStorage,
          "Preferences were only saved on this device. Reconnect and update settings to sync them to your account."
        );
      }
    }
    router.push("/app");
  };

  return (
    <main
      className="min-h-screen px-5 py-12 md:px-8"
      style={{
        background:
          "linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 80%, var(--app-bg-secondary)) 100%)",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--text-muted)" }}>
            Lumen
          </p>
          <h1
            className="mt-4 font-[family-name:var(--font-playfair)] text-4xl md:text-5xl"
            style={{ color: "var(--text-primary)" }}
          >
            What will you journal?
          </h1>
          <p className="mt-4 text-base" style={{ color: "var(--text-secondary)" }}>
            Choose the types of journal you want to keep. You can add more later in settings.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {JOURNAL_TYPE_LIST.filter((t) => hasFeature(`journal_type_${t.id}`)).map((jt) => {
            const isSelected = selected.includes(jt.id);
            const accentColor = ACCENT_RAMP_COLORS[jt.accentRamp] || "#8D98B8";
            return (
              <button
                key={jt.id}
                type="button"
                onClick={() => toggleType(jt.id)}
                className="group relative rounded-[28px] p-6 text-left transition-all duration-200"
                style={{
                  backgroundColor: isSelected
                    ? appearance === "dark"
                      ? `color-mix(in srgb, ${accentColor} 12%, var(--surface))`
                      : `color-mix(in srgb, ${accentColor} 10%, var(--surface))`
                    : "var(--surface)",
                  border: isSelected
                    ? `2px solid ${accentColor}`
                    : "1px solid var(--surface-border)",
                  boxShadow: isSelected
                    ? `0 8px 24px color-mix(in srgb, ${accentColor} 18%, transparent)`
                    : "none",
                }}
              >
                <span
                  className="block text-3xl"
                  aria-hidden="true"
                  style={{ color: isSelected ? accentColor : "var(--text-muted)" }}
                >
                  {jt.icon}
                </span>
                <p className="mt-3 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  {jt.label}
                </p>
                <p className="mt-1 text-xs" style={{ color: isSelected ? accentColor : "var(--text-muted)" }}>
                  {jt.tagline}
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  {jt.description}
                </p>
                {isSelected ? (
                  <span
                    className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: accentColor, color: "#fff" }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleStart}
            className="rounded-full px-8 py-3.5 text-base font-semibold transition hover:brightness-110"
            style={{
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
            }}
          >
            Get started with{" "}
            {selected.length === 1 ? "1 journal type" : `${selected.length} journal types`}
          </button>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            You selected: {selected.join(", ")}
          </p>
        </div>
      </div>
    </main>
  );
}

export default OnboardingPage;
