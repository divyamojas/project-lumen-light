"use client";

import { buildErrorReport, getApiBase, requestJson } from "./storage";

const API_BASE = getApiBase();

const withRequestMeta = async (requestFactory, fallbackValue, failureMessage) => {
  try {
    const result = await requestFactory();
    return {
      data: result,
      error: "",
      degraded: false,
      errorInfo: null,
    };
  } catch (error) {
    return {
      data: fallbackValue,
      error:
        failureMessage ||
        (error?.status
          ? `Request failed with status ${error.status}.`
          : "Request failed."),
      degraded: true,
      errorInfo: buildErrorReport(error, failureMessage),
    };
  }
};

export const getAdminStats = async () => {
  return withRequestMeta(
    async () => requestJson(`${API_BASE}/admin/stats`),
    null,
    "Stats are unavailable right now."
  );
};

export const getAdminUsers = async ({ page = 1, pageSize = 20 } = {}) => {
  return withRequestMeta(
    async () => {
      const response = await requestJson(
        `${API_BASE}/admin/users?page=${page}&page_size=${pageSize}`
      );

      return {
        data: Array.isArray(response) ? response : [],
        total: Array.isArray(response) ? response.length : 0,
        page,
        page_size: pageSize,
        has_next: Array.isArray(response) ? response.length === pageSize : false,
      };
    },
    {
      data: [],
      total: 0,
      page,
      page_size: pageSize,
      has_next: false,
    },
    "Users are unavailable right now."
  );
};

export const getAdminUser = async (userId) => {
  return withRequestMeta(
    async () => requestJson(`${API_BASE}/admin/users/${userId}`),
    null,
    "User details are unavailable right now."
  );
};

export const updateAdminUserRole = async (userId, role) => {
  return withRequestMeta(
    async () =>
      requestJson(`${API_BASE}/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    null,
    "Unable to update this user's role."
  );
};

export const deleteAdminUser = async (userId) => {
  return withRequestMeta(
    async () =>
      requestJson(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
      }),
    null,
    "Unable to delete this user."
  );
};

export const getAdminEntries = async ({ page = 1, pageSize = 20, userId = "" } = {}) => {
  return withRequestMeta(
    async () => {
      const url = new URL(`${API_BASE}/admin/entries`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("page_size", String(pageSize));

      if (userId) {
        url.searchParams.set("user_id", userId);
      }

      return requestJson(url.toString());
    },
    {
      data: [],
      total: 0,
      page,
      page_size: pageSize,
      has_next: false,
    },
    "Entries are unavailable right now."
  );
};

export const deleteAdminEntry = async (entryId) => {
  return withRequestMeta(
    async () =>
      requestJson(`${API_BASE}/admin/entries/${entryId}`, {
        method: "DELETE",
      }),
    null,
    "Unable to delete this entry."
  );
};

export const getAdminSchema = async ({ refresh = false } = {}) => {
  return withRequestMeta(
    async () =>
      requestJson(
        refresh ? `${API_BASE}/admin/schema/refresh` : `${API_BASE}/admin/schema`,
        refresh ? { method: "POST" } : {}
      ),
    null,
    "Schema information is unavailable right now."
  );
};

export const getAdminMigrations = async () => {
  return withRequestMeta(
    async () => requestJson(`${API_BASE}/admin/schema/migrations`),
    [],
    "Migration status is unavailable right now."
  );
};

export const applyAdminMigrations = async () => {
  return withRequestMeta(
    async () =>
      requestJson(`${API_BASE}/admin/schema/migrations/apply`, {
        method: "POST",
      }),
    [],
    "Unable to apply pending migrations."
  );
};

export const executeAdminSql = async (query) => {
  return withRequestMeta(
    async () =>
      requestJson(`${API_BASE}/admin/sql`, {
        method: "POST",
        body: JSON.stringify({ query }),
      }),
    null,
    "SQL execution is unavailable right now."
  );
};

export default {
  getAdminStats,
  getAdminUsers,
  getAdminUser,
  updateAdminUserRole,
  deleteAdminUser,
  getAdminEntries,
  deleteAdminEntry,
  getAdminSchema,
  getAdminMigrations,
  applyAdminMigrations,
  executeAdminSql,
};
