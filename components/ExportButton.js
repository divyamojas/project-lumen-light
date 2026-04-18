"use client";

import { useEffect, useRef, useState } from "react";
import { exportEntries } from "../lib/storage";

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export function ExportButton({ onExport }) {
  const [isBusy, setIsBusy] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseError, setPassphraseError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (showPassphraseModal) {
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [showPassphraseModal]);

  useEffect(() => {
    if (!showPassphraseModal) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleCloseModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPassphraseModal]);

  const handleCloseModal = () => {
    setShowPassphraseModal(false);
    setPassphrase("");
    setPassphraseError("");
  };

  const handleExportPlain = async () => {
    setIsBusy(true);

    try {
      const result = await exportEntries({ encrypted: false, passphrase: "" });
      downloadBlob(result.blob, result.fileName);
      onExport?.({ count: result.entries.length, encrypted: false, fileName: result.fileName });
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportEncrypted = async () => {
    const trimmed = passphrase.trim();

    if (!trimmed) {
      setPassphraseError("Passphrase is required.");
      inputRef.current?.focus();
      return;
    }

    handleCloseModal();
    setIsBusy(true);

    try {
      const result = await exportEntries({ encrypted: true, passphrase: trimmed });
      downloadBlob(result.blob, result.fileName);
      onExport?.({ count: result.entries.length, encrypted: true, fileName: result.fileName });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={handleExportPlain}
          className="interactive touch-target rounded-full px-4 py-2 text-sm font-medium transition"
          style={{
            border: "1px solid var(--surface-border)",
            backgroundColor: "var(--button-secondary-bg)",
            color: "var(--button-secondary-text)",
            opacity: isBusy ? 0.6 : 1,
          }}
          aria-disabled={isBusy}
        >
          {isBusy ? "Preparing…" : "Export"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => setShowPassphraseModal(true)}
          className="interactive touch-target rounded-full px-4 py-2 text-sm font-medium transition"
          style={{
            border: "1px solid var(--surface-border)",
            backgroundColor: "var(--button-secondary-bg)",
            color: "var(--button-secondary-text)",
            opacity: isBusy ? 0.6 : 1,
          }}
          aria-disabled={isBusy}
        >
          Encrypted Export
        </button>
      </div>

      {showPassphraseModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5 animate-fade-in"
          style={{ backgroundColor: "var(--overlay-strong)", backdropFilter: "blur(12px)" }}
        >
          <button
            type="button"
            aria-label="Close passphrase dialog"
            onClick={handleCloseModal}
            className="absolute inset-0 cursor-default"
          />
          <div
            className="relative z-10 w-full max-w-sm animate-scale-in rounded-[28px] px-6 py-7"
            style={{
              backgroundColor: "var(--surface-strong)",
              border: "1px solid var(--surface-border)",
              boxShadow: "0 32px 64px rgba(0, 0, 0, 0.28)",
            }}
          >
            <h2
              className="font-[family-name:var(--font-playfair)] text-2xl"
              style={{ color: "var(--text-primary)" }}
            >
              Encrypted Export
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              Set a passphrase to lock your backup. You'll need the same passphrase to restore it.
            </p>
            <input
              ref={inputRef}
              type="password"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setPassphraseError("");
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleExportEncrypted(); }}
              placeholder="Passphrase"
              className="mt-5 w-full rounded-2xl px-4 py-3 text-base outline-none transition"
              style={{
                border: `1px solid ${passphraseError ? "var(--button-danger-bg)" : "var(--surface-border)"}`,
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
            {passphraseError ? (
              <p className="mt-2 text-sm" style={{ color: "var(--button-danger-bg)" }}>
                {passphraseError}
              </p>
            ) : null}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="interactive flex-1 rounded-full px-4 py-2.5 text-sm font-medium"
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
                onClick={handleExportEncrypted}
                className="interactive flex-1 rounded-full px-4 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: "var(--button-bg)",
                  color: "var(--button-text)",
                }}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ExportButton;
