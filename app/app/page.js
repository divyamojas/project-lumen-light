"use client";

import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import EntryCard from "../../components/EntryCard";
import EntryEditor from "../../components/EntryEditor";
import ExportButton from "../../components/ExportButton";
import ImportPreviewModal from "../../components/ImportPreviewModal";
import { useAuth } from "../../components/AuthProvider";
import { useAppearance } from "../../hooks/useAppearance";
import {
  clearAuthSession,
  consumePendingNotice,
  createEntry,
  getApiBase,
  getEntries,
  getEntriesFresh,
  getLastExportMeta,
  getPreviewMode,
  getPrivacySettings,
  importEntries,
  previewImportEntries,
  requestJson,
  savePreviewMode,
  savePrivacySettings,
  updateEntry,
} from "../../lib/storage";
import { THEMES } from "../../lib/themes";
import {
  buildCalendarMatrix,
  buildReflectionSummary,
  buildTimelineGroups,
  filterEntries,
  formatRangeLabel,
  getAllCollections,
  getAllTags,
  getDayKey,
  JOURNAL_PROMPTS,
  JOURNAL_TEMPLATES,
  sortEntries,
} from "../../lib/journal.mjs";

const isInteractiveElement = (element) => {
  if (!element) {
    return false;
  }

  const tagName = element.tagName?.toLowerCase();
  return element.isContentEditable || ["input", "textarea", "select", "button"].includes(tagName);
};

const REFRESH_DEBOUNCE_MS = 12000;

const StatsStrip = memo(function StatsStrip({ reflectionSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[
        ["Entries", reflectionSummary.totalEntries],
        ["This Week", reflectionSummary.thisWeekCount],
        ["Streak", `${reflectionSummary.streak} days`],
        ["Favorites", reflectionSummary.favoriteCount],
      ].map(([label, value]) => (
        <div key={label} className="metric-card rounded-[30px] p-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
});

const QuickStartPanel = memo(function QuickStartPanel({ onOpenTemplate, onOpenPrompt }) {
  return (
    <section className="rounded-[30px] p-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Quick Start
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {JOURNAL_TEMPLATES.slice(1).map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onOpenTemplate(template.id)}
            className="touch-target rounded-full px-4 py-2 text-sm"
            style={{
              border: "1px solid var(--surface-border)",
              backgroundColor: "var(--button-secondary-bg)",
              color: "var(--button-secondary-text)",
            }}
          >
            {template.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {JOURNAL_PROMPTS.slice(0, 3).map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onOpenPrompt(prompt)}
            className="block w-full rounded-2xl p-3 text-left text-sm transition hover:brightness-105"
            style={{
              backgroundColor: "var(--surface-strong)",
              border: "1px solid var(--surface-border)",
              color: "var(--text-primary)",
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
});

const ReflectionPanel = memo(function ReflectionPanel({ reflectionSummary }) {
  return (
    <section className="rounded-[30px] p-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Weekly Reflection
      </p>
      {reflectionSummary.topTags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {reflectionSummary.topTags.map((item) => (
            <span key={item.tag} className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
              #{item.tag} · {item.count}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Top tags will appear here once you start tagging entries.
        </p>
      )}
      <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        This week you wrote {reflectionSummary.thisWeekCount} entries. Keep the streak gentle: {reflectionSummary.streak} consecutive days.
      </p>
    </section>
  );
});

const BackupPanel = memo(function BackupPanel({ lastExport }) {
  return (
    <section className="rounded-[30px] p-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Backup Status
      </p>
      <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {lastExport
          ? `Last export: ${new Date(lastExport.timestamp).toLocaleString()}${lastExport.encrypted ? " (encrypted)" : ""}`
          : "No backup recorded yet."}
      </p>
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        Encrypted exports stay local and require the same passphrase for restore.
      </p>
    </section>
  );
});

export function HomePage() {
  const auth = useAuth();
  const router = useRouter();
  const { mode, appearance, handleModeChange: changeMode } = useAppearance();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorValues, setEditorValues] = useState(null);
  const [previewMode, setPreviewMode] = useState("comfortable");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [timeframe, setTimeframe] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTopPanel, setActiveTopPanel] = useState(null);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallPromptExpanded, setIsInstallPromptExpanded] = useState(false);
  const [viewMode, setViewMode] = useState("feed");
  const [activeMonth, setActiveMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCalendarDay, setSelectedCalendarDay] = useState("");
  const [privacyForm, setPrivacyForm] = useState(() => ({
    passcode: "",
    passcodeHint: getPrivacySettings().passcodeHint,
    blurOnBackground: getPrivacySettings().blurOnBackground,
  }));
  const [lastExport, setLastExport] = useState(() => getLastExportMeta());
  const [importPayload, setImportPayload] = useState(null);
  const [importEntriesBuffer, setImportEntriesBuffer] = useState([]);
  const [importPreview, setImportPreview] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPassphrase, setImportPassphrase] = useState("");
  const [requiresPassphrase, setRequiresPassphrase] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteEntriesConfirm, setDeleteEntriesConfirm] = useState("");
  const [isDeleteEntriesOpen, setIsDeleteEntriesOpen] = useState(false);
  const searchInputRef = useRef(null);
  const importInputRef = useRef(null);
  const lastRefreshAtRef = useRef(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      const nextEntries = await getEntries();

      if (!isMounted) {
        return;
      }

      setEntries(nextEntries);
      setPreviewMode(getPreviewMode());
      setLastExport(getLastExportMeta());
      lastRefreshAtRef.current = Date.now();
      setIsLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const pendingNotice = consumePendingNotice(window.localStorage);

    if (pendingNotice) {
      setToast(pendingNotice);
    }
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast("");
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

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
      setIsInstallPromptExpanded(false);
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
      }

      if (event.key.toLowerCase() === "n" && !isInteractiveElement(document.activeElement)) {
        setEditorValues(null);
        setIsEditorOpen(true);
      }

      if (event.key === "Escape") {
        setActiveTopPanel(null);
        setIsInstallPromptExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const allTags = useMemo(() => getAllTags(entries), [entries]);
  const allCollections = useMemo(() => getAllCollections(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const nextEntries = filterEntries(entries, {
      query: deferredQuery,
      timeframe,
      startDate,
      endDate,
      selectedTags,
      selectedCollections,
      onlyFavorites,
      onlyPinned,
    });

    const themeScopedEntries = selectedTheme
      ? nextEntries.filter((entry) => (entry.theme || "neutral") === selectedTheme)
      : nextEntries;

    const dateScopedEntries = selectedCalendarDay
      ? themeScopedEntries.filter((entry) => getDayKey(entry.createdAt) === selectedCalendarDay)
      : themeScopedEntries;

    return sortEntries(dateScopedEntries, sortBy);
  }, [
    deferredQuery,
    endDate,
    entries,
    onlyFavorites,
    onlyPinned,
    selectedCalendarDay,
    selectedCollections,
    selectedTheme,
    selectedTags,
    sortBy,
    startDate,
    timeframe,
  ]);

  const reflectionSummary = useMemo(() => buildReflectionSummary(entries), [entries]);
  const calendar = useMemo(() => {
    if (viewMode !== "calendar") {
      return [];
    }

    return buildCalendarMatrix(filteredEntries, activeMonth);
  }, [activeMonth, filteredEntries, viewMode]);
  const timelineGroups = useMemo(() => {
    if (viewMode !== "timeline") {
      return [];
    }

    return buildTimelineGroups(filteredEntries);
  }, [filteredEntries, viewMode]);
  const previewLength = previewMode === "compact" ? 90 : 200;

  const refreshEntries = async () => {
    lastRefreshAtRef.current = Date.now();
    setEntries(await getEntriesFresh());
    setLastExport(getLastExportMeta());
  };

  useEffect(() => {
    const refreshIfStale = () => {
      if (Date.now() - lastRefreshAtRef.current < REFRESH_DEBOUNCE_MS) {
        return;
      }

      refreshEntries();
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        refreshIfStale();
      }
    };

    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, []);

  const handleModeChange = (nextMode) => {
    changeMode(nextMode);
    setToast(
      nextMode === "auto"
        ? "Appearance now follows sunrise, sunset, or your device theme."
        : `Switched to ${nextMode} mode.`
    );
  };

  const handlePreviewModeChange = (nextMode) => {
    setPreviewMode(savePreviewMode(nextMode));
    setToast(nextMode === "compact" ? "Compact previews enabled." : "Comfortable previews enabled.");
  };

  const handleEntryCreated = async (values) => {
    const entry = await createEntry(values);
    await refreshEntries();
    setIsEditorOpen(false);
    setEditorValues(null);
    setToast("Entry saved.");
    return entry;
  };

  const toggleEntryField = async (id, key) => {
    const currentEntry = entries.find((entry) => entry.id === id);

    if (!currentEntry) {
      return;
    }

    await updateEntry(id, { [key]: !currentEntry[key] });
    await refreshEntries();
    setToast(key === "favorite" ? "Favorites updated." : "Pinned entries updated.");
  };

  const handleOpenPrompt = (prompt) => {
    setEditorValues({
      title: "",
      body: `${prompt}\n`,
      templateId: "blank",
      promptId: prompt,
      tags: [],
      collection: "",
      favorite: false,
      pinned: false,
    });
    setIsEditorOpen(true);
  };

  const handleOpenTemplate = (templateId) => {
    const template = JOURNAL_TEMPLATES.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setEditorValues({
      title: template.title,
      body: template.body,
      templateId,
      promptId: "",
      tags: [],
      collection: "",
      favorite: false,
      pinned: false,
    });
    setIsEditorOpen(true);
  };

  const handleExport = ({ count, encrypted, fileName }) => {
    setLastExport(getLastExportMeta());
    setToast(
      encrypted
        ? `Encrypted backup created: ${fileName}`
        : count > 0
          ? `Exported ${count} entries.`
          : "Exported an empty journal file."
    );
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
      const result = await previewImportEntries(parsed);

      setImportPayload(parsed);
      setImportPreview(result.preview);
      setImportEntriesBuffer(result.entries || []);
      setRequiresPassphrase(result.requiresPassphrase);
      setIsImportModalOpen(true);
    } catch (_error) {
      setToast("Import failed. Please choose a valid Lumen backup file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (requiresPassphrase) {
      try {
        const result = await previewImportEntries(importPayload, importPassphrase);
        setImportPreview(result.preview);
        setImportEntriesBuffer(result.entries || []);
        setRequiresPassphrase(false);
      } catch (_error) {
        setToast("That passphrase could not unlock the backup.");
      }

      return;
    }

    try {
      const imported = await importEntries(importEntriesBuffer, {
        duplicateMode: "replace-existing",
      });

      await refreshEntries();
      setIsImportModalOpen(false);
      setImportPayload(null);
      setImportEntriesBuffer([]);
      setImportPreview(null);
      setImportPassphrase("");
      setToast(
        imported.importedCount > 0
          ? `Imported ${imported.importedCount} entries. ${imported.duplicateCount} duplicates were updated.`
          : "No valid entries were found in that backup."
      );
    } catch (_error) {
      setToast("Import failed while restoring that backup.");
    }
  };

  const handleInstall = async () => {
    if (!installPromptEvent) {
      setToast("Install is not available yet on this device or browser.");
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    setToast(choice?.outcome === "accepted" ? "Install prompt accepted." : "Install prompt dismissed.");
    setInstallPromptEvent(null);
  };

  const handleSavePrivacy = async () => {
    await savePrivacySettings(privacyForm);
    setToast(privacyForm.passcode ? "Privacy settings saved. The app will lock in the background." : "Passcode removed.");
    setPrivacyForm((currentValue) => ({ ...currentValue, passcode: "" }));
  };

  const loadSyncStatus = async () => {
    try {
      const status = await requestJson(`${getApiBase()}/sync/status`);
      setSyncStatus(status);
    } catch {
      setSyncStatus({ enabled: false, error: "Could not reach sync endpoint." });
    }
  };

  const handleFullSync = async () => {
    setIsSyncing(true);
    try {
      const result = await requestJson(`${getApiBase()}/sync/full`, { method: "POST" });
      setToast(
        result?.failed
          ? `Backup finished with ${result.failed} failure${result.failed === 1 ? "" : "s"}.`
          : result?.scope === "all-users"
            ? "Backup complete. All entries were pushed to S3."
            : "Backup complete. Your entries were pushed to S3."
      );
      await loadSyncStatus();
    } catch {
      setToast("Backup failed. Check your deployment S3 configuration.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAllEntries = async () => {
    if (deleteEntriesConfirm !== "DELETE ALL ENTRIES") return;
    try {
      await requestJson(`${getApiBase()}/users/me/entries`, { method: "DELETE" });
      await refreshEntries();
      setIsDeleteEntriesOpen(false);
      setDeleteEntriesConfirm("");
      setToast("All entries deleted. Your account is still active.");
    } catch {
      setToast("Could not delete entries. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm !== "DELETE MY ACCOUNT") return;
    try {
      await requestJson(`${getApiBase()}/users/me`, { method: "DELETE", body: JSON.stringify({ confirm: "DELETE MY ACCOUNT" }) });
      await clearAuthSession();
      router.replace("/landing");
    } catch {
      setToast("Could not delete account. Please try again.");
    }
  };

  const clearFilters = () => {
    setQuery("");
    setSortBy("newest");
    setTimeframe("all");
    setStartDate("");
    setEndDate("");
    setSelectedTags([]);
    setSelectedCollections([]);
    setOnlyFavorites(false);
    setOnlyPinned(false);
    setSelectedCalendarDay("");
    setSelectedTheme("");
    setActiveMonth(new Date().toISOString().slice(0, 7));
    setToast("Filters cleared.");
  };

  const toggleTopPanel = (panel) => {
    setActiveTopPanel((currentValue) => (currentValue === panel ? null : panel));
  };

  const toggleChip = (value, items, setter) => {
    setter(items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  const handleOpenEntry = (id) => {
    router.push(`/entry/${id}`);
  };

  const installPromptVisible = Boolean(installPromptEvent) && !isInstalled;
  const activeFilterCount = [
    query.trim() ? 1 : 0,
    timeframe !== "all" ? 1 : 0,
    startDate ? 1 : 0,
    endDate ? 1 : 0,
    onlyFavorites ? 1 : 0,
    onlyPinned ? 1 : 0,
    selectedCalendarDay ? 1 : 0,
    selectedTheme ? 1 : 0,
    selectedTags.length,
    selectedCollections.length,
  ].reduce((sum, value) => sum + value, 0);
  const filterSummary = activeFilterCount
    ? `${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`
    : "Everything is in view";
  const utilityLabel = `${filteredEntries.length} matching ${filteredEntries.length === 1 ? "entry" : "entries"}`;
  const primaryView = useMemo(() => {
    if (isLoading) {
      return (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-[28px]" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      );
    }

    if (entries.length === 0) {
      return (
        <div className="mt-8 rounded-[28px] p-8 text-center" style={{ backgroundColor: "var(--surface-strong)", border: "1px solid var(--surface-border)" }}>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Nothing here yet. Start writing, then organize your journal with tags, collections, favorites, and backups.
          </p>
        </div>
      );
    }

    if (filteredEntries.length === 0) {
      return (
        <div className="mt-8 rounded-[28px] p-8 text-center" style={{ backgroundColor: "var(--surface-strong)", border: "1px solid var(--surface-border)" }}>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            No entries match the current search, tag, collection, or date filters.
          </p>
        </div>
      );
    }

    if (viewMode === "feed") {
      return (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredEntries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              index={index}
              appearance={appearance}
              previewLength={previewLength}
              onOpen={handleOpenEntry}
              onToggleFavorite={(id) => toggleEntryField(id, "favorite")}
              onTogglePinned={(id) => toggleEntryField(id, "pinned")}
            />
          ))}
        </div>
      );
    }

    if (viewMode === "calendar") {
      return (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {calendar.monthLabel}
              </p>
              {selectedCalendarDay ? (
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Day filter: {selectedCalendarDay}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={activeMonth}
                onChange={(event) => setActiveMonth(event.target.value)}
                className="rounded-2xl px-4 py-2 text-sm"
                style={{
                  border: "1px solid var(--surface-border)",
                  backgroundColor: "var(--surface-strong)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedCalendarDay("")}
                className="rounded-full px-4 py-2 text-sm"
                style={{
                  border: "1px solid var(--surface-border)",
                  backgroundColor: "var(--button-secondary-bg)",
                  color: "var(--button-secondary-text)",
                }}
              >
                Clear Day
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="px-2 py-1 text-center text-xs uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                {label}
              </div>
            ))}
            {calendar.cells.map((cell, index) =>
              cell ? (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedCalendarDay(cell.key === selectedCalendarDay ? "" : cell.key)}
                  className="aspect-square rounded-2xl p-2 text-left transition"
                  style={{
                    border: "1px solid var(--surface-border)",
                    backgroundColor: cell.key === selectedCalendarDay ? "var(--button-bg)" : "var(--surface-strong)",
                    color: cell.key === selectedCalendarDay ? "var(--button-text)" : "var(--text-primary)",
                  }}
                >
                  <span className="text-xs font-semibold">{cell.day}</span>
                  <span className="mt-3 block text-xs opacity-80">{cell.count || ""}</span>
                </button>
              ) : (
                <div key={`empty-${index}`} />
              )
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6 space-y-6">
        {timelineGroups.map((group) => (
          <section key={group.key}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
              {group.label}
            </h3>
            <div className="mt-3 space-y-3">
              {group.entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleOpenEntry(entry.id)}
                  className="block w-full rounded-[24px] p-4 text-left transition hover:brightness-105"
                  style={{
                    backgroundColor: "var(--surface-strong)",
                    border: "1px solid var(--surface-border)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                        {entry.title}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {new Date(entry.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                      {(entry.tags || []).length} tags
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }, [
    activeMonth,
    appearance,
    calendar,
    entries.length,
    filteredEntries,
    handleOpenEntry,
    isLoading,
    previewLength,
    selectedCalendarDay,
    timelineGroups,
    viewMode,
  ]);

  const sideRail = useMemo(() => {
    return (
      <div className="space-y-5">
        <QuickStartPanel onOpenTemplate={handleOpenTemplate} onOpenPrompt={handleOpenPrompt} />
        <ReflectionPanel reflectionSummary={reflectionSummary} />
        <BackupPanel lastExport={lastExport} />
      </div>
    );
  }, [handleOpenPrompt, handleOpenTemplate, lastExport, reflectionSummary]);

  return (
    <main
      className="lively-shell min-h-screen pb-28 pt-4 transition-colors duration-300 md:pt-6"
      style={{
        background: "linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 80%, var(--app-bg-secondary)) 100%)",
      }}
    >
      <header className="pointer-events-none sticky top-4 z-40 px-5 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
          <div
            className="hero-panel pointer-events-auto relative overflow-visible rounded-[34px] border px-3 py-3 md:px-4"
            style={{
              backgroundColor: "color-mix(in srgb, var(--surface) 76%, transparent)",
              borderColor: "color-mix(in srgb, var(--surface-border) 88%, white 12%)",
            }}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3 lg:min-w-[11rem]">
                <div className="float-card flex h-11 w-11 items-center justify-center rounded-2xl glow-chip" style={{ backgroundColor: "color-mix(in srgb, var(--button-bg) 14%, transparent)" }}>
                  <span className="font-[family-name:var(--font-playfair)] text-lg" style={{ color: "var(--text-primary)" }}>
                    L
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
                    Quiet journal
                  </p>
                  <p className="font-[family-name:var(--font-playfair)] text-2xl leading-none" style={{ color: "var(--text-primary)" }}>
                    Lumen
                  </p>
                </div>
              </div>

              <div className="flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search your entries..."
                  className="w-full rounded-[22px] px-4 py-3 text-sm outline-none transition"
                  style={{
                    border: "1px solid var(--surface-border)",
                    backgroundColor: "color-mix(in srgb, var(--surface-strong) 88%, transparent)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditorValues(null);
                    setIsEditorOpen(true);
                  }}
                  className="touch-target rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--button-bg)",
                    color: "var(--button-text)",
                  }}
                >
                  New Entry
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyFavorites((currentValue) => !currentValue)}
                  className="touch-target rounded-full px-3 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: onlyFavorites ? "var(--button-bg)" : "var(--button-secondary-bg)",
                    color: onlyFavorites ? "var(--button-text)" : "var(--button-secondary-text)",
                    border: onlyFavorites ? "none" : "1px solid var(--surface-border)",
                  }}
                >
                  Favorites
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyPinned((currentValue) => !currentValue)}
                  className="touch-target rounded-full px-3 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: onlyPinned ? "var(--button-bg)" : "var(--button-secondary-bg)",
                    color: onlyPinned ? "var(--button-text)" : "var(--button-secondary-text)",
                    border: onlyPinned ? "none" : "1px solid var(--surface-border)",
                  }}
                >
                  Pinned
                </button>
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="touch-target rounded-full px-3 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: selectedTheme ? "var(--button-bg)" : "var(--button-secondary-bg)",
                    color: selectedTheme ? "var(--button-text)" : "var(--button-secondary-text)",
                    border: selectedTheme ? "none" : "1px solid var(--surface-border)",
                  }}
                >
                  <option value="">Mood</option>
                  {Object.entries(THEMES).map(([key, t]) => (
                    <option key={key} value={key}>{t.label}</option>
                  ))}
                </select>
                {[
                  ["filters", activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"],
                  ["library", "Library"],
                  ["settings", "Settings"],
                ].map(([panel, label]) => (
                  <button
                    key={panel}
                    type="button"
                    onClick={() => toggleTopPanel(panel)}
                    aria-expanded={activeTopPanel === panel}
                    className="touch-target rounded-full px-3 py-2 text-sm font-medium transition"
                    style={{
                      backgroundColor: activeTopPanel === panel ? "var(--chip-active-bg)" : "var(--chip-bg)",
                      color: activeTopPanel === panel ? "var(--chip-active-text)" : "var(--chip-text)",
                      border: activeTopPanel === panel ? "none" : "1px solid var(--surface-border)",
                    }}
                  >
                    {label}
                  </button>
                ))}

                {installPromptVisible ? (
                  <div
                    className="relative"
                    onMouseEnter={() => setIsInstallPromptExpanded(true)}
                    onMouseLeave={() => setIsInstallPromptExpanded(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setIsInstallPromptExpanded((v) => !v)}
                      className="flex h-11 w-11 items-center justify-center rounded-full border transition"
                      style={{
                        borderColor: "var(--surface-border)",
                        backgroundColor: "color-mix(in srgb, var(--surface-strong) 86%, transparent)",
                        color: "var(--text-primary)",
                      }}
                      aria-expanded={isInstallPromptExpanded}
                      aria-label="Install app"
                    >
                      ↓
                    </button>
                    <div
                      className={`absolute right-0 top-14 z-50 w-72 rounded-[24px] border p-4 shadow-[0_18px_40px_rgba(0,0,0,0.14)] transition ${isInstallPromptExpanded ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0"}`}
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--surface) 94%, transparent)",
                        borderColor: "var(--surface-border)",
                        backdropFilter: "blur(16px)",
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Install Lumen
                      </p>
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        Add Lumen to your home screen for a cleaner, app-like journal with quick launch and offline access.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["Offline-ready", "Fast launch", "Less browser chrome"].map((item) => (
                          <span key={item} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--chip-bg)", color: "var(--chip-text)" }}>
                            {item}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleInstall}
                        className="interactive mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold"
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
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "var(--chip-bg)", color: "var(--chip-text)" }}>
                {utilityLabel}
              </span>
              <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "var(--chip-bg)", color: "var(--chip-text)" }}>
                {filterSummary}
              </span>
              <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "var(--chip-bg)", color: "var(--chip-text)" }}>
                Viewing {viewMode}
              </span>
              <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "var(--chip-bg)", color: "var(--chip-text)" }}>
                Press <span className="font-mono">/</span> to search
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--text-muted)" }}>
                  Today&apos;s pulse
                </p>
                <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl leading-tight md:text-[2.6rem]" style={{ color: "var(--text-primary)" }}>
                  Your journal should feel alive, not filed away.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 md:text-base" style={{ color: "var(--text-secondary)" }}>
                  Scan momentum, jump into a fresh thought, and move between feed, calendar, and timeline without losing the emotional thread of your week.
                </p>
              </div>
              <div className="command-card rounded-[28px] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                    Command center
                  </p>
                  <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                    Live
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Entries", reflectionSummary.totalEntries],
                    ["This week", reflectionSummary.thisWeekCount],
                    ["Streak", `${reflectionSummary.streak} days`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[22px] px-3 py-3"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--surface) 84%, transparent)",
                        border: "1px solid var(--surface-border)",
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                        {label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {activeTopPanel === "filters" ? (
            <div
              className="pointer-events-auto grid gap-4 rounded-[28px] border px-5 py-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
              style={{
                backgroundColor: "color-mix(in srgb, var(--surface) 92%, transparent)",
                borderColor: "var(--surface-border)",
              }}
            >
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                      Sort
                    </p>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                      style={{
                        border: "1px solid var(--surface-border)",
                        backgroundColor: "var(--surface-strong)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="newest">Newest first</option>
                      <option value="updated">Recently updated</option>
                      <option value="oldest">Oldest first</option>
                      <option value="title">Title A-Z</option>
                    </select>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                      Timeframe
                    </p>
                    <select
                      value={timeframe}
                      onChange={(event) => setTimeframe(event.target.value)}
                      className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                      style={{
                        border: "1px solid var(--surface-border)",
                        backgroundColor: "var(--surface-strong)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="all">All time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 days</option>
                      <option value="month">This month</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{
                      border: "1px solid var(--surface-border)",
                      backgroundColor: "var(--surface-strong)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{
                      border: "1px solid var(--surface-border)",
                      backgroundColor: "var(--surface-strong)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full px-4 py-2 text-sm font-medium"
                    style={{
                      border: "1px solid var(--surface-border)",
                      backgroundColor: "var(--button-secondary-bg)",
                      color: "var(--button-secondary-text)",
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {allTags.length ? (
                  <div className="rounded-[24px] p-4" style={{ backgroundColor: "var(--surface-strong)", border: "1px solid var(--surface-border)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Tags
                      </p>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {selectedTags.length ? `${selectedTags.length} selected` : "Optional"}
                      </span>
                    </div>
                    <div className="mt-3 flex max-h-[10rem] flex-wrap gap-2 overflow-y-auto pr-1">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleChip(tag, selectedTags, setSelectedTags)}
                          className="touch-target rounded-full px-3 py-2 text-xs font-semibold"
                          style={{
                            backgroundColor: selectedTags.includes(tag) ? "var(--button-bg)" : "var(--button-secondary-bg)",
                            color: selectedTags.includes(tag) ? "var(--button-text)" : "var(--button-secondary-text)",
                            border: selectedTags.includes(tag) ? "none" : "1px solid var(--surface-border)",
                          }}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {allCollections.length ? (
                  <div className="rounded-[24px] p-4" style={{ backgroundColor: "var(--surface-strong)", border: "1px solid var(--surface-border)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Collections
                      </p>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {selectedCollections.length ? `${selectedCollections.length} selected` : "Optional"}
                      </span>
                    </div>
                    <div className="mt-3 flex max-h-[10rem] flex-wrap gap-2 overflow-y-auto pr-1">
                      {allCollections.map((collection) => (
                        <button
                          key={collection}
                          type="button"
                          onClick={() => toggleChip(collection, selectedCollections, setSelectedCollections)}
                          className="touch-target rounded-full px-3 py-2 text-xs font-semibold"
                          style={{
                            backgroundColor: selectedCollections.includes(collection) ? "var(--button-bg)" : "var(--button-secondary-bg)",
                            color: selectedCollections.includes(collection) ? "var(--button-text)" : "var(--button-secondary-text)",
                            border: selectedCollections.includes(collection) ? "none" : "1px solid var(--surface-border)",
                          }}
                        >
                          {collection}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTopPanel === "library" ? (
            <div
              className="pointer-events-auto grid gap-4 rounded-[28px] border px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto_auto]"
              style={{
                backgroundColor: "color-mix(in srgb, var(--surface) 92%, transparent)",
                borderColor: "var(--surface-border)",
              }}
            >
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Backup and restore
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {lastExport
                    ? `Last export: ${new Date(lastExport.timestamp).toLocaleString()}${lastExport.encrypted ? " (encrypted)" : ""}`
                    : "No backup recorded yet."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleImportClick}
                className="touch-target rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  border: "1px solid var(--surface-border)",
                  backgroundColor: "var(--button-secondary-bg)",
                  color: "var(--button-secondary-text)",
                }}
              >
                Restore Backup
              </button>
              <ExportButton onExport={handleExport} />
            </div>
          ) : null}

          {activeTopPanel === "settings" ? (
            <>
            <div
              className="pointer-events-auto grid gap-4 rounded-[28px] border px-5 py-5 md:grid-cols-3"
              style={{
                backgroundColor: "color-mix(in srgb, var(--surface) 92%, transparent)",
                borderColor: "var(--surface-border)",
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
                      className="touch-target rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
                      style={{
                        backgroundColor: mode === option ? "var(--chip-active-bg)" : "transparent",
                        color: mode === option ? "var(--chip-active-text)" : "var(--chip-text)",
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <p className="mt-5 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Card previews
                </p>
                <div className="mt-3 inline-flex rounded-full p-1" style={{ backgroundColor: "var(--chip-bg)" }}>
                  {["compact", "comfortable"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handlePreviewModeChange(option)}
                      className="touch-target rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
                      style={{
                        backgroundColor: previewMode === option ? "var(--chip-active-bg)" : "transparent",
                        color: previewMode === option ? "var(--chip-active-text)" : "var(--chip-text)",
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Privacy
                </p>
                <div className="mt-3 space-y-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={privacyForm.passcode}
                    onChange={(event) => setPrivacyForm((currentValue) => ({ ...currentValue, passcode: event.target.value }))}
                    placeholder="Set or replace passcode"
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{
                      border: "1px solid var(--surface-border)",
                      backgroundColor: "var(--surface-strong)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <input
                    type="text"
                    value={privacyForm.passcodeHint}
                    onChange={(event) => setPrivacyForm((currentValue) => ({ ...currentValue, passcodeHint: event.target.value.slice(0, 60) }))}
                    placeholder="Optional hint"
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{
                      border: "1px solid var(--surface-border)",
                      backgroundColor: "var(--surface-strong)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <label className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={privacyForm.blurOnBackground}
                      onChange={(event) =>
                        setPrivacyForm((currentValue) => ({
                          ...currentValue,
                          blurOnBackground: event.target.checked,
                        }))
                      }
                    />
                    Lock and blur the app when it goes to the background
                  </label>
                  <button
                    type="button"
                    onClick={handleSavePrivacy}
                    className="touch-target rounded-full px-4 py-2 text-sm font-semibold"
                    style={{
                      backgroundColor: "var(--button-bg)",
                      color: "var(--button-text)",
                    }}
                  >
                    Save Privacy Settings
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Backup and AI Notes
                </p>
                <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Backups can be exported plain or encrypted with a passphrase.</li>
                  <li>Imports preview duplicates before they touch your journal.</li>
                  <li>Mood detection and natural-language retrieval remain intentionally reserved for later phases.</li>
                </ul>
                {lastExport ? (
                  <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    Last backup: {new Date(lastExport.timestamp).toLocaleString()} {lastExport.encrypted ? "(encrypted)" : ""}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <a href="/legal/privacy" className="text-xs" style={{ color: "var(--text-muted)" }}>Privacy policy</a>
                  <a href="/legal/terms" className="text-xs" style={{ color: "var(--text-muted)" }}>Terms of service</a>
                </div>
              </div>
            </div>

            {/* S3 Backup section */}
            <div
              className="pointer-events-auto mt-3 rounded-[28px] border px-5 py-5"
              style={{
                backgroundColor: "color-mix(in srgb, var(--surface) 92%, transparent)",
                borderColor: "var(--surface-border)",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>S3 Backup</p>
                <button
                  type="button"
                  onClick={loadSyncStatus}
                  className="rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{ border: "1px solid var(--surface-border)", color: "var(--text-secondary)", backgroundColor: "var(--button-secondary-bg)" }}
                >
                  Check status
                </button>
              </div>
              {syncStatus === null ? (
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  S3 backup keeps a copy of every entry in the AWS bucket configured for this Lumen deployment. Click "Check status" to see whether that backup target is available.
                </p>
              ) : syncStatus.enabled ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Backup enabled · Bucket: <span style={{ color: "var(--text-primary)" }}>{syncStatus.bucket || "—"}</span>
                    {syncStatus.region ? ` · ${syncStatus.region}` : ""}
                  </p>
                  <p className="text-xs" style={{ color: syncStatus.reachable ? "var(--text-muted)" : "#F28A8A" }}>
                    {syncStatus.reachable ? "S3 reachable" : "S3 unreachable — check deployment credentials or IAM permissions"}
                  </p>
                  {syncStatus.last_attempt ? (
                    <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Last backup attempt: {new Date(syncStatus.last_attempt.created_at).toLocaleString()}
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: syncStatus.last_attempt.status === "success" ? "var(--text-secondary)" : "#F28A8A" }}
                      >
                        {syncStatus.last_attempt.status === "success"
                          ? `Succeeded via ${syncStatus.last_attempt.scope === "full_sync" ? "full backup" : "automatic save"}`
                          : `Failed via ${syncStatus.last_attempt.scope === "full_sync" ? "full backup" : "automatic save"}`}
                        {syncStatus.last_attempt.entry_id ? ` · Entry ${syncStatus.last_attempt.entry_id}` : ""}
                      </p>
                      {syncStatus.last_attempt.error ? (
                        <p className="mt-1 text-xs" style={{ color: "#F28A8A" }}>
                          {syncStatus.last_attempt.error}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      No backup attempt has been recorded for this account yet.
                    </p>
                  )}
                  {auth?.session?.user?.role === "admin" || auth?.session?.user?.role === "superuser" ? (
                    <button
                      type="button"
                      onClick={handleFullSync}
                      disabled={isSyncing}
                      className="rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: "var(--button-bg)", color: "var(--button-text)" }}
                    >
                      {isSyncing ? "Syncing…" : "Run full backup now"}
                    </button>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Automatic backup runs after each save when deployment-managed S3 backup is enabled.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Deployment-managed S3 backup is not configured.
                </p>
              )}
            </div>

            {/* Account deletion */}
            <div
              className="pointer-events-auto mt-3 rounded-[28px] border px-5 py-5"
              style={{
                backgroundColor: "color-mix(in srgb, var(--surface) 92%, transparent)",
                borderColor: "var(--surface-border)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Danger zone</p>

              {/* Delete all entries */}
              <div className="mt-4 space-y-2">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Delete all entries (keep account)</p>
                {isDeleteEntriesOpen ? (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: "#F28A8A" }}>
                      This will permanently delete all {entries.length} entries. Type DELETE ALL ENTRIES to confirm.
                    </p>
                    <input
                      type="text"
                      value={deleteEntriesConfirm}
                      onChange={(e) => setDeleteEntriesConfirm(e.target.value)}
                      placeholder="DELETE ALL ENTRIES"
                      className="w-full rounded-2xl px-4 py-2 text-sm outline-none"
                      style={{ border: "1px solid #F28A8A", backgroundColor: "var(--surface-strong)", color: "var(--text-primary)" }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAllEntries}
                        disabled={deleteEntriesConfirm !== "DELETE ALL ENTRIES"}
                        className="rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40"
                        style={{ backgroundColor: "var(--button-danger-bg)", color: "var(--button-danger-text)" }}
                      >
                        Delete all entries
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsDeleteEntriesOpen(false); setDeleteEntriesConfirm(""); }}
                        className="rounded-full px-4 py-2 text-sm font-medium"
                        style={{ border: "1px solid var(--surface-border)", color: "var(--text-secondary)", backgroundColor: "var(--button-secondary-bg)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDeleteEntriesOpen(true)}
                    className="rounded-full px-4 py-2 text-sm font-medium"
                    style={{ border: "1px solid #F28A8A", color: "#F28A8A", backgroundColor: "transparent" }}
                  >
                    Delete all entries
                  </button>
                )}
              </div>

              {/* Delete account */}
              <div className="mt-5 space-y-2">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Delete account and all data</p>
                {isDeleteAccountOpen ? (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: "#F28A8A" }}>
                      This will permanently delete your account and all {entries.length} entries. This cannot be undone. Type DELETE MY ACCOUNT to confirm.
                    </p>
                    <input
                      type="text"
                      value={deleteAccountConfirm}
                      onChange={(e) => setDeleteAccountConfirm(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="w-full rounded-2xl px-4 py-2 text-sm outline-none"
                      style={{ border: "1px solid #F28A8A", backgroundColor: "var(--surface-strong)", color: "var(--text-primary)" }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountConfirm !== "DELETE MY ACCOUNT"}
                        className="rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40"
                        style={{ backgroundColor: "var(--button-danger-bg)", color: "var(--button-danger-text)" }}
                      >
                        Delete account
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsDeleteAccountOpen(false); setDeleteAccountConfirm(""); }}
                        className="rounded-full px-4 py-2 text-sm font-medium"
                        style={{ border: "1px solid var(--surface-border)", color: "var(--text-secondary)", backgroundColor: "var(--button-secondary-bg)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDeleteAccountOpen(true)}
                    className="rounded-full px-4 py-2 text-sm font-semibold"
                    style={{ backgroundColor: "var(--button-danger-bg)", color: "var(--button-danger-text)" }}
                  >
                    Delete account
                  </button>
                )}
              </div>
            </div>
            </>
          ) : null}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-8 pt-28 md:px-8 md:pb-10 md:pt-32">
        <StatsStrip reflectionSummary={reflectionSummary} />

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="hero-panel rounded-[32px] p-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Browse Your Journal
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {formatRangeLabel(startDate, endDate)} • {filteredEntries.length} matching entries
                </p>
              </div>
              <div className="inline-flex rounded-full p-1" style={{ backgroundColor: "var(--chip-bg)" }}>
                {["feed", "calendar", "timeline"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setViewMode(option)}
                    className="touch-target rounded-full px-3 py-1.5 text-xs font-semibold capitalize"
                    style={{
                      backgroundColor: viewMode === option ? "var(--chip-active-bg)" : "transparent",
                      color: viewMode === option ? "var(--chip-active-text)" : "var(--chip-text)",
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {primaryView}
          </div>

          {sideRail}
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          setEditorValues(null);
          setIsEditorOpen(true);
        }}
        className="fixed bottom-6 right-5 z-30 rounded-full px-5 py-4 text-sm font-semibold shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition hover:brightness-105 md:right-8"
        style={{
          backgroundColor: "var(--button-bg)",
          color: "var(--button-text)",
        }}
      >
        New Entry
      </button>

      {toast ? (
        <div
          className="fixed bottom-24 left-1/2 z-40 animate-toast-in rounded-full px-5 py-2.5 text-sm"
          style={{
            backgroundColor: "var(--surface-strong)",
            border: "1px solid var(--surface-border)",
            color: "var(--text-primary)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
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

      <ImportPreviewModal
        isOpen={isImportModalOpen}
        preview={importPreview}
        requiresPassphrase={requiresPassphrase}
        passphrase={importPassphrase}
        onPassphraseChange={setImportPassphrase}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportPayload(null);
          setImportEntriesBuffer([]);
          setImportPreview(null);
          setImportPassphrase("");
          setRequiresPassphrase(false);
        }}
        onConfirm={handleConfirmImport}
      />

      <EntryEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditorValues(null);
        }}
        onSave={handleEntryCreated}
        appearance={appearance}
        initialValues={editorValues}
        draftId="new-entry"
        heading="New Entry"
        saveLabel="Save Entry"
      />
    </main>
  );
}

export default HomePage;
