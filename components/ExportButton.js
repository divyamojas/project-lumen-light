"use client";

import { getEntries } from "../lib/storage";

export function ExportButton({ onExport }) {
  const handleExport = () => {
    const entries = getEntries();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `lumen_export_${dateStamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    onExport?.(entries.length);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded-full px-4 py-2 text-sm font-medium transition"
      style={{
        border: "1px solid var(--surface-border)",
        backgroundColor: "var(--button-secondary-bg)",
        color: "var(--button-secondary-text)",
      }}
    >
      Export
    </button>
  );
}

export default ExportButton;
