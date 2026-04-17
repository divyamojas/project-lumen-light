"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EntryDetail from "../../../components/EntryDetail";
import EntryEditor from "../../../components/EntryEditor";
import {
  clearDraft,
  createEntry,
  deleteEntry,
  duplicateEntry,
  getEntries,
  getEntriesFresh,
  getEntryById,
  getUiMode,
  saveUiMode,
  updateEntry,
} from "../../../lib/storage";
import { findOnThisDayEntries, findRelatedEntries } from "../../../lib/journal.mjs";
import { resolveAppearance } from "../../../lib/utils";

const REFRESH_DEBOUNCE_MS = 12000;

export default function EntryPage({ params }) {
  const router = useRouter();
  const [entry, setEntry] = useState(null);
  const [allEntries, setAllEntries] = useState([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorValues, setEditorValues] = useState(null);
  const [editorMode, setEditorMode] = useState("edit");
  const [toast, setToast] = useState("");
  const [mode, setMode] = useState("auto");
  const [appearance, setAppearance] = useState("light");
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [nextEntry, nextEntries] = await Promise.all([getEntryById(params.id), getEntries()]);

      if (!isMounted) {
        return;
      }

      setEntry(nextEntry);
      setAllEntries(nextEntries);
      setMode(getUiMode());
      lastRefreshAtRef.current = Date.now();
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

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
    const refreshEntry = async () => {
      const [nextEntry, nextEntries] = await Promise.all([
        getEntryById(params.id, { force: true }),
        getEntriesFresh(),
      ]);
      setEntry(nextEntry);
      setAllEntries(nextEntries);
      lastRefreshAtRef.current = Date.now();
    };

    const refreshIfStale = () => {
      if (Date.now() - lastRefreshAtRef.current < REFRESH_DEBOUNCE_MS) {
        return;
      }

      refreshEntry();
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
  }, [params.id]);

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

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  const handleDelete = async () => {
    if (!entry) {
      return;
    }

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    clearDraft(`edit-${entry.id}`);
    await deleteEntry(entry.id);
    router.push("/");
    router.refresh();
  };

  const handleUpdate = async (values) => {
    const updatedEntry = await updateEntry(params.id, values);

    if (!updatedEntry) {
      setToast("This entry could not be updated.");
      return null;
    }

    const nextEntries = await getEntries();
    setEntry(updatedEntry);
    setAllEntries(nextEntries);
    setIsEditorOpen(false);
    setToast("Entry updated.");
    setIsConfirmingDelete(false);
    return updatedEntry;
  };

  const handleDuplicate = async () => {
    const duplicated = await duplicateEntry(params.id);

    if (!duplicated) {
      return;
    }

    setToast("Duplicate created.");
    router.push(`/entry/${duplicated.id}`);
  };

  const handleReflect = () => {
    if (!entry) {
      return;
    }

    setEditorValues({
      title: `Follow-up: ${entry.title}`,
      body: `Following up on "${entry.title}" from ${new Date(entry.createdAt).toLocaleDateString("en-US")}.\n\nWhat has changed?\n\nWhat still feels unresolved?\n`,
      tags: entry.tags || [],
      collection: entry.collection || "",
      favorite: false,
      pinned: false,
      templateId: "follow-up",
      promptId: "",
      relatedEntryIds: [entry.id],
    });
    setEditorMode("reflect");
    setIsEditorOpen(true);
  };

  const handleCreateReflection = async (values) => {
    const created = await createEntry(values);

    if (!created) {
      return null;
    }

    setToast("Follow-up saved.");
    router.push(`/entry/${created.id}`);
    return created;
  };

  const relatedEntries = useMemo(() => {
    return entry ? findRelatedEntries(entry, allEntries) : [];
  }, [allEntries, entry]);

  const onThisDayEntries = useMemo(() => {
    return entry ? findOnThisDayEntries(entry, allEntries) : [];
  }, [allEntries, entry]);

  if (!entry) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-5 text-center transition-colors duration-500"
        style={{
          background:
            "radial-gradient(circle at top left, color-mix(in srgb, var(--app-bg-secondary) 48%, transparent), transparent 42%), linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 72%, var(--app-bg-secondary)) 100%)",
          color: "var(--text-secondary)",
        }}
      >
        <div>
          <p
            className="font-[family-name:var(--font-playfair)] text-2xl"
            style={{ color: "var(--text-primary)" }}
          >
            Entry not found
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 rounded-full px-4 py-2 text-sm transition"
            style={{
              border: "1px solid var(--surface-border)",
              color: "var(--button-secondary-text)",
              backgroundColor: "var(--button-secondary-bg)",
            }}
          >
            Return Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <EntryDetail
        entry={entry}
        isConfirmingDelete={isConfirmingDelete}
        onBack={handleBack}
        onEdit={() => {
          setEditorValues({
            title: entry.title,
            body: entry.body,
            tags: entry.tags,
            collection: entry.collection,
            favorite: entry.favorite,
            pinned: entry.pinned,
            templateId: entry.templateId,
            promptId: entry.promptId,
          });
          setEditorMode("edit");
          setIsEditorOpen(true);
        }}
        onReflect={handleReflect}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        appearance={appearance}
        mode={mode}
        onModeChange={handleModeChange}
        relatedEntries={relatedEntries}
        onThisDayEntries={onThisDayEntries}
      />

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg"
          style={{
            backgroundColor: "var(--surface-strong)",
            border: "1px solid var(--surface-border)",
            color: "var(--text-primary)",
          }}
        >
          {toast}
        </div>
      ) : null}

      <EntryEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditorValues(null);
          setEditorMode("edit");
        }}
        onSave={editorMode === "reflect" ? handleCreateReflection : handleUpdate}
        appearance={appearance}
        initialValues={editorValues}
        draftId={editorMode === "reflect" ? `reflect-${entry.id}` : `edit-${entry.id}`}
        heading={editorMode === "reflect" ? "Follow-up Reflection" : "Edit Entry"}
        saveLabel={editorMode === "reflect" ? "Save Reflection" : "Save Changes"}
        relatedEntries={entry ? [entry] : []}
      />
    </>
  );
}
