"use client";

import { useState } from "react";
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

  const handleExport = async (encrypted = false) => {
    setIsBusy(true);

    try {
      const passphrase =
        encrypted
          ? window.prompt("Enter a passphrase for the encrypted export:")
          : "";

      if (encrypted && !passphrase) {
        setIsBusy(false);
        return;
      }

      const result = await exportEntries({ encrypted, passphrase });

      downloadBlob(result.blob, result.fileName);
      onExport?.({
        count: result.entries.length,
        encrypted,
        fileName: result.fileName,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={isBusy}
        onClick={() => handleExport(false)}
        className="touch-target rounded-full px-4 py-2 text-sm font-medium transition"
        style={{
          border: "1px solid var(--surface-border)",
          backgroundColor: "var(--button-secondary-bg)",
          color: "var(--button-secondary-text)",
          opacity: isBusy ? 0.6 : 1,
        }}
      >
        {isBusy ? "Preparing..." : "Export"}
      </button>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => handleExport(true)}
        className="touch-target rounded-full px-4 py-2 text-sm font-medium transition"
        style={{
          border: "1px solid var(--surface-border)",
          backgroundColor: "var(--button-secondary-bg)",
          color: "var(--button-secondary-text)",
          opacity: isBusy ? 0.6 : 1,
        }}
      >
        Encrypted Export
      </button>
    </div>
  );
}

export default ExportButton;
