"use client";

import { useEffect, useRef, useState } from "react";
import { clearDraft, getDraft, saveDraft } from "../lib/storage";

export function EntryEditor({
  isOpen,
  onClose,
  onSave,
  appearance = "dark",
  initialValues,
  draftId = "new-entry",
  heading = "New Entry",
  saveLabel = "Save",
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState({ title: "", body: "" });
  const [draftStatus, setDraftStatus] = useState("");
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const loadedDraftRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setErrors({ title: "", body: "" });
      setDraftStatus("");
      loadedDraftRef.current = false;
      return;
    }

    const savedDraft = getDraft(draftId);
    const nextTitle = savedDraft ? savedDraft.title : initialValues?.title || "";
    const nextBody = savedDraft ? savedDraft.body : initialValues?.body || "";

    setTitle(nextTitle);
    setBody(nextBody);
    setDraftStatus(savedDraft ? "Draft restored." : "");
    loadedDraftRef.current = true;

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
  }, [draftId, initialValues?.body, initialValues?.title, isOpen]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [body, isOpen]);

  useEffect(() => {
    if (!isOpen || !loadedDraftRef.current) {
      return undefined;
    }

    window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      const hasContent = title.trim() || body.trim();

      if (!hasContent) {
        clearDraft(draftId);
        setDraftStatus("");
        return;
      }

      saveDraft(draftId, { title, body });
      setDraftStatus("Draft saved locally.");
    }, 250);

    return () => {
      window.clearTimeout(saveTimeoutRef.current);
    };
  }, [body, draftId, isOpen, title]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const nextErrors = {
      title: trimmedTitle ? "" : "Title is required.",
      body: trimmedBody ? "" : "Body is required.",
    };

    setErrors(nextErrors);

    if (nextErrors.title || nextErrors.body) {
      return;
    }

    const entry = onSave({
      title: trimmedTitle.slice(0, 100),
      body: trimmedBody,
    });

    clearDraft(draftId);
    setDraftStatus("");
    setTitle("");
    setBody("");
    return entry;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end backdrop-blur-sm" style={{ backgroundColor: "var(--overlay)" }}>
      <button
        type="button"
        aria-label="Close entry editor"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        className="relative z-10 w-full animate-sheet-up rounded-t-[28px] px-5 pb-6 pt-5 md:mx-auto md:mb-8 md:max-w-3xl md:rounded-[28px] md:px-7"
        style={{
          backgroundColor: "var(--surface-strong)",
          border: "1px solid var(--surface-border)",
          boxShadow:
            appearance === "light"
              ? "0 -24px 60px rgba(89, 79, 58, 0.16)"
              : "0 -24px 60px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div className="mx-auto mb-5 h-1.5 w-14 rounded-full md:hidden" style={{ backgroundColor: "var(--surface-border)" }} />
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl" style={{ color: "var(--text-primary)" }}>
              {heading}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {draftStatus || "Writing is saved locally while you type."}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 100))}
              placeholder="What's on your mind?"
              className="w-full rounded-2xl px-4 py-3 text-lg outline-none transition"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
            {errors.title ? <p className="mt-2 text-sm text-rose-300">{errors.title}</p> : null}
          </div>
          <div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write freely..."
              rows={7}
              className="max-h-[52vh] min-h-[220px] w-full overflow-y-auto rounded-2xl px-4 py-4 text-base leading-8 outline-none transition"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
            {errors.body ? <p className="mt-2 text-sm text-rose-300">{errors.body}</p> : null}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2.5 text-sm font-medium transition"
            style={{
              border: "1px solid var(--surface-border)",
              color: "var(--button-secondary-text)",
              backgroundColor: "var(--button-secondary-bg)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full px-5 py-2.5 text-sm font-semibold transition hover:brightness-110"
            style={{
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
            }}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EntryEditor;
