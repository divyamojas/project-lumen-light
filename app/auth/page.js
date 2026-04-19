"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ApiErrorSnackbar from "../../components/ApiErrorSnackbar";
import { useAuth } from "../../components/AuthProvider";
import { useAppearance } from "../../hooks/useAppearance";
import { buildErrorReport } from "../../lib/storage";

const AUTH_MODES = [
  { id: "login", label: "Log in" },
  { id: "signup", label: "Sign up" },
  { id: "reset", label: "Reset password" },
];

const sanitizeNextPath = (value) => {
  return typeof value === "string" && value.startsWith("/") ? value : "/app";
};

const AUTH_ERROR_MESSAGES = {
  over_email_send_rate_limit: "Too many signup emails were requested. Please wait a few minutes and try again.",
  email_rate_limit_exceeded: "Too many email attempts were made. Please wait a few minutes and try again.",
  invalid_credentials: "The email or password is incorrect.",
  email_not_confirmed: "Please confirm your email address before signing in.",
  user_already_exists: "An account with this email already exists.",
  user_already_registered: "An account with this email already exists.",
  weak_password: "Choose a stronger password and try again.",
};

const normalizeErrorText = (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeErrorText(item))
      .filter(Boolean)
      .join(", ");
  }

  if (value && typeof value === "object") {
    return (
      normalizeErrorText(value.msg) ||
      normalizeErrorText(value.message) ||
      normalizeErrorText(value.detail) ||
      JSON.stringify(value)
    );
  }

  return "";
};

const resolveAuthErrorMessage = (authError) => {
  const errorCode =
    authError?.details?.error_code ||
    authError?.details?.code ||
    authError?.details?.detail?.error_code ||
    authError?.details?.detail?.code ||
    "";

  if (typeof errorCode === "string" && AUTH_ERROR_MESSAGES[errorCode]) {
    return AUTH_ERROR_MESSAGES[errorCode];
  }

  if (authError?.status === 429) {
    return "Too many requests were made. Please wait a few minutes and try again.";
  }

  return (
    normalizeErrorText(authError?.details?.message) ||
    normalizeErrorText(authError?.details?.detail) ||
    normalizeErrorText(authError?.details) ||
    authError?.message ||
    "Authentication failed."
  );
};

export function AuthPage() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode, handleModeChange } = useAppearance();
  const nextPath = useMemo(() => sanitizeNextPath(searchParams?.get("next")), [searchParams]);
  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      router.replace(nextPath);
    }
  }, [auth.isAuthenticated, auth.isLoading, nextPath, router]);

  const handleGoogleSignIn = async () => {
    setError("");
    setNotice("");
    setApiError(null);

    const result = await auth.signIn(nextPath);

    if (result?.fallback) {
      setError("Google sign-in is not available from the backend yet.");
      setApiError(result.errorInfo || null);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setNotice("");
    setApiError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (authMode !== "reset" && !password) {
      setError("Password is required.");
      return;
    }

    if (authMode === "signup" && !name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      if (authMode === "login") {
        await auth.signInWithEmail({
          email,
          password,
          redirectPath: nextPath,
        });
        router.replace(nextPath);
        return;
      }

      if (authMode === "signup") {
        const result = await auth.signUpWithEmail({
          name,
          email,
          password,
          redirectPath: nextPath,
        });

        if (result?.pendingVerification) {
          setAuthMode("login");
          setPassword("");
          setNotice(result.message || "Account created. Finish verification, then sign in.");
          return;
        }

        router.replace(nextPath);
        return;
      }

      await auth.resetPassword({ email });
      setNotice("If that account exists, a password reset message has been requested.");
    } catch (authError) {
      setError(resolveAuthErrorMessage(authError));
      setApiError(buildErrorReport(authError, "Authentication failed."));
    }
  };

  return (
    <main
      className="min-h-screen px-4 py-8 md:px-8"
      style={{
        background:
          "radial-gradient(circle at top left, color-mix(in srgb, var(--app-bg-secondary) 48%, transparent), transparent 42%), linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--app-bg) 72%, var(--app-bg-secondary)) 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <section
          className="w-full max-w-xl rounded-[36px] border px-6 py-8 shadow-[0_24px_60px_rgba(0,0,0,0.12)] md:px-8 md:py-9"
          style={{
            borderColor: "var(--surface-border)",
            backgroundColor: "color-mix(in srgb, var(--surface-strong) 94%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
                Lumen
              </p>
              <h1
                className="mt-3 font-[family-name:var(--font-playfair)] text-4xl leading-tight md:text-5xl"
                style={{ color: "var(--text-primary)" }}
              >
                Sign in to continue
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                Your journal opens after authentication. Pick the appearance you want for this device, then log in, create an account, or request a password reset.
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                Appearance
              </p>
              <div className="mt-2 inline-flex rounded-full p-1" style={{ backgroundColor: "var(--chip-bg)" }}>
                {["auto", "light", "dark"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleModeChange(option)}
                    className="touch-target rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
                    style={{
                      backgroundColor: mode === option ? "var(--chip-active-bg)" : "transparent",
                      color: mode === option ? "var(--chip-active-text)" : "var(--chip-text)",
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {AUTH_MODES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setAuthMode(option.id);
                  setError("");
                  setNotice("");
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{
                  backgroundColor: authMode === option.id ? "var(--chip-active-bg)" : "var(--chip-bg)",
                  color: authMode === option.id ? "var(--chip-active-text)" : "var(--chip-text)",
                  border: `1px solid ${authMode === option.id ? "transparent" : "var(--surface-border)"}`,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
              {authMode === "login" ? "Welcome back" : authMode === "signup" ? "Create access" : "Reset access"}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-3xl" style={{ color: "var(--text-primary)" }}>
              {authMode === "login" ? "Enter your account" : authMode === "signup" ? "Set up your account" : "Request a reset"}
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              {authMode === "login"
                ? "Sign in with email and password, or use Google if your backend exposes it."
                : authMode === "signup"
                  ? "Create a new account to unlock the journal."
                  : "Enter the email tied to your account and we’ll call the backend reset endpoint."}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {authMode === "signup" ? (
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-[22px] px-4 py-3 text-base outline-none"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--surface-border)",
                  color: "var(--text-primary)",
                }}
              />
            ) : null}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="w-full rounded-[22px] px-4 py-3 text-base outline-none"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--surface-border)",
                color: "var(--text-primary)",
              }}
            />

            {authMode !== "reset" ? (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSubmit();
                  }
                }}
                placeholder={authMode === "signup" ? "Create a password" : "Password"}
                className="w-full rounded-[22px] px-4 py-3 text-base outline-none"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--surface-border)",
                  color: "var(--text-primary)",
                }}
              />
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={auth.isSigningIn}
              className="w-full rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: "var(--button-bg)",
                color: "var(--button-text)",
              }}
            >
              {auth.isSigningIn
                ? "Working..."
                : authMode === "login"
                  ? "Log in"
                  : authMode === "signup"
                    ? "Create account"
                    : "Send reset request"}
            </button>

            {authMode !== "reset" ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={auth.isSigningIn}
                className="w-full rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: "var(--button-secondary-bg)",
                  color: "var(--button-secondary-text)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                Continue with Google
              </button>
            ) : null}
          </div>

          {notice ? (
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              {notice}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--button-danger-bg)" }}>
              {error}
            </p>
          ) : null}

          <p className="mt-6 text-xs leading-6" style={{ color: "var(--text-muted)" }}>
            Successful authentication returns you to <span style={{ color: "var(--text-primary)" }}>{nextPath}</span>.
          </p>
        </section>
      </div>
      <ApiErrorSnackbar error={apiError} onClose={() => setApiError(null)} />
    </main>
  );
}

export default AuthPage;
