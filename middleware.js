import { NextResponse } from "next/server";

const AUTH_COOKIE_KEY = "lumen_auth";
const ONBOARDING_COOKIE_KEY = "lumen_onboarding";

const isPublicPath = (pathname) => {
  return (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/landing" ||
    pathname.startsWith("/legal/") ||
    pathname === "/onboarding"
  );
};

const sanitizeNextPath = (value) => {
  return typeof value === "string" && value.startsWith("/") ? value : "/app";
};

export function middleware(request) {
  const { nextUrl, cookies } = request;
  const { pathname, search } = nextUrl;
  const hasSession = Boolean(cookies.get(AUTH_COOKIE_KEY)?.value);
  const hasOnboarding = Boolean(cookies.get(ONBOARDING_COOKIE_KEY)?.value);

  if (pathname === "/") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = hasSession ? "/app" : "/landing";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users trying to access auth screens (except callback)
  if (isPublicPath(pathname) && hasSession && pathname !== "/auth/callback" && pathname !== "/onboarding") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = sanitizeNextPath(nextUrl.searchParams.get("next"));
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users away from protected paths
  if (!isPublicPath(pathname) && !hasSession) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = `?next=${encodeURIComponent(`${pathname}${search || ""}`)}`;
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users who haven't completed onboarding to /onboarding
  // Only when navigating to /app (not other protected paths)
  if (hasSession && !hasOnboarding && pathname === "/app") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/onboarding";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/app",
    "/app/:path*",
    "/admin",
    "/admin/:path*",
    "/entry/:path*",
    "/auth",
    "/auth/:path*",
    "/onboarding",
    "/landing",
    "/legal/:path*",
  ],
};
