"use client";

import { useEffect, useState } from "react";
import EntryCard from "../components/EntryCard";
import EntryEditor from "../components/EntryEditor";
import ExportButton from "../components/ExportButton";
import { getEntries, getUiMode, saveUiMode } from "../lib/storage";
import { resolveAppearance } from "../lib/utils";

export default function HomePage() {
  const [entries, setEntries] = useState([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [mode, setMode] = useState("auto");
  const [appearance, setAppearance] = useState("light");
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });

  useEffect(() => {
    setEntries(getEntries());
    setMode(getUiMode());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyAppearance = () => {
      const nextAppearance = resolveAppearance({
        mode,
        systemPrefersDark: mediaQuery.matches,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      setAppearance(nextAppearance);
      document.documentElement.dataset.appearance = nextAppearance;
    };

    applyAppearance();

    const handleMediaChange = () => {
      applyAppearance();
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    const intervalId = window.setInterval(applyAppearance, 60000);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.clearInterval(intervalId);
    };
  }, [coordinates.latitude, coordinates.longitude, mode]);

  useEffect(() => {
    if (typeof window === "undefined" || mode !== "auto" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setCoordinates({ latitude: null, longitude: null });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 1800000,
      }
    );
  }, [mode]);

  const handleModeChange = (nextMode) => {
    setMode(saveUiMode(nextMode));
  };

  const handleEntryCreated = (entry) => {
    setEntries((currentEntries) => [entry, ...currentEntries]);
    setIsEditorOpen(false);
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-amber-100/30 blur-3xl" />
      </div>

      <div
        className="sticky top-0 z-20 border-b px-5 pb-4 pt-5 backdrop-blur md:px-8"
        style={{
          borderColor: "var(--surface-border)",
          backgroundColor: "var(--topbar-bg)",
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p
              className="mb-2 text-xs uppercase tracking-[0.28em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Quiet journal
            </p>
            <h1
              className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              Lumen
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
                  onClick={() => handleModeChange(option)}
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
            <ExportButton />
          </div>
        </div>
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 px-5 pb-28 pt-8 md:px-8">
        {entries.length === 0 ? (
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 text-center">
            <div
              className="rounded-full p-4"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-secondary)",
              }}
            >
              <svg
                aria-hidden="true"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L8.61 19.103a4.5 4.5 0 0 1-1.897 1.13l-2.963.988.988-2.963a4.5 4.5 0 0 1 1.13-1.897L16.862 4.487Z"
                />
              </svg>
            </div>
            <p className="max-w-sm text-base" style={{ color: "var(--text-secondary)" }}>
              Nothing here yet. Start writing.
            </p>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry, index) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                index={index}
                appearance={appearance}
              />
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => setIsEditorOpen(true)}
        className="fixed bottom-6 right-5 z-30 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-glow transition hover:brightness-110 focus:outline-none md:bottom-8 md:right-8"
        style={{
          backgroundColor: "var(--button-bg)",
          color: "var(--button-text)",
        }}
      >
        <span className="text-lg leading-none">+</span>
        New Entry
      </button>

      <EntryEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleEntryCreated}
        appearance={appearance}
      />
    </main>
  );
}
