"use client";

import { useEffect } from "react";
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

  return <AdminPanel />;
}

export default AdminPage;
