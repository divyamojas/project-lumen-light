import {
  extractChecklistItems,
  normalizeCollection,
  normalizeDraft,
  normalizeTag,
  prepareImportPreview,
} from "./journal.mjs";
import {
  beginApiRequest,
  failApiRequest,
  finishApiRequest,
} from "./api-monitor";
import { assignAccentColor, generateId } from "./utils";

const UI_MODE_KEY = "lumen_ui_mode";
const PREVIEW_MODE_KEY = "lumen_preview_mode";
const DRAFT_KEY_PREFIX = "lumen_draft_";
const PRIVACY_KEY = "lumen_privacy";
const LAST_EXPORT_KEY = "lumen_last_export";
const AUTH_TOKEN_KEY = "lumen_auth_token";
const AUTH_REDIRECT_KEY = "lumen_auth_redirect";
const AUTH_SESSION_KEY = "lumen_auth_session";
const AUTH_COOKIE_KEY = "lumen_auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const DB_NAME = "lumen-journal-db";
const DB_VERSION = 2;
const ENTRY_STORE = "entries";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ENTRY_API_PATH = `${API_BASE}/entries`;
const ENTRY_CACHE_MAX_AGE = 60_000;

const isBrowser = () => typeof window !== "undefined";

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeCreatedAt = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const sanitizeChecklist = (items, body) => {
  const source = Array.isArray(items) && items.length > 0 ? items : extractChecklistItems(body);

  return source
    .map((item, index) => {
      const text = normalizeText(item?.text);

      if (!text) {
        return null;
      }

      return {
        id: typeof item?.id === "string" && item.id ? item.id : `check-${index}-${generateId()}`,
        text,
        checked: Boolean(item?.checked),
      };
    })
    .filter(Boolean);
};

const sanitizeEntry = (entry) => {
  const title = normalizeText(entry?.title).slice(0, 100);
  const body = normalizeText(entry?.body);

  if (!title || !body) {
    return null;
  }

  return {
    id: typeof entry?.id === "string" && entry.id ? entry.id : generateId(),
    title,
    body,
    createdAt: normalizeCreatedAt(entry?.createdAt),
    updatedAt: normalizeCreatedAt(entry?.updatedAt || entry?.createdAt),
    accentColor:
      entry?.accentColor &&
      typeof entry.accentColor === "object" &&
      typeof entry.accentColor.bg === "string"
        ? entry.accentColor
        : assignAccentColor(),
    theme: typeof entry?.theme === "string" && entry.theme ? entry.theme : "neutral",
    tags: Array.isArray(entry?.tags) ? entry.tags.map(normalizeTag).filter(Boolean).slice(0, 8) : [],
    favorite: Boolean(entry?.favorite),
    pinned: Boolean(entry?.pinned),
    collection: normalizeCollection(entry?.collection),
    checklist: sanitizeChecklist(entry?.checklist, body),
    promptId: typeof entry?.promptId === "string" ? entry.promptId : "",
    templateId: typeof entry?.templateId === "string" ? entry.templateId : "",
    relatedEntryIds: Array.isArray(entry?.relatedEntryIds)
      ? entry.relatedEntryIds.filter((value) => typeof value === "string").slice(0, 8)
      : [],
    journal_type: typeof entry?.journal_type === "string" && entry.journal_type ? entry.journal_type : "personal",
    type_metadata:
      entry?.type_metadata && typeof entry.type_metadata === "object" && !Array.isArray(entry.type_metadata)
        ? entry.type_metadata
        : {},
  };
};

const DEFAULT_JOURNAL_TYPE_KEY = "lumen_default_journal_type";
const ENABLED_JOURNAL_TYPES_KEY = "lumen_enabled_journal_types";

export const getDefaultJournalType = () => {
  if (!isBrowser()) return "personal";
  return window.localStorage.getItem(DEFAULT_JOURNAL_TYPE_KEY) ?? "personal";
};

export const setDefaultJournalType = (type) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEFAULT_JOURNAL_TYPE_KEY, type);
};

export const getEnabledJournalTypes = () => {
  if (!isBrowser()) return ["personal"];
  try {
    return JSON.parse(window.localStorage.getItem(ENABLED_JOURNAL_TYPES_KEY) ?? '["personal"]');
  } catch {
    return ["personal"];
  }
};

export const setEnabledJournalTypes = (types) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(ENABLED_JOURNAL_TYPES_KEY, JSON.stringify(types));
};

export const getApiBase = () => API_BASE;

export const getAuthToken = () => {
  if (!isBrowser()) {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
};

export const saveAuthToken = (token) => {
  if (!isBrowser()) {
    return "";
  }

  const nextToken = typeof token === "string" ? token.trim() : "";

  if (!nextToken) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    return "";
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
  return nextToken;
};

export const saveAuthCookie = (token) => {
  if (!isBrowser()) {
    return "";
  }

  const nextToken = typeof token === "string" ? token.trim() : "";

  if (!nextToken) {
    document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax; Secure`;
    return "";
  }

  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(nextToken)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
  return nextToken;
};

export const clearAuthToken = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const clearAuthCookie = () => {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax; Secure`;
};

export const getAuthSession = () => {
  if (!isBrowser()) {
    return null;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUTH_SESSION_KEY));

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      token: typeof parsed.token === "string" ? parsed.token : "",
      mode: parsed.mode === "dummy" ? "dummy" : "backend",
      user:
        parsed.user && typeof parsed.user === "object"
          ? parsed.user
          : null,
    };
  } catch (_error) {
    return null;
  }
};

export const saveAuthSession = (session) => {
  if (!isBrowser()) {
    return null;
  }

  const nextSession = {
    token: typeof session?.token === "string" ? session.token : "",
    mode: session?.mode === "dummy" ? "dummy" : "backend",
    user:
      session?.user && typeof session.user === "object"
        ? session.user
        : null,
  };

  const prevSession = getAuthSession();
  const prevUserId = prevSession?.user?.id || prevSession?.user?.sub || "";
  const nextUserId = nextSession?.user?.id || nextSession?.user?.sub || "";

  if (prevUserId && nextUserId && prevUserId !== nextUserId) {
    clearEntriesCache();
  }

  saveAuthToken(nextSession.token);
  saveAuthCookie(nextSession.token);
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession));
  return nextSession;
};

export const clearLocalEntryData = async () => {
  clearEntriesCache();

  try {
    await runTransaction(ENTRY_STORE, "readwrite", (store) => {
      return requestToPromise(store.clear());
    });
  } catch (_error) {
    // IndexedDB unavailable or quota issue — cache is already cleared above
  }
};

export const clearAuthSession = async () => {
  if (!isBrowser()) {
    return;
  }

  clearAuthToken();
  clearAuthCookie();
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  await clearLocalEntryData();
};

export const saveAuthRedirectPath = (path) => {
  if (!isBrowser()) {
    return "/";
  }

  const nextPath = typeof path === "string" && path.startsWith("/") ? path : "/";
  window.localStorage.setItem(AUTH_REDIRECT_KEY, nextPath);
  return nextPath;
};

export const getAuthRedirectPath = () => {
  if (!isBrowser()) {
    return "/";
  }

  const savedPath = window.localStorage.getItem(AUTH_REDIRECT_KEY);
  return typeof savedPath === "string" && savedPath.startsWith("/") ? savedPath : "/";
};

export const clearAuthRedirectPath = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_REDIRECT_KEY);
};

const REQUEST_TIMEOUT_MS = 15_000;

export const requestJson = async (path, options = {}) => {
  const method = options.method || "GET";
  const token = getAuthToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const monitorId = beginApiRequest({
    method,
    url: path,
    source: "requestJson",
  });

  let response;
  try {
    response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeout = new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
      timeout.status = 0;
      timeout.url = path;
      timeout.method = method;
      failApiRequest(monitorId, {
        statusCode: 0,
        errorMessage: timeout.message,
        errorCode: "timeout",
      });
      throw timeout;
    }
    failApiRequest(monitorId, {
      statusCode: 0,
      errorMessage: err?.message || "Failed to fetch",
      errorCode: err?.name || "fetch_error",
    });
    throw err;
  } finally {
    clearTimeout(timeoutId);
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
    error.url = path;
    error.method = method;
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
    if (response.status === 401) {
      clearAuthSession().then(() => {
        if (isBrowser()) {
          window.location.replace("/auth?reason=session_expired");
        }
      });
    }
    throw error;
  }

  if (response.status === 204) {
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

export const buildErrorReport = (error, fallbackMessage = "Something went wrong.") => {
  const statusLine = error?.status ? `HTTP ${error.status}` : "Request error";
  const responseDetails = error?.details
    ? JSON.stringify(error.details, null, 2)
    : error?.responseText || "";
  const lines = [
    `Message: ${error?.message || fallbackMessage}`,
    `Status: ${statusLine}`,
    `Method: ${error?.method || "unknown"}`,
    `URL: ${error?.url || "unknown"}`,
  ];

  if (responseDetails) {
    lines.push("");
    lines.push("Response:");
    lines.push(responseDetails);
  }

  if (error?.stack) {
    lines.push("");
    lines.push("Stack:");
    lines.push(error.stack);
  }

  return {
    title: fallbackMessage,
    message: error?.message || fallbackMessage,
    status: error?.status || 0,
    method: error?.method || "unknown",
    url: error?.url || "",
    stack: lines.join("\n"),
    details: error?.details || null,
  };
};

export const buildFrontendErrorReport = (error, componentStack = "") => {
  const lines = [
    `Message: ${error?.message || "A frontend error occurred."}`,
    "Status: Frontend runtime error",
    "Method: n/a",
    "URL: n/a",
  ];

  if (componentStack) {
    lines.push("");
    lines.push("Component stack:");
    lines.push(componentStack);
  }

  if (error?.stack) {
    lines.push("");
    lines.push("Stack:");
    lines.push(error.stack);
  }

  return {
    title: "Frontend Error",
    message: error?.message || "A frontend error occurred.",
    status: 0,
    method: "n/a",
    url: "n/a",
    stack: lines.join("\n"),
    details: null,
    kind: "Frontend Error",
  };
};

let databasePromise = null;
let entriesCache = null;
let entriesCacheTimestamp = 0;

const MAX_PAGES = 50;

const listAllPages = async (path, searchParams = {}) => {
  let page = 1;
  const pageSize = 100;
  let hasNext = true;
  const results = [];

  while (hasNext && page <= MAX_PAGES) {
    const url = new URL(path);

    Object.entries({
      ...searchParams,
      page,
      page_size: pageSize,
    }).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        Number.isNaN(value)
      ) {
        return;
      }

      url.searchParams.set(key, String(value));
    });

    const response = await requestJson(url.toString());

    if (Array.isArray(response)) {
      return response;
    }

    const data = Array.isArray(response?.data) ? response.data : [];
    results.push(...data);
    hasNext = Boolean(response?.has_next);
    page += 1;
  }

  if (hasNext) {
    console.warn(`[lumen] Entry list truncated at ${MAX_PAGES * pageSize} entries. Increase MAX_PAGES or add pagination UI.`);
  }

  return results;
};

const sanitizeEntriesList = (entries) => {
  return Array.isArray(entries)
    ? entries
        .map(sanitizeEntry)
        .filter(Boolean)
        .sort((left, right) => {
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        })
    : [];
};

const updateEntriesCache = (entries) => {
  entriesCache = sanitizeEntriesList(entries);
  entriesCacheTimestamp = Date.now();
  return entriesCache;
};

const clearEntriesCache = () => {
  entriesCache = null;
  entriesCacheTimestamp = 0;
};

const getCachedEntries = (maxAge = ENTRY_CACHE_MAX_AGE) => {
  if (!entriesCache) {
    return null;
  }

  return Date.now() - entriesCacheTimestamp <= maxAge ? entriesCache : null;
};

const requestToPromise = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const openDatabase = async () => {
  if (!isBrowser() || typeof window.indexedDB === "undefined") {
    return null;
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = request.result;

        if (event.oldVersion < 2 && database.objectStoreNames.contains("meta")) {
          database.deleteObjectStore("meta");
        }

        if (!database.objectStoreNames.contains(ENTRY_STORE)) {
          database.createObjectStore(ENTRY_STORE, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return databasePromise;
};

const runTransaction = async (storeNames, mode, callback) => {
  const database = await openDatabase();

  if (!database) {
    return callback(null);
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);
    const stores = Array.isArray(storeNames)
      ? storeNames.map((name) => transaction.objectStore(name))
      : transaction.objectStore(storeNames);

    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    Promise.resolve(callback(stores))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        transaction.abort();
        reject(error);
      });
  });
};

const getEntriesFromIndexedDb = async () => {
  const database = await openDatabase();

  if (!database) {
    return [];
  }

  const entries = await runTransaction(ENTRY_STORE, "readonly", (store) => {
    return requestToPromise(store.getAll());
  });

  return entries
    .map(sanitizeEntry)
    .filter(Boolean)
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
};

const writeEntriesToIndexedDb = async (entries) => {
  const sanitizedEntries = entries.map(sanitizeEntry).filter(Boolean);
  const database = await openDatabase();

  if (!database) {
    return sanitizedEntries;
  }

  await runTransaction(ENTRY_STORE, "readwrite", async (store) => {
    await requestToPromise(store.clear());
    sanitizedEntries.forEach((entry) => {
      store.put(entry);
    });
  });

  return sanitizedEntries;
};

const arrayBufferToBase64 = (value) => {
  return window.btoa(String.fromCharCode(...new Uint8Array(value)));
};

const base64ToUint8Array = (value) => {
  return Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0));
};

const deriveEncryptionKey = async (passphrase, salt) => {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const encryptPayload = async (payload, passphrase) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveEncryptionKey(passphrase, salt);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(payload)
  );

  return {
    version: 1,
    algorithm: "AES-GCM",
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    ciphertext: arrayBufferToBase64(cipherBuffer),
  };
};

const decryptPayload = async (payload, passphrase) => {
  const key = await deriveEncryptionKey(passphrase, base64ToUint8Array(payload.salt));
  const plainBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToUint8Array(payload.iv),
    },
    key,
    base64ToUint8Array(payload.ciphertext)
  );

  return new TextDecoder().decode(plainBuffer);
};

const sha256 = async (value) => {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return arrayBufferToBase64(digest);
};

const loadAndCacheEntries = async () => {
  try {
    const entries = await listAllPages(ENTRY_API_PATH);
    await writeEntriesToIndexedDb(entries);
    return updateEntriesCache(entries);
  } catch (_error) {
    const offline = await getEntriesFromIndexedDb();
    return updateEntriesCache(offline);
  }
};

export const getEntries = async () => {
  const cachedEntries = getCachedEntries();

  if (cachedEntries) {
    return cachedEntries;
  }

  return loadAndCacheEntries();
};

export const getEntriesFresh = async () => {
  clearEntriesCache();
  return loadAndCacheEntries();
};

export const getEntryById = async (id, options = {}) => {
  if (!options.force) {
    const cachedEntries = getCachedEntries();
    const cachedEntry = cachedEntries?.find((entry) => entry.id === id);

    if (cachedEntry) {
      return cachedEntry;
    }
  }

  try {
    const entry = await requestJson(`${ENTRY_API_PATH}/${id}`);

    if (entry) {
      const cachedEntries = getCachedEntries(ENTRY_CACHE_MAX_AGE * 3);

      if (cachedEntries) {
        updateEntriesCache(
          cachedEntries.map((cachedEntry) => (cachedEntry.id === entry.id ? entry : cachedEntry))
        );
      }
    }

    return entry;
  } catch (error) {
    if (error.message === "Request failed: 404") {
      return null;
    }

    const offline = await getEntriesFromIndexedDb();
    return offline.find((entry) => entry.id === id) || null;
  }
};

export const createEntry = async ({
  id,
  title,
  body,
  tags,
  collection,
  favorite,
  pinned,
  templateId,
  promptId,
  relatedEntryIds,
  checklist,
  theme,
  accentColor,
  createdAt,
  updatedAt,
  journal_type,
  type_metadata,
}) => {
  const now = new Date().toISOString();
  const entryPayload = sanitizeEntry({
    id,
    title,
    body,
    createdAt: createdAt || now,
    updatedAt: updatedAt || now,
    accentColor: accentColor || assignAccentColor(),
    theme: theme || "neutral",
    tags,
    favorite,
    pinned,
    collection,
    checklist,
    templateId,
    promptId,
    relatedEntryIds,
    journal_type,
    type_metadata,
  });

  if (!entryPayload) {
    throw new Error("Unable to create entry with invalid content.");
  }

  const entry = await requestJson(ENTRY_API_PATH, {
    method: "POST",
    body: JSON.stringify(entryPayload),
  });

  const cachedEntries = getCachedEntries(ENTRY_CACHE_MAX_AGE * 3) || [];
  const nextEntries = [entry, ...cachedEntries.filter((cachedEntry) => cachedEntry.id !== entry.id)];
  await writeEntriesToIndexedDb(nextEntries);
  updateEntriesCache(nextEntries);
  return entry;
};

export const updateEntry = async (id, updates) => {
  const currentEntry = await getEntryById(id);

  if (!currentEntry) {
    throw new Error("Entry not found.");
  }

  const nextEntry = sanitizeEntry({
    ...currentEntry,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  });

  if (!nextEntry) {
    throw new Error("Unable to update entry with invalid content.");
  }

  const entry = await requestJson(`${ENTRY_API_PATH}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: nextEntry.title,
      body: nextEntry.body,
      updatedAt: nextEntry.updatedAt,
      accentColor: nextEntry.accentColor,
      theme: nextEntry.theme,
      tags: nextEntry.tags,
      favorite: nextEntry.favorite,
      pinned: nextEntry.pinned,
      collection: nextEntry.collection,
      checklist: nextEntry.checklist,
      templateId: nextEntry.templateId,
      promptId: nextEntry.promptId,
      relatedEntryIds: nextEntry.relatedEntryIds,
      journal_type: nextEntry.journal_type,
      type_metadata: nextEntry.type_metadata,
    }),
  });

  const cachedEntries = getCachedEntries(ENTRY_CACHE_MAX_AGE * 3) || (await getEntriesFromIndexedDb());

  if (cachedEntries) {
    const nextEntries = cachedEntries.map((cachedEntry) => (cachedEntry.id === id ? entry : cachedEntry));
    await writeEntriesToIndexedDb(nextEntries);
    updateEntriesCache(nextEntries);
  }

  return entry;
};

export const deleteEntry = async (id) => {
  await requestJson(`${ENTRY_API_PATH}/${id}`, { method: "DELETE" });
  const cachedEntries = getCachedEntries(ENTRY_CACHE_MAX_AGE * 3) || [];
  const nextEntries = cachedEntries.filter((entry) => entry.id !== id);
  await writeEntriesToIndexedDb(nextEntries);
  return updateEntriesCache(nextEntries);
};

export const duplicateEntry = async (id) => {
  const currentEntry = await getEntryById(id);

  if (!currentEntry) {
    return null;
  }

  return createEntry({
    title: `${currentEntry.title} Copy`,
    body: currentEntry.body,
    tags: currentEntry.tags,
    collection: currentEntry.collection,
    favorite: false,
    pinned: false,
    templateId: currentEntry.templateId,
    promptId: currentEntry.promptId,
    relatedEntryIds: [currentEntry.id, ...(currentEntry.relatedEntryIds || [])].slice(0, 8),
    journal_type: currentEntry.journal_type,
    type_metadata: currentEntry.type_metadata,
  });
};

export const previewImportEntries = async (payload, passphrase = "") => {
  let importedEntries = payload;

  if (!Array.isArray(importedEntries) && importedEntries?.ciphertext) {
    if (!passphrase) {
      return {
        requiresPassphrase: true,
        preview: null,
        entries: null,
      };
    }

    const decrypted = await decryptPayload(importedEntries, passphrase);
    importedEntries = JSON.parse(decrypted);
  }

  if (!Array.isArray(importedEntries)) {
    return {
      requiresPassphrase: false,
      preview: prepareImportPreview(await getEntries(), []),
      entries: [],
    };
  }

  return {
    requiresPassphrase: false,
    preview: prepareImportPreview(await getEntries(), importedEntries),
    entries: importedEntries,
  };
};

export const importEntries = async (importedEntries, options = {}) => {
  const sanitized = importedEntries.map(sanitizeEntry).filter(Boolean);
  const invalidCount = importedEntries.length - sanitized.length;
  let importedCount = 0;
  let duplicateCount = 0;
  const errors = [];

  const existing = await getEntriesFresh();
  const existingIds = new Set(existing.map((entry) => entry.id));

  if (options.replaceAll) {
    for (const entry of existing) {
      try {
        await requestJson(`${ENTRY_API_PATH}/${entry.id}`, { method: "DELETE" });
      } catch (err) {
        errors.push(`DELETE ${entry.id}: ${err?.message || err}`);
      }
    }

    for (const entry of sanitized) {
      try {
        await requestJson(ENTRY_API_PATH, {
          method: "POST",
          body: JSON.stringify(entry),
        });
        importedCount++;
      } catch (err) {
        errors.push(`POST ${entry.id}: ${err?.message || err}`);
      }
    }
  } else {
    for (const entry of sanitized) {
      if (existingIds.has(entry.id)) {
        duplicateCount++;

        if (options.duplicateMode === "keep-existing") {
          continue;
        }

        try {
          await requestJson(`${ENTRY_API_PATH}/${entry.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              title: entry.title,
              body: entry.body,
              updatedAt: entry.updatedAt,
              accentColor: entry.accentColor,
              theme: entry.theme,
              tags: entry.tags,
              favorite: entry.favorite,
              pinned: entry.pinned,
              collection: entry.collection,
              checklist: entry.checklist,
              templateId: entry.templateId,
              promptId: entry.promptId,
              relatedEntryIds: entry.relatedEntryIds,
              journal_type: entry.journal_type,
              type_metadata: entry.type_metadata,
            }),
          });
          importedCount++;
        } catch (err) {
          errors.push(`PATCH ${entry.id}: ${err?.message || err}`);
        }
      } else {
        try {
          await requestJson(ENTRY_API_PATH, {
            method: "POST",
            body: JSON.stringify(entry),
          });
          importedCount++;
        } catch (err) {
          errors.push(`POST ${entry.id}: ${err?.message || err}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw Object.assign(
      new Error(`Import partially failed: ${errors.length} operation(s) failed`),
      { importedCount, duplicateCount, invalidCount, errors },
    );
  }

  const nextEntries = await getEntriesFresh();
  await writeEntriesToIndexedDb(nextEntries);

  return { entries: nextEntries, importedCount, duplicateCount, invalidCount };
};

export const exportEntries = async ({ encrypted = false, passphrase = "" } = {}) => {
  const entries = await getEntries();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const payload = JSON.stringify(entries, null, 2);
  let fileContent = payload;
  let fileName = `lumen_export_${timestamp}.json`;

  if (encrypted) {
    const envelope = await encryptPayload(payload, passphrase);
    fileContent = JSON.stringify(
      {
        ...envelope,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
    fileName = `lumen_export_${timestamp}_encrypted.json`;
  }

  if (isBrowser()) {
    window.localStorage.setItem(
      LAST_EXPORT_KEY,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        count: entries.length,
        encrypted,
      })
    );
  }

  return {
    entries,
    fileName,
    blob: new Blob([fileContent], { type: "application/json" }),
  };
};

export const getLastExportMeta = () => {
  if (!isBrowser()) {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem(LAST_EXPORT_KEY));
  } catch (_error) {
    return null;
  }
};

export const getUiMode = () => {
  if (!isBrowser()) {
    return "auto";
  }

  const savedValue = window.localStorage.getItem(UI_MODE_KEY);
  return ["auto", "light", "dark"].includes(savedValue) ? savedValue : "auto";
};

export const saveUiMode = (mode) => {
  if (!isBrowser()) {
    return "auto";
  }

  const nextMode = ["auto", "light", "dark"].includes(mode) ? mode : "auto";
  window.localStorage.setItem(UI_MODE_KEY, nextMode);
  return nextMode;
};

export const getPreviewMode = () => {
  if (!isBrowser()) {
    return "comfortable";
  }

  const savedValue = window.localStorage.getItem(PREVIEW_MODE_KEY);
  return ["compact", "comfortable"].includes(savedValue) ? savedValue : "comfortable";
};

export const savePreviewMode = (mode) => {
  if (!isBrowser()) {
    return "comfortable";
  }

  const nextMode = ["compact", "comfortable"].includes(mode) ? mode : "comfortable";
  window.localStorage.setItem(PREVIEW_MODE_KEY, nextMode);
  return nextMode;
};

export const getDraft = (draftId) => {
  if (!isBrowser()) {
    return null;
  }

  const draft = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${draftId}`);

  if (!draft) {
    return null;
  }

  try {
    return normalizeDraft(JSON.parse(draft));
  } catch (_error) {
    return null;
  }
};

export const saveDraft = (draftId, draft) => {
  if (!isBrowser()) {
    return null;
  }

  const nextDraft = normalizeDraft(draft);
  window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${draftId}`, JSON.stringify(nextDraft));
  return nextDraft;
};

export const clearDraft = (draftId) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${draftId}`);
};

export const getPrivacySettings = () => {
  if (!isBrowser()) {
    return {
      passcodeHash: "",
      passcodeHint: "",
      blurOnBackground: true,
      requireUnlock: false,
    };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRIVACY_KEY));
    return {
      passcodeHash: typeof parsed?.passcodeHash === "string" ? parsed.passcodeHash : "",
      passcodeHint: typeof parsed?.passcodeHint === "string" ? parsed.passcodeHint : "",
      blurOnBackground: parsed?.blurOnBackground !== false,
      requireUnlock: Boolean(parsed?.passcodeHash),
    };
  } catch (_error) {
    return {
      passcodeHash: "",
      passcodeHint: "",
      blurOnBackground: true,
      requireUnlock: false,
    };
  }
};

export const savePrivacySettings = async ({ passcode, passcodeHint, blurOnBackground }) => {
  if (!isBrowser()) {
    return getPrivacySettings();
  }

  const nextSettings = {
    passcodeHash: passcode ? await sha256(passcode) : "",
    passcodeHint: typeof passcodeHint === "string" ? passcodeHint.slice(0, 60) : "",
    blurOnBackground: blurOnBackground !== false,
  };

  window.localStorage.setItem(PRIVACY_KEY, JSON.stringify(nextSettings));
  return {
    ...nextSettings,
    requireUnlock: Boolean(nextSettings.passcodeHash),
  };
};

export const verifyPasscode = async (passcode) => {
  const settings = getPrivacySettings();

  if (!settings.passcodeHash) {
    return true;
  }

  return (await sha256(passcode)) === settings.passcodeHash;
};

export default {
  getEntries,
  getEntriesFresh,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  duplicateEntry,
  previewImportEntries,
  importEntries,
  exportEntries,
  getLastExportMeta,
  getUiMode,
  saveUiMode,
  getPreviewMode,
  savePreviewMode,
  getDraft,
  saveDraft,
  clearDraft,
  getPrivacySettings,
  savePrivacySettings,
  verifyPasscode,
  getApiBase,
  requestJson,
  getAuthToken,
  saveAuthToken,
  saveAuthCookie,
  clearAuthToken,
  clearAuthCookie,
  getAuthSession,
  saveAuthSession,
  clearAuthSession,
  clearLocalEntryData,
  saveAuthRedirectPath,
  getAuthRedirectPath,
  clearAuthRedirectPath,
  buildErrorReport,
  getDefaultJournalType,
  setDefaultJournalType,
  getEnabledJournalTypes,
  setEnabledJournalTypes,
};
