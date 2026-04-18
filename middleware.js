import { NextResponse } from "next/server";

const AUTH_COOKIE_KEY = "lumen_auth";

const isPublicPath = (pathname) => {
  return pathname === "/auth" || pathname.startsWith("/auth/");
};

const sanitizeNextPath = (value) => {
  return typeof value === "string" && value.startsWith("/") ? value : "/app";
};

export function middleware(request) {
  const { nextUrl, cookies } = request;
  const { pathname, search } = nextUrl;
  const hasSession = Boolean(cookies.get(AUTH_COOKIE_KEY)?.value);

  if (pathname === "/") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = hasSession ? "/app" : "/auth";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicPath(pathname) && hasSession && pathname !== "/auth/callback") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = sanitizeNextPath(nextUrl.searchParams.get("next"));
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!isPublicPath(pathname) && !hasSession) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = `?next=${encodeURIComponent(`${pathname}${search || ""}`)}`;
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
  ],
};
