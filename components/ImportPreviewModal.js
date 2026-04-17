"use client";

export function ImportPreviewModal({
  isOpen,
  preview,
  requiresPassphrase,
  passphrase,
  onPassphraseChange,
  onClose,
  onConfirm,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm md:items-center md:justify-center" style={{ backgroundColor: "var(--overlay)" }}>
      <button type="button" aria-label="Close import preview" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div
        className="relative z-10 w-full rounded-t-[28px] px-5 pb-6 pt-5 md:max-w-2xl md:rounded-[28px]"
        style={{
          backgroundColor: "var(--surface-strong)",
          border: "1px solid var(--surface-border)",
        }}
      >
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl" style={{ color: "var(--text-primary)" }}>
          Import Preview
        </h2>

        {requiresPassphrase ? (
          <div className="mt-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              This backup is encrypted. Enter its passphrase to preview and restore it.
            </p>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => onPassphraseChange?.(event.target.value)}
              placeholder="Passphrase"
              className="mt-4 w-full rounded-2xl px-4 py-3"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        ) : preview ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["Incoming", preview.totalIncoming],
                ["Valid", preview.validIncoming],
                ["Duplicates", preview.duplicateCount],
                ["Invalid", preview.invalidCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[24px] p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[24px] p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Previewing the first few entries
              </p>
              <div className="mt-3 space-y-3">
                {preview.previewItems.map((item) => (
                  <div key={item.id} className="rounded-2xl p-3" style={{ backgroundColor: "var(--surface-strong)", border: "1px solid var(--surface-border)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {item.title}
                      </p>
                      {item.duplicate ? (
                        <span className="rounded-full px-2 py-1 text-[11px]" style={{ backgroundColor: "var(--badge-bg)", color: "var(--badge-text)" }}>
                          Existing ID
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{
              border: "1px solid var(--surface-border)",
              backgroundColor: "var(--button-secondary-bg)",
              color: "var(--button-secondary-text)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--button-bg)",
              color: "var(--button-text)",
            }}
          >
            {requiresPassphrase ? "Unlock Preview" : "Import Backup"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportPreviewModal;
