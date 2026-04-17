"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import EntryCard from "../components/EntryCard";
import EntryEditor from "../components/EntryEditor";
import ExportButton from "../components/ExportButton";
import {
  createEntry,
  getEntries,
  getPreviewMode,
  getUiMode,
  importEntries,
  savePreviewMode,
  saveUiMode,
} from "../lib/storage";
import { resolveAppearance } from "../lib/utils";

const isInteractiveElement = (element) => {
  if (!element) {
    return false;
  }

  const tagName = element.tagName?.toLowerCase();
  return (
    element.isContentEditable ||
    ["input", "textarea", "select", "button"].includes(tagName)
  );
};

const matchesTimeframe = (entry, timeframe) => {
  if (timeframe === "all") {
    return true;
  }

  const createdAt = new Date(entry.createdAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timeframe === "today") {
    return createdAt >= startOfToday;
  }

  if (timeframe === "week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    return createdAt >= startOfWeek;
  }

  if (timeframe === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return createdAt >= startOfMonth;
  }

  return true;
};

export default function HomePage() {
  const [entries, setEntries] = useState([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [mode, setMode] = useState("auto");
  const [appearance, setAppearance] = useState("light");
  const [previewMode, setPreviewMode] = useState("comfortable");
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [timeframe, setTimeframe] = useState("all");
  const [toast, setToast] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallCardDismissed, setIsInstallCardDismissed] = useState(false);
  const searchInputRef = useRef(null);
  const importInputRef = useRef(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setEntries(getEntries());
    setMode(getUiMode());
    setPreviewMode(getPreviewMode());
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast("");
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const alreadyInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    setIsInstalled(alreadyInstalled);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
      setIsInstallCardDismissed(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      setToast("Lumen is installed and ready to open from your app list.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "/" && !isInteractiveElement(document.activeElement)) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key.toLowerCase() === "n" && !isInteractiveElement(document.activeElement)) {
        setIsEditorOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    const nextEntries = entries.filter((entry) => {
      const matchesQuery =
        !normalizedQuery ||
        entry.title.toLowerCase().includes(normalizedQuery) ||
        entry.body.toLowerCase().includes(normalizedQuery);

      return matchesQuery && matchesTimeframe(entry, timeframe);
    });

    if (sortBy === "oldest") {
      return [...nextEntries].sort((left, right) => {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      });
    }

    if (sortBy === "title") {
      return [...nextEntries].sort((left, right) => {
        return left.title.localeCompare(right.title);
      });
    }

    return [...nextEntries].sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [deferredQuery, entries, sortBy, timeframe]);

  const previewLength = previewMode === "compact" ? 100 : 180;

  const handleModeChange = (nextMode) => {
    setMode(saveUiMode(nextMode));
    setToast(
      nextMode === "auto"
        ? "Appearance will follow sunrise, sunset, or your device theme."
        : `Switched to ${nextMode} mode.`
    );
  };

  const handlePreviewModeChange = (nextMode) => {
    setPreviewMode(savePreviewMode(nextMode));
    setToast(
      nextMode === "compact"
        ? "Preview cards now show shorter snippets."
        : "Preview cards now show more of each entry."
    );
  };

  const handleEntryCreated = (values) => {
    const entry = createEntry(values);
    setEntries((currentEntries) => [entry, ...currentEntries]);
    setIsEditorOpen(false);
    setToast("Entry saved.");
    return entry;
  };

  const handleExport = (count) => {
    setToast(count > 0 ? `Exported ${count} entries.` : "Exported an empty journal file.");
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = importEntries(parsed);

      setEntries(result.entries);
      setToast(
        result.importedCount > 0
          ? `Imported ${result.importedCount} entries.`
          : "No valid entries were found in that file."
      );
    } catch (_error) {
      setToast("Import failed. Please choose a valid Lumen JSON export.");
    } finally {
      event.target.value = "";
    }
  };

  const handleInstall = async () => {
    if (!installPromptEvent) {
      setToast("Install is not available yet on this device or browser.");
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    if (choice?.outcome === "accepted") {
      setToast("Install prompt accepted.");
    } else {
      setToast("Install prompt dismissed.");
    }

    setInstallPromptEvent(null);
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                Search with <kbd className="rounded px-1.5 py-0.5" style={{ backgroundColor: "var(--chip-bg)" }}>/</kbd> and
                start a fresh note with <kbd className="rounded px-1.5 py-0.5" style={{ backgroundColor: "var(--chip-bg)" }}>N</kbd>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleImportClick}
                className="rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  border: "1px solid var(--surface-border)",
                  backgroundColor: "var(--button-secondary-bg)",
                  color: "var(--button-secondary-text)",
                }}
              >
                Import
              </button>
              <ExportButton onExport={handleExport} />
              <button
                type="button"
                onClick={() => setIsSettingsOpen((currentValue) => !currentValue)}
                className="rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  border: "1px solid var(--surface-border)",
                  backgroundColor: "var(--button-secondary-bg)",
                  color: "var(--button-secondary-text)",
                }}
              >
                Settings
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,0.7fr))]">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles and entries..."
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A-Z</option>
            </select>
            <select
              value={timeframe}
              onChange={(event) => setTimeframe(event.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">This month</option>
            </select>
          </div>

          {installPromptEvent && !isInstalled && !isInstallCardDismissed ? (
            <div
              className="flex flex-col gap-3 rounded-[24px] px-4 py-4 md:flex-row md:items-center md:justify-between"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--surface-border)",
                boxShadow:
                  appearance === "light"
                    ? "0 16px 32px rgba(77, 72, 61, 0.08)"
                    : "0 16px 32px rgba(5, 8, 14, 0.24)",
              }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Install Lumen on this device
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  On Android Chrome, this opens the native install prompt so Lumen can live in your app drawer.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsInstallCardDismissed(true)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition"
                  style={{
                    border: "1px solid var(--surface-border)",
                    backgroundColor: "var(--button-secondary-bg)",
                    color: "var(--button-secondary-text)",
                  }}
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={handleInstall}
                  className="rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-110"
                  style={{
                    backgroundColor: "var(--button-bg)",
                    color: "var(--button-text)",
                  }}
                >
                  Install App
                </button>
              </div>
            </div>
          ) : null}

          {isSettingsOpen ? (
            <div
              className="grid grid-cols-1 gap-4 rounded-[28px] px-5 py-5 md:grid-cols-3"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--surface-border)",
                boxShadow:
                  appearance === "light"
                    ? "0 18px 40px rgba(77, 72, 61, 0.08)"
                    : "0 18px 40px rgba(5, 8, 14, 0.24)",
              }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Appearance
                </p>
                <div className="mt-3 inline-flex rounded-full p-1" style={{ backgroundColor: "var(--chip-bg)" }}>
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
              </div>

              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Card previews
                </p>
                <div className="mt-3 inline-flex rounded-full p-1" style={{ backgroundColor: "var(--chip-bg)" }}>
                  {["compact", "comfortable"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handlePreviewModeChange(option)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
                      style={{
                        backgroundColor:
                          previewMode === option ? "var(--chip-active-bg)" : "transparent",
                        color:
                          previewMode === option
                            ? "var(--chip-active-text)"
                            : "var(--chip-text)",
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Helpful notes
                </p>
                <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Drafts autosave while you type.</li>
                  <li>Imports merge entries by ID and keep the newest local list.</li>
                  <li>Android install appears when Chrome decides the app is installable.</li>
                </ul>
              </div>
            </div>
          ) : null}
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
              Nothing here yet. Start writing, then search, sort, and export your journal as it grows.
            </p>
          </div>
        ) : filteredEntries.length === 0 ? (
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
                  d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6 6a7.5 7.5 0 0 0 10.65 10.65Z"
                />
              </svg>
            </div>
            <p className="max-w-sm text-base" style={{ color: "var(--text-secondary)" }}>
              No entries match your search or filter right now.
            </p>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Showing {filteredEntries.length} of {entries.length} entries
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredEntries.map((entry, index) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  appearance={appearance}
                  previewLength={previewLength}
                />
              ))}
            </div>
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

      {toast ? (
        <div
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg"
          style={{
            backgroundColor: "var(--surface-strong)",
            border: "1px solid var(--surface-border)",
            color: "var(--text-primary)",
          }}
        >
          {toast}
        </div>
      ) : null}

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className="hidden"
      />

      <EntryEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleEntryCreated}
        appearance={appearance}
        draftId="new-entry"
        heading="New Entry"
        saveLabel="Save Entry"
      />
    </main>
  );
}
