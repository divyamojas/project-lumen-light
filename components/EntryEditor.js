"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  JOURNAL_PROMPTS,
  JOURNAL_TEMPLATES,
  normalizeTag,
  resolveEntryEditorRelatedIds,
} from "../lib/journal.mjs";
import { getExtraFields, getJournalType, getTemplates } from "../lib/journalTypes";
import { clearDraft, getDraft, getDefaultJournalType, getEnabledJournalTypes, saveDraft, setDefaultJournalType } from "../lib/storage";
import { THEMES } from "../lib/themes";

const markdownActions = [
  { label: "H1", prefix: "# ", suffix: "", placeholder: "Heading" },
  { label: "Bold", prefix: "**", suffix: "**", placeholder: "bold text" },
  { label: "Italic", prefix: "_", suffix: "_", placeholder: "italic text" },
  { label: "Quote", prefix: "> ", suffix: "", placeholder: "Quoted thought" },
  { label: "Bullet", prefix: "- ", suffix: "", placeholder: "List item" },
  { label: "Check", prefix: "- [ ] ", suffix: "", placeholder: "Checklist item" },
];

const parseTagsInput = (value) => {
  return value
    .split(",")
    .map(normalizeTag)
    .filter(Boolean)
    .slice(0, 8);
};

export function TypeMetadataFields({ journalType, metadata, onChange }) {
  const extraFields = getExtraFields(journalType);

  if (!extraFields.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        {getJournalType(journalType).label} details
      </p>
      {extraFields.map((field) => {
        const value = metadata[field.key] ?? "";
        const sharedStyle = {
          border: "1px solid var(--surface-border)",
          backgroundColor: "var(--surface)",
          color: "var(--text-primary)",
        };
        if (field.type === "textarea") {
          return (
            <div key={field.key}>
              <label className="mb-1 block text-xs" style={{ color: "var(--text-secondary)" }}>
                {field.label}
              </label>
              <textarea
                value={value}
                onChange={(e) => onChange({ ...metadata, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                rows={3}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={sharedStyle}
              />
            </div>
          );
        }
        return (
          <div key={field.key}>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-secondary)" }}>
              {field.label}
            </label>
            <input
              type={field.type === "number" ? "number" : "text"}
              value={value}
              onChange={(e) => onChange({ ...metadata, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={sharedStyle}
            />
          </div>
        );
      })}
    </div>
  );
}

export function EntryEditor({
  isOpen,
  onClose,
  onSave,
  appearance = "dark",
  initialValues,
  draftId = "new-entry",
  heading = "New Entry",
  saveLabel = "Save",
  relatedEntries = [],
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [collection, setCollection] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [errors, setErrors] = useState({ title: "", body: "" });
  const [draftStatus, setDraftStatus] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(null);
  const [journalType, setJournalType] = useState("personal");
  const [typeMetadata, setTypeMetadata] = useState({});
  const [theme, setTheme] = useState("neutral");
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const loadedDraftRef = useRef(false);

  const enabledTypes = useMemo(() => getEnabledJournalTypes(), []);
  const characterCount = `${title.length + body.length} chars`;
  const parsedTags = useMemo(() => parseTagsInput(tagsInput), [tagsInput]);
  const resolvedRelatedEntryIds = useMemo(() => {
    return resolveEntryEditorRelatedIds(initialValues?.relatedEntryIds, relatedEntries);
  }, [initialValues?.relatedEntryIds, relatedEntries]);

  const typeTemplates = useMemo(() => {
    const jt = getJournalType(journalType);
    return [
      { id: "blank", label: "Blank" },
      ...JOURNAL_TEMPLATES.filter((t) => t.id !== "blank"),
      ...jt.templates.map((t) => ({ ...t, id: `type-${t.id}` })),
    ];
  }, [journalType]);

  const applyValues = (values) => {
    setTitle(values?.title || "");
    setBody(values?.body || "");
    setTagsInput((values?.tags || []).join(", "));
    setCollection(values?.collection || "");
    setFavorite(Boolean(values?.favorite));
    setPinned(Boolean(values?.pinned));
    setSelectedTemplate(values?.templateId || "blank");
    setSelectedPrompt(values?.promptId || "");
    setJournalType(values?.journal_type || getDefaultJournalType());
    setTypeMetadata(values?.type_metadata || {});
    setTheme(values?.theme || "neutral");
  };

  useEffect(() => {
    if (!isOpen) {
      setErrors({ title: "", body: "" });
      setDraftStatus("");
      setRestoredDraft(null);
      loadedDraftRef.current = false;
      return;
    }

    const savedDraft = getDraft(draftId);

    if (savedDraft) {
      setRestoredDraft(savedDraft);
      applyValues(initialValues || {});
      setDraftStatus("Draft available to restore.");
    } else {
      applyValues(initialValues || {});
      setDraftStatus("");
    }

    loadedDraftRef.current = true;

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, initialValues, isOpen]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [body, isOpen]);

  useEffect(() => {
    if (!isOpen || !loadedDraftRef.current || restoredDraft) {
      return undefined;
    }

    window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      const hasContent = title.trim() || body.trim() || parsedTags.length || collection.trim();

      if (!hasContent) {
        clearDraft(draftId);
        setDraftStatus("");
        return;
      }

      saveDraft(draftId, {
        title,
        body,
        tags: parsedTags,
        collection,
        favorite,
        pinned,
        templateId: selectedTemplate,
        promptId: selectedPrompt,
        relatedEntryIds: resolvedRelatedEntryIds,
        journal_type: journalType,
        type_metadata: typeMetadata,
        theme,
      });
      setDraftStatus("Draft saved locally.");
    }, 320);

    return () => {
      window.clearTimeout(saveTimeoutRef.current);
    };
  }, [
    body,
    collection,
    draftId,
    favorite,
    isOpen,
    journalType,
    parsedTags,
    pinned,
    resolvedRelatedEntryIds,
    restoredDraft,
    selectedPrompt,
    selectedTemplate,
    theme,
    title,
    typeMetadata,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        document.getElementById("editor-save-action")?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const insertMarkdown = ({ prefix, suffix, placeholder }) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = body.slice(selectionStart, selectionEnd) || placeholder;
    const nextValue =
      body.slice(0, selectionStart) +
      prefix +
      selectedText +
      suffix +
      body.slice(selectionEnd);

    setBody(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursorPosition = selectionStart + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const handleApplyTemplate = (templateId) => {
    if (templateId.startsWith("type-")) {
      const realId = templateId.slice(5);
      const jt = getJournalType(journalType);
      const template = jt.templates.find((t) => t.id === realId);
      if (template) {
        setSelectedTemplate(templateId);
        if (!body.trim()) setBody(template.body);
      }
      return;
    }

    const template = JOURNAL_TEMPLATES.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setSelectedTemplate(templateId);

    if (!title.trim() && template.title) {
      setTitle(template.title);
    }

    if (!body.trim() && template.body) {
      setBody(template.body);
    }
  };

  const handleApplyPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setBody((currentValue) => {
      const spacer = currentValue.trim() ? "\n\n" : "";
      return `${currentValue}${spacer}${prompt}\n`;
    });
  };

  const handleJournalTypeChange = (nextType) => {
    setJournalType(nextType);
    setDefaultJournalType(nextType);
    setTypeMetadata({});
  };

  const handleSave = async () => {
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

    const entry = await onSave({
      title: trimmedTitle.slice(0, 100),
      body: trimmedBody,
      tags: parsedTags,
      collection: collection.trim(),
      favorite,
      pinned,
      templateId: selectedTemplate,
      promptId: selectedPrompt,
      relatedEntryIds: resolvedRelatedEntryIds,
      journal_type: journalType,
      type_metadata: typeMetadata,
      theme,
    });

    if (!entry) {
      return;
    }

    clearDraft(draftId);
    setDraftStatus("");
    setRestoredDraft(null);
    setTitle("");
    setBody("");
    setTagsInput("");
    setCollection("");
    setFavorite(false);
    setPinned(false);
    setTypeMetadata({});
    setTheme("neutral");
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end overflow-y-auto backdrop-blur-sm md:items-end" style={{ backgroundColor: "var(--overlay)" }}>
      <button
        type="button"
        aria-label="Close entry editor"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        className="relative z-10 flex max-h-[92dvh] w-full flex-col animate-sheet-up rounded-t-[28px] px-5 pb-5 pt-5 md:mx-auto md:mb-8 md:max-w-4xl md:rounded-[28px] md:px-7"
        style={{
          backgroundColor: "var(--surface-strong)",
          border: "1px solid var(--surface-border)",
          boxShadow:
            appearance === "light"
              ? "0 -24px 60px rgba(89, 79, 58, 0.16)"
              : "0 -24px 60px rgba(0, 0, 0, 0.35)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
        }}
      >
        <div className="mx-auto mb-5 h-1.5 w-14 rounded-full md:hidden" style={{ backgroundColor: "var(--surface-border)" }} />

        <div className="mb-4 rounded-[24px] pb-2 pt-1" style={{ backgroundColor: "var(--surface-strong)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl" style={{ color: "var(--text-primary)" }}>
                {heading}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {draftStatus || "Writing is saved locally while you type."}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>{characterCount}</span>
              <span>Cmd/Ctrl+S to save</span>
            </div>
          </div>
        </div>

        {/* Journal type picker */}
        {enabledTypes.length > 1 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {enabledTypes.map((typeId) => {
              const jt = getJournalType(typeId);
              const isActive = journalType === typeId;
              return (
                <button
                  key={typeId}
                  type="button"
                  onClick={() => handleJournalTypeChange(typeId)}
                  className="touch-target inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    backgroundColor: isActive ? "var(--button-bg)" : "var(--button-secondary-bg)",
                    color: isActive ? "var(--button-text)" : "var(--button-secondary-text)",
                    border: isActive ? "none" : "1px solid var(--surface-border)",
                  }}
                >
                  <span aria-hidden="true">{jt.icon}</span>
                  {jt.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {restoredDraft ? (
          <div
            className="mb-4 rounded-[24px] p-4"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--surface-border)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              A saved draft is available for this entry.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  applyValues(restoredDraft);
                  setDraftStatus("Draft restored.");
                  setRestoredDraft(null);
                }}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "var(--button-bg)",
                  color: "var(--button-text)",
                }}
              >
                Restore draft
              </button>
              <button
                type="button"
                onClick={() => {
                  clearDraft(draftId);
                  setRestoredDraft(null);
                  setDraftStatus("Saved draft dismissed.");
                }}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "var(--button-secondary-bg)",
                  border: "1px solid var(--surface-border)",
                  color: "var(--button-secondary-text)",
                }}
              >
                Discard draft
              </button>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={collection}
                onChange={(event) => setCollection(event.target.value.slice(0, 40))}
                placeholder="Collection"
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                style={{
                  border: "1px solid var(--surface-border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                }}
              />
              <div className="relative">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="Tags, comma separated"
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    border: `1px solid ${parsedTags.length >= 8 ? "var(--accent)" : "var(--surface-border)"}`,
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                  }}
                />
                {parsedTags.length >= 8 && (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: "var(--accent)" }}
                  >
                    8 max
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select
              value={selectedTemplate}
              onChange={(event) => handleApplyTemplate(event.target.value)}
              className="rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            >
              {typeTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  Template: {template.label}
                </option>
              ))}
            </select>

            <select
              value={selectedPrompt}
              onChange={(event) => handleApplyPrompt(event.target.value)}
              className="rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">Add a reflection prompt</option>
              {JOURNAL_PROMPTS.map((prompt) => (
                <option key={prompt} value={prompt}>
                  {prompt}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFavorite((currentValue) => !currentValue)}
                className="touch-target rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: favorite ? "var(--button-bg)" : "var(--button-secondary-bg)",
                  color: favorite ? "var(--button-text)" : "var(--button-secondary-text)",
                  border: favorite ? "none" : "1px solid var(--surface-border)",
                }}
              >
                Favorite
              </button>
              <button
                type="button"
                onClick={() => setPinned((currentValue) => !currentValue)}
                className="touch-target rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: pinned ? "var(--button-bg)" : "var(--button-secondary-bg)",
                  color: pinned ? "var(--button-text)" : "var(--button-secondary-text)",
                  border: pinned ? "none" : "1px solid var(--surface-border)",
                }}
              >
                Pin
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {markdownActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => insertMarkdown(action)}
                className="rounded-full px-3 py-2 text-xs font-semibold"
                style={{
                  border: "1px solid var(--surface-border)",
                  backgroundColor: "var(--button-secondary-bg)",
                  color: "var(--button-secondary-text)",
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write freely..."
              rows={8}
              className="max-h-[48vh] min-h-[220px] w-full overflow-y-auto rounded-2xl px-4 py-4 text-base leading-8 outline-none transition"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
            {errors.body ? <p className="mt-2 text-sm text-rose-300">{errors.body}</p> : null}
          </div>

          {/* Type-specific extra fields */}
          <TypeMetadataFields
            journalType={journalType}
            metadata={typeMetadata}
            onChange={setTypeMetadata}
          />

          {/* Mood picker */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
              Mood
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(THEMES).map(([key, themeData]) => {
                const isActive = theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key === theme ? "neutral" : key)}
                    className="touch-target inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                    style={{
                      backgroundColor: isActive ? "var(--button-bg)" : "var(--button-secondary-bg)",
                      color: isActive ? "var(--button-text)" : "var(--button-secondary-text)",
                      border: isActive ? "none" : "1px solid var(--surface-border)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: themeData.accent }}
                    />
                    {themeData.label}
                  </button>
                );
              })}
            </div>
          </div>

          {parsedTags.length ? (
            <div className="flex flex-wrap gap-2">
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-xs"
                  style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t pt-4" style={{ borderColor: "var(--surface-border)" }}>
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
            id="editor-save-action"
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
