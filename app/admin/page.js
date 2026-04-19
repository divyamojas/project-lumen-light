"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminPanel from "../../components/AdminPanel";
import { useAuth } from "../../components/AuthProvider";

export function AdminPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    if (!isAdmin) {
      router.replace("/app");
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {isLoading ? "Checking access…" : "Redirecting…"}
        </p>
      </main>
    );
  }

  return (
    <main className="lively-shell min-h-screen px-5 pb-10 pt-5 md:px-8 md:pt-8">
      <div className="mx-auto w-full max-w-7xl">
        <div
          className="hero-panel mb-6 rounded-[32px] border px-5 py-5 md:px-6"
          style={{
            borderColor: "var(--surface-border)",
            backgroundColor: "color-mix(in srgb, var(--surface-strong) 88%, transparent)",
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--text-muted)" }}>
                Admin Surface
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-4xl leading-none" style={{ color: "var(--text-primary)" }}>
                Lumen Control Room
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                Monitor system activity, inspect backend behavior, and move back into the journal without feeling like you left the product.
              </p>
            </div>

            <Link
              href="/app"
              className="interactive inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              style={{
                border: "1px solid var(--surface-border)",
                backgroundColor: "var(--button-secondary-bg)",
                color: "var(--button-secondary-text)",
              }}
            >
              <span aria-hidden="true">←</span>
              Back to App
            </Link>
          </div>
        </div>
        <AdminPanel />
      </div>
    </main>
  );
}

export default AdminPage;
