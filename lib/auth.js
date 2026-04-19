"use client";

import {
  buildErrorReport,
  clearAuthRedirectPath,
  clearAuthSession,
  getApiBase,
  getAuthRedirectPath,
  getAuthSession,
  requestJson,
  saveAuthRedirectPath,
  saveAuthSession,
} from "./storage";
import {
  beginApiRequest,
  failApiRequest,
  finishApiRequest,
} from "./api-monitor";

const API_BASE = getApiBase();

const resolveRedirectTarget = () => {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.origin}/auth/callback`;
};

const redirectToBackendGoogleAuth = async () => {
  const redirectUri = resolveRedirectTarget();
  const candidates = [
    `${API_BASE}/auth/google/start?redirect_to=${encodeURIComponent(redirectUri)}`,
    `${API_BASE}/auth/google?redirect_to=${encodeURIComponent(redirectUri)}`,
    `${API_BASE}/auth/login/google?redirect_to=${encodeURIComponent(redirectUri)}`,
  ];

  for (const url of candidates) {
    const monitorId = beginApiRequest({
      method: "GET",
      url,
      source: "auth-google",
    });
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        failApiRequest(monitorId, {
          statusCode: response.status,
          errorMessage: `Request failed: ${response.status}`,
        });
        continue;
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const payload = await response.json();
        const nextUrl = payload?.url || payload?.redirect_url || payload?.auth_url;

        if (typeof nextUrl === "string" && nextUrl) {
          finishApiRequest(monitorId, {
            statusCode: response.status,
          });
          window.location.assign(nextUrl);
          return true;
        }
      }

      if (response.redirected && response.url) {
        finishApiRequest(monitorId, {
          statusCode: response.status,
        });
        window.location.assign(response.url);
        return true;
      }
      finishApiRequest(monitorId, {
        statusCode: response.status,
      });
    } catch (_error) {
      failApiRequest(monitorId, {
        statusCode: 0,
        errorMessage: "Failed to fetch",
      });
      return false;
    }
  }

  return false;
};

const extractIdentityId = (payload) => {
  return (
    payload?.id ||
    payload?.user_id ||
    payload?.sub ||
    payload?.user?.id ||
    payload?.user?.user_id ||
    ""
  );
};

const extractTokenFromPayload = (payload) => {
  return (
    payload?.token ||
    payload?.access_token ||
    payload?.accessToken ||
    payload?.jwt ||
    payload?.session?.access_token ||
    payload?.session?.token ||
    ""
  );
};

const buildCandidateUrl = (path) => {
  return `${API_BASE}${path}`;
};

const withRequestContext = (error, { url, method }) => {
  error.url = error?.url || url;
  error.method = error?.method || method;
  return error;
};

const postJson = async (url, body) => {
  let response;
  const monitorId = beginApiRequest({
    method: "POST",
    url,
    source: "auth",
  });

  try {
    response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    failApiRequest(monitorId, {
      statusCode: 0,
      errorMessage: error?.message || "Failed to fetch",
      errorCode: error?.name || "fetch_error",
    });
    throw withRequestContext(error, { url, method: "POST" });
  }

  if (!response.ok) {
    let details = null;
    let responseText = "";

    try {
      details = await response.json();
    } catch (_error) {
      try {
        responseText = await response.text();
      } catch (_innerError) {
        responseText = "";
      }
    }

    const error = new Error(`Request failed: ${response.status}`);
    error.status = response.status;
    error.details = details;
    error.responseText = responseText;
    error.url = url;
    error.method = "POST";
    failApiRequest(monitorId, {
      statusCode: response.status,
      errorMessage:
        details?.msg ||
        details?.message ||
        details?.detail ||
        responseText ||
        error.message,
      errorCode: details?.error_code || details?.code || "",
    });
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204 || !contentType.includes("application/json")) {
    finishApiRequest(monitorId, {
      statusCode: response.status,
    });
    return null;
  }

  const payload = await response.json();
  finishApiRequest(monitorId, {
    statusCode: response.status,
  });
  return payload;
};

const resolveUserFromToken = async (token) => {
  const url = `${API_BASE}/users/me`;
  let response;
  const monitorId = beginApiRequest({
    method: "GET",
    url,
    source: "auth",
  });

  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    failApiRequest(monitorId, {
      statusCode: 0,
      errorMessage: error?.message || "Failed to fetch",
      errorCode: error?.name || "fetch_error",
    });
    throw withRequestContext(error, { url, method: "GET" });
  }

  if (!response.ok) {
    const error = new Error(`Unable to resolve current user: ${response.status}`);
    error.status = response.status;
    error.url = url;
    error.method = "GET";
    failApiRequest(monitorId, {
      statusCode: response.status,
      errorMessage: error.message,
    });
    throw error;
  }

  const payload = await response.json();
  finishApiRequest(monitorId, {
    statusCode: response.status,
  });
  return payload;
};

const tryAuthCandidates = async (candidates, body) => {
  let lastError = null;

  for (const url of candidates) {
    try {
      const payload = await postJson(url, body);
      return {
        url,
        payload,
      };
    } catch (error) {
      lastError = error;

      if (![404, 405].includes(error?.status)) {
        break;
      }
    }
  }

  throw lastError || new Error("No authentication endpoint responded.");
};

export const getStoredSession = () => {
  return getAuthSession();
};

export const resolveCurrentSession = async () => {
  const storedSession = getAuthSession();

  if (!storedSession?.token) {
    return null;
  }

  try {
    const me = await requestJson(`${API_BASE}/users/me`);
    return saveAuthSession({
      token: storedSession.token,
      mode: "backend",
      user: me,
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuthSession();
      return null;
    }

    return storedSession;
  }
};

export const beginGoogleSignIn = async (redirectPath = "/admin") => {
  saveAuthRedirectPath(redirectPath);
  const didRedirect = await redirectToBackendGoogleAuth();

  return {
    redirected: didRedirect,
    fallback: !didRedirect,
    errorInfo: !didRedirect
      ? {
          title: "Backend Google auth is unavailable",
          message: "No backend Google auth endpoint responded successfully.",
          status: 0,
          method: "GET",
          url: `${API_BASE}/auth/google/start`,
          stack: [
            "Tried candidate endpoints:",
            `${API_BASE}/auth/google/start`,
            `${API_BASE}/auth/google`,
            `${API_BASE}/auth/login/google`,
            "",
            "No endpoint redirected or returned an auth URL.",
          ].join("\n"),
        }
      : null,
  };
};

export const signInWithPassword = async ({ email, password, redirectPath = "/app" }) => {
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  const result = await tryAuthCandidates(
    [
      buildCandidateUrl("/auth/login"),
      buildCandidateUrl("/auth/sign-in"),
      buildCandidateUrl("/auth/signin"),
      buildCandidateUrl("/auth/token"),
      buildCandidateUrl("/login"),
    ],
    {
      email: normalizedEmail,
      password: normalizedPassword,
    }
  );

  const token = extractTokenFromPayload(result.payload);

  if (!token) {
    throw Object.assign(new Error("The sign-in response did not include a usable access token."), {
      status: 502,
      url: result.url,
      method: "POST",
      details: result.payload,
    });
  }

  const me = await resolveUserFromToken(token);
  saveAuthRedirectPath(redirectPath);
  saveAuthSession({
    token,
    mode: "backend",
    user: me,
  });

  return {
    success: true,
    redirectPath,
    session: {
      token,
      mode: "backend",
      user: me,
    },
  };
};

export const signUpWithPassword = async ({
  email,
  password,
  name = "",
  redirectPath = "/app",
}) => {
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedPassword = typeof password === "string" ? password : "";
  const normalizedName = typeof name === "string" ? name.trim() : "";

  const result = await tryAuthCandidates(
    [
      buildCandidateUrl("/auth/sign-up"),
      buildCandidateUrl("/auth/signup"),
      buildCandidateUrl("/auth/register"),
      buildCandidateUrl("/users"),
      buildCandidateUrl("/signup"),
    ],
    {
      email: normalizedEmail,
      password: normalizedPassword,
      name: normalizedName,
      full_name: normalizedName,
    }
  );

  const token = extractTokenFromPayload(result.payload);

  if (!token) {
    return {
      success: true,
      redirectPath,
      pendingVerification: true,
      message:
        result.payload?.message ||
        result.payload?.detail ||
        "Account created. Finish any required verification, then sign in.",
    };
  }

  const me = await resolveUserFromToken(token);
  saveAuthRedirectPath(redirectPath);
  saveAuthSession({
    token,
    mode: "backend",
    user: me,
  });

  return {
    success: true,
    redirectPath,
    pendingVerification: false,
    session: {
      token,
      mode: "backend",
      user: me,
    },
  };
};

export const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = typeof email === "string" ? email.trim() : "";

  await tryAuthCandidates(
    [
      buildCandidateUrl("/auth/reset-password"),
      buildCandidateUrl("/auth/password/reset"),
      buildCandidateUrl("/auth/forgot-password"),
      buildCandidateUrl("/password/reset"),
      buildCandidateUrl("/forgot-password"),
    ],
    {
      email: normalizedEmail,
    }
  );

  return {
    success: true,
  };
};

export const completeBackendCallback = async (urlString) => {
  const url = new URL(urlString);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const token =
    url.searchParams.get("token") ||
    url.searchParams.get("access_token") ||
    url.searchParams.get("jwt") ||
    hashParams.get("access_token") ||
    "";

  if (!token) {
    return {
      success: false,
      redirectPath: getAuthRedirectPath(),
    };
  }

  const me = await resolveUserFromToken(token);

  saveAuthSession({
    token,
    mode: "backend",
    user: me,
  });

  const redirectPath = getAuthRedirectPath();
  clearAuthRedirectPath();

  return {
    success: true,
    redirectPath,
  };
};

export const signOutSession = async () => {
  const session = getAuthSession();

  if (session?.token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
    } catch (_error) {
      // Best-effort backend logout. Frontend state is still cleared below.
    }
  }

  clearAuthSession();
};

export const resolveAdminIdentity = async () => {
  const session = await resolveCurrentSession();

  if (!session?.token) {
    return {
      session: null,
      me: null,
      roleInfo: null,
      allowed: false,
    };
  }

  try {
    const me = await requestJson(`${API_BASE}/users/me`);
    const targetId = extractIdentityId(me);

    if (!targetId) {
      return {
        session,
        me,
        roleInfo: null,
        allowed: false,
      };
    }

    const roleInfo = await requestJson(`${API_BASE}/admin/users/${targetId}`);

    return {
      session,
      me,
      roleInfo,
      allowed: ["admin", "superuser"].includes(roleInfo?.role),
    };
  } catch (error) {
    return {
      session,
      me: null,
      roleInfo: null,
      allowed: false,
      failureReason:
        error?.status
          ? `Unable to verify admin access (${error.status}).`
          : "Unable to verify admin access.",
      errorInfo: buildErrorReport(error, "Unable to verify admin access."),
    };
  }
};

export default {
  getStoredSession,
  resolveCurrentSession,
  beginGoogleSignIn,
  signInWithPassword,
  signUpWithPassword,
  requestPasswordReset,
  completeBackendCallback,
  signOutSession,
  resolveAdminIdentity,
};
