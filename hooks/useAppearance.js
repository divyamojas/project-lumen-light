"use client";

import { useEffect, useState } from "react";
import { getUiMode, saveUiMode } from "../lib/storage";
import { resolveAppearance } from "../lib/utils";

export function useAppearance() {
  const [mode, setMode] = useState("auto");
  const [appearance, setAppearance] = useState("light");
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });

  useEffect(() => {
    setMode(getUiMode());
  }, []);

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
      () => setCoordinates({ latitude: null, longitude: null }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 1800000 }
    );
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyAppearance = () => {
      const next = resolveAppearance({
        mode,
        systemPrefersDark: mediaQuery.matches,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      setAppearance(next);
      document.documentElement.dataset.appearance = next;
    };

    applyAppearance();
    mediaQuery.addEventListener("change", applyAppearance);
    const intervalId = window.setInterval(applyAppearance, 60000);

    return () => {
      mediaQuery.removeEventListener("change", applyAppearance);
      window.clearInterval(intervalId);
    };
  }, [coordinates.latitude, coordinates.longitude, mode]);

  const handleModeChange = (nextMode) => {
    setMode(saveUiMode(nextMode));
  };

  return { mode, appearance, handleModeChange };
}

export default useAppearance;
