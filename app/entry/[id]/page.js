"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EntryDetail from "../../../components/EntryDetail";
import { deleteEntry, getEntryById, getUiMode, saveUiMode } from "../../../lib/storage";
import { resolveAppearance } from "../../../lib/utils";

export default function EntryPage({ params }) {
  const router = useRouter();
  const [entry, setEntry] = useState(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [mode, setMode] = useState("auto");
  const [appearance, setAppearance] = useState("light");
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });

  useEffect(() => {
    setEntry(getEntryById(params.id));
    setMode(getUiMode());
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

  const handleDelete = () => {
    if (!entry) {
      return;
    }

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    deleteEntry(entry.id);
    router.push("/");
  };

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
    <EntryDetail
      entry={entry}
      isConfirmingDelete={isConfirmingDelete}
      onBack={handleBack}
      onDelete={handleDelete}
      appearance={appearance}
      mode={mode}
      onModeChange={handleModeChange}
    />
  );
}
