"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ApiErrorSnackbar from "../../../components/ApiErrorSnackbar";
import { completeBackendCallback } from "../../../lib/auth";
import { buildErrorReport } from "../../../lib/storage";

export function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finalizing sign-in...");
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const finalize = async () => {
      try {
        const result = await completeBackendCallback(window.location.href);

        if (!isMounted) {
          return;
        }

        if (result.success) {
          setMessage("Access granted. Redirecting...");
          router.replace(result.redirectPath || "/admin");
          return;
        }

        setMessage("No backend token was provided by the backend callback.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(error.message || "Unable to finish sign-in.");
        setApiError(buildErrorReport(error, "Unable to finish sign-in."));
      }
    };

    finalize();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <div
        className="w-full rounded-[32px] border px-6 py-8 text-center"
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface-strong) 92%, transparent)",
          borderColor: "var(--surface-border)",
        }}
      >
        <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
          Auth Callback
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-playfair)] text-4xl" style={{ color: "var(--text-primary)" }}>
          Signing you in
        </h1>
        <p className="mt-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          {message}
        </p>
      </div>
      <ApiErrorSnackbar error={apiError} onClose={() => setApiError(null)} />
    </main>
  );
}

export default AuthCallbackPage;
