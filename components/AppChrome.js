"use client";

import { useEffect, useState } from "react";
import { getPrivacySettings, verifyPasscode } from "../lib/storage";

export function AppChrome({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [privacySettings, setPrivacySettings] = useState(() => getPrivacySettings());
  const [isLocked, setIsLocked] = useState(() => getPrivacySettings().requireUnlock);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPrivacySettings(getPrivacySettings());
    setIsLocked(getPrivacySettings().requireUnlock);
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => {
      const nextSettings = getPrivacySettings();

      setPrivacySettings(nextSettings);

      if (document.visibilityState === "hidden" && nextSettings.requireUnlock && nextSettings.blurOnBackground) {
        setIsLocked(true);
        setPasscode("");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleUnlock = async () => {
    const valid = await verifyPasscode(passcode);

    if (!valid) {
      setError("That passcode did not match.");
      return;
    }

    setError("");
    setPasscode("");
    setIsLocked(false);
  };

  return (
    <>
      {!isOnline ? (
        <div
          className="sticky top-0 z-[70] flex items-center justify-center px-4 py-2 text-sm"
          style={{
            backgroundColor: "var(--offline-bg)",
            color: "var(--offline-text)",
            borderBottom: "1px solid var(--surface-border)",
          }}
        >
          Offline mode is active. Your journal stays available on this device.
        </div>
      ) : null}

      <div
        aria-hidden={isLocked}
        style={{
          filter: isLocked ? "blur(22px)" : "none",
          pointerEvents: isLocked ? "none" : "auto",
          userSelect: isLocked ? "none" : "auto",
          transition: "filter 220ms ease",
        }}
      >
        {children}
      </div>

      {isLocked ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center px-5"
          style={{
            backgroundColor: "var(--overlay-strong)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div
            className="w-full max-w-sm rounded-[30px] px-6 py-7"
            style={{
              backgroundColor: "var(--surface-strong)",
              border: "1px solid var(--surface-border)",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.24)",
            }}
          >
            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--text-secondary)" }}>
              Private Journal
            </p>
            <h2
              className="mt-3 font-[family-name:var(--font-playfair)] text-3xl"
              style={{ color: "var(--text-primary)" }}
            >
              Unlock Lumen
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {privacySettings.passcodeHint
                ? `Hint: ${privacySettings.passcodeHint}`
                : "Enter your local passcode to continue."}
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value);
                setError("");
              }}
              placeholder="Passcode"
              className="mt-5 w-full rounded-2xl px-4 py-3 text-base outline-none"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            <button
              type="button"
              onClick={handleUnlock}
              className="mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110"
              style={{
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
              }}
            >
              Unlock
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default AppChrome;
