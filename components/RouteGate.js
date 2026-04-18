"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";

const isAuthRoute = (pathname) => {
  return pathname === "/auth" || pathname.startsWith("/auth/");
};

const isCallbackRoute = (pathname) => {
  return pathname === "/auth/callback";
};

const isPublicRoute = (pathname) => {
  return pathname === "/" || isAuthRoute(pathname);
};

const getAuthRedirectTarget = (pathname, searchParams) => {
  const nextQuery = searchParams?.toString();
  return `${pathname}${nextQuery ? `?${nextQuery}` : ""}`;
};

export function RouteGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (pathname === "/") {
      router.replace(auth.isAuthenticated ? "/app" : "/auth");
      return;
    }

    if (isAuthRoute(pathname) && !isCallbackRoute(pathname) && auth.isAuthenticated) {
      const nextPath = searchParams?.get("next");
      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/app");
      return;
    }

    if (!isPublicRoute(pathname) && !auth.isAuthenticated) {
      const nextTarget = encodeURIComponent(getAuthRedirectTarget(pathname, searchParams));
      router.replace(`/auth?next=${nextTarget}`);
    }
  }, [auth.isAuthenticated, auth.isLoading, pathname, router, searchParams]);

  if (pathname === "/") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
            Lumen
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Checking your access...
          </p>
        </div>
      </main>
    );
  }

  if (!isPublicRoute(pathname) && (auth.isLoading || !auth.isAuthenticated)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
            Secure Access
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Verifying your session...
          </p>
        </div>
      </main>
    );
  }

  if (isAuthRoute(pathname) && !isCallbackRoute(pathname) && auth.isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
            Redirecting
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Sending you back into the app...
          </p>
        </div>
      </main>
    );
  }

  return children;
}

export default RouteGate;
