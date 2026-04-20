const MAX_LOGS = 120;
const MIN_LOGS_AFTER_PRESSURE = 20;

let listeners = new Set();
let sequence = 0;
let logs = [];
let activeCount = 0;
let pressureInfo = null;
let emitFrame = 0;

const emit = () => {
  if (typeof window === "undefined") {
    listeners.forEach((listener) => listener());
    return;
  }

  if (emitFrame) {
    return;
  }

  emitFrame = window.requestAnimationFrame(() => {
    emitFrame = 0;
    listeners.forEach((listener) => listener());
  });
};

const pushLog = (log) => {
  logs = [log, ...logs].slice(0, MAX_LOGS);
  emit();
};

const updateLog = (id, updater) => {
  let changed = false;

  logs = logs.map((log) => {
    if (log.id !== id) {
      return log;
    }

    changed = true;
    return updater(log);
  });

  if (changed) {
    emit();
  }
};

export const beginApiRequest = ({ method = "GET", url = "", source = "app", requestBody = null, requestHeaders = null } = {}) => {
  const id = `req-${Date.now()}-${sequence += 1}`;
  activeCount += 1;
  pushLog({
    id,
    source,
    method,
    url,
    status: "pending",
    statusCode: null,
    startedAt: Date.now(),
    durationMs: null,
    requestHeaders,
    requestBody,
    responseSnippet: null,
    errorMessage: "",
    errorCode: "",
  });
  return id;
};

export const finishApiRequest = (id, {
  status = "success",
  statusCode = null,
  errorMessage = "",
  errorCode = "",
  responseSnippet = null,
} = {}) => {
  activeCount = Math.max(0, activeCount - 1);
  updateLog(id, (log) => ({
    ...log,
    status,
    statusCode,
    durationMs: Date.now() - log.startedAt,
    responseSnippet,
    errorMessage,
    errorCode,
  }));
};

export const failApiRequest = (id, details = {}) => {
  finishApiRequest(id, {
    status: "error",
    ...details,
  });
};

export const clearApiMonitorLogs = () => {
  logs = [];
  activeCount = 0;
  pressureInfo = null;
  emit();
};

export const trimApiMonitorLogs = (keepCount = MIN_LOGS_AFTER_PRESSURE) => {
  const nextKeepCount = Math.max(0, keepCount);
  logs = logs.slice(0, nextKeepCount);
  emit();
};

export const reportMemoryPressure = ({ usedMB = null, limitMB = null, thresholdMB = null } = {}) => {
  pressureInfo = {
    at: Date.now(),
    usedMB,
    limitMB,
    thresholdMB,
  };
  trimApiMonitorLogs(MIN_LOGS_AFTER_PRESSURE);
};

export const subscribeApiMonitor = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getApiMonitorSnapshot = () => {
  return {
    activeCount,
    logs,
    pressureInfo,
  };
};

export default {
  beginApiRequest,
  finishApiRequest,
  failApiRequest,
  clearApiMonitorLogs,
  trimApiMonitorLogs,
  reportMemoryPressure,
  subscribeApiMonitor,
  getApiMonitorSnapshot,
};

// ─── Shared display utilities ────────────────────────────────────────────────

export const METHOD_COLORS = {
  GET:    { bg: "color-mix(in srgb, #0ea5e9 16%, transparent)", color: "#0ea5e9" },
  POST:   { bg: "color-mix(in srgb, #8b5cf6 16%, transparent)", color: "#8b5cf6" },
  PATCH:  { bg: "color-mix(in srgb, #f59e0b 16%, transparent)", color: "#f59e0b" },
  DELETE: { bg: "color-mix(in srgb, #ef4444 16%, transparent)", color: "#ef4444" },
  PUT:    { bg: "color-mix(in srgb, #10b981 16%, transparent)", color: "#10b981" },
};

export const getMethodStyle = (method) =>
  METHOD_COLORS[method] || { bg: "var(--chip-bg)", color: "var(--chip-text)" };

export const getStatusStyle = (status) => ({
  backgroundColor: status === "error"
    ? "color-mix(in srgb, #ef4444 14%, transparent)"
    : status === "pending" ? "var(--chip-bg)"
    : "color-mix(in srgb, #10b981 14%, transparent)",
  color: status === "error" ? "#ef4444" : status === "pending" ? "var(--chip-text)" : "#10b981",
});

export const getDurationColor = (ms) =>
  typeof ms !== "number" ? "var(--text-muted)" : ms < 200 ? "#10b981" : ms < 600 ? "#f59e0b" : "#ef4444";

export const getStatusCodeColor = (code) =>
  !code ? "var(--text-muted)" : code < 300 ? "#10b981" : code < 400 ? "#0ea5e9" : code < 500 ? "#f59e0b" : "#ef4444";

export const prettyJson = (str) => {
  try { return JSON.stringify(JSON.parse(str), null, 2); }
  catch { return str; }
};

const SEARCH_ALIASES = { status: "statusCode", code: "errorCode", src: "source" };

export const parseSearchQuery = (query) => {
  const fieldTerms = [];
  const remaining = [];
  for (const token of query.trim().split(/\s+/)) {
    const ci = token.indexOf(":");
    if (ci > 0) {
      const raw = token.slice(0, ci).toLowerCase();
      const value = token.slice(ci + 1).toLowerCase();
      if (value) fieldTerms.push({ field: SEARCH_ALIASES[raw] || raw, value });
    } else {
      remaining.push(token);
    }
  }
  return { fieldTerms, freeText: remaining.join(" ").toLowerCase() };
};

export const applySearchQuery = (logs, query, filters = {}) => {
  const { fieldTerms, freeText } = query.trim() ? parseSearchQuery(query) : { fieldTerms: [], freeText: "" };
  return logs.filter((log) => {
    if (filters.method && filters.method !== "ALL" && log.method !== filters.method) return false;
    if (filters.status && filters.status !== "ALL" && log.status !== filters.status) return false;
    if (filters.source && filters.source !== "ALL" && log.source !== filters.source) return false;
    for (const { field, value } of fieldTerms) {
      if (!String(log[field] ?? "").toLowerCase().includes(value)) return false;
    }
    if (freeText) {
      const blob = [log.url, log.method, log.source, log.status, log.statusCode, log.errorMessage, log.requestBody, log.responseSnippet].filter(Boolean).join(" ").toLowerCase();
      if (!blob.includes(freeText)) return false;
    }
    return true;
  });
};
