"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import ApiErrorSnackbar from "./ApiErrorSnackbar";

const labelFromRole = (role) => {
  if (role === "admin") {
    return "Admin";
  }

  return "User";
};

export function AuthDock() {
  const pathname = usePathname();
  const {
    session,
    isLoading,
    isSigningIn,
    isAdmin,
    signIn,
    signOut,
  } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState(null);

  const shouldHide =
    pathname === "/" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/");
  const isSignedIn = Boolean(session?.token);
  const statusLabel = useMemo(() => {
    if (isLoading) {
      return "Checking session";
    }

    if (!isSignedIn) {
      return "Signed out";
    }

    return "Connected";
  }, [isLoading, isSignedIn]);

  if (shouldHide) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    setError("");
    const result = await signIn(pathname === "/admin" ? "/admin" : pathname || "/app");

    if (result?.fallback) {
      setError("Backend Google auth is not available yet.");
      setApiError(result.errorInfo || null);
      setIsExpanded(true);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[calc(100%-2rem)] max-w-sm">
      <div
        className="rounded-[28px] border px-4 py-3 shadow-[0_24px_50px_rgba(14,18,26,0.18)] backdrop-blur-xl"
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface-strong) 88%, transparent)",
          borderColor: "var(--surface-border)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
              Access
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {statusLabel}
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {session?.user?.email || "Admin tools stay isolated from the journal UI."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="touch-target rounded-full px-4 py-2 text-sm font-medium interactive"
            style={{
              backgroundColor: "var(--button-secondary-bg)",
              color: "var(--button-secondary-text)",
              border: "1px solid var(--surface-border)",
            }}
          >
            {isExpanded ? "Close" : "Open"}
          </button>
        </div>

        {isExpanded ? (
          <div className="mt-4 space-y-3 animate-fade-in">
            {isSignedIn ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={{
                      backgroundColor: "var(--badge-bg)",
                      color: "var(--badge-text)",
                    }}
                  >
                    {labelFromRole(session?.user?.role)}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Bearer token is attached to backend requests.
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="rounded-full px-4 py-2 text-sm font-semibold"
                      style={{
                        backgroundColor: "var(--button-bg)",
                        color: "var(--button-text)",
                      }}
                    >
                      Open Admin
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={signOut}
                    className="rounded-full px-4 py-2 text-sm font-semibold"
                    style={{
                      backgroundColor: "var(--button-secondary-bg)",
                      color: "var(--button-secondary-text)",
                      border: "1px solid var(--surface-border)",
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full rounded-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--button-bg)",
                    color: "var(--button-text)",
                  }}
                >
                  {isSigningIn ? "Preparing sign-in..." : "Continue with Google"}
                </button>

                <div className="rounded-[22px] border px-3 py-3" style={{ borderColor: "var(--surface-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                    Backend-only auth
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                    This frontend does not authenticate with Supabase directly. Google sign-in must start from backend-managed endpoints.
                  </p>
                </div>
              </>
            )}

            {error ? (
              <p className="text-xs" style={{ color: "var(--button-danger-bg)" }}>
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <ApiErrorSnackbar error={apiError} onClose={() => setApiError(null)} />
    </div>
  );
}

export default AuthDock;
