"use client";

import { useMemo, useRef, useState, useEffect } from "react";
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
  updateEntry,
} from "../../../lib/storage";
import { findOnThisDayEntries, findRelatedEntries } from "../../../lib/journal.mjs";
import { useAppearance } from "../../../hooks/useAppearance";

const REFRESH_DEBOUNCE_MS = 12000;
const TOAST_DURATION_MS = 3200;

export default function EntryPage({ params }) {
  const router = useRouter();
  const [entry, setEntry] = useState(null);
  const [allEntries, setAllEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorValues, setEditorValues] = useState(null);
  const [editorMode, setEditorMode] = useState("edit");
  const [toast, setToast] = useState("");
  const lastRefreshAtRef = useRef(0);

  const { mode, appearance, handleModeChange } = useAppearance();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      const [nextEntry, nextEntries] = await Promise.all([getEntryById(params.id), getEntries()]);

      if (!isMounted) {
        return;
      }

      setEntry(nextEntry);
      setAllEntries(nextEntries);
      lastRefreshAtRef.current = Date.now();
      setIsLoading(false);
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

    const timeoutId = window.setTimeout(() => setToast(""), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
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

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/app");
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
    router.push("/app");
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

  if (isLoading) {
    return (
      <main
        className="min-h-screen px-5 pb-24 pt-6 md:px-8 md:pt-8"
        style={{
          background:
            "radial-gradient(circle at top left, color-mix(in srgb, var(--app-bg-secondary) 48%, transparent), transparent 42%), linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 72%, var(--app-bg-secondary)) 100%)",
        }}
      >
        <div className="mx-auto w-full max-w-5xl">
          <div className="skeleton mb-8 h-12 w-40 rounded-full" />
          <div className="skeleton h-[420px] w-full rounded-[30px]" />
          <div className="mt-8 flex justify-end gap-3">
            <div className="skeleton h-10 w-36 rounded-full" />
            <div className="skeleton h-10 w-24 rounded-full" />
            <div className="skeleton h-10 w-24 rounded-full" />
          </div>
        </div>
      </main>
    );
  }

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
        <div className="animate-fade-in">
          <p
            className="font-[family-name:var(--font-playfair)] text-2xl"
            style={{ color: "var(--text-primary)" }}
          >
            Entry not found
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            This entry may have been deleted or the link is incorrect.
          </p>
          <button
            type="button"
            onClick={() => router.push("/app")}
            className="interactive mt-6 rounded-full px-5 py-2.5 text-sm font-medium transition"
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
            relatedEntryIds: entry.relatedEntryIds,
            journal_type: entry.journal_type,
            type_metadata: entry.type_metadata,
            theme: entry.theme,
          });
          setEditorMode("edit");
          setIsEditorOpen(true);
        }}
        onReflect={handleReflect}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onCancelDelete={() => setIsConfirmingDelete(false)}
        appearance={appearance}
        mode={mode}
        onModeChange={handleModeChange}
        relatedEntries={relatedEntries}
        onThisDayEntries={onThisDayEntries}
      />

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-40 animate-toast-in rounded-full px-5 py-2.5 text-sm shadow-lg"
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
