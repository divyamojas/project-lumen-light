import { THEMES } from "./themes";
import { assignAccentColor, generateId } from "./utils";

const STORAGE_KEY = "lumen_entries";
const UI_MODE_KEY = "lumen_ui_mode";

const isBrowser = () => typeof window !== "undefined";

const parseEntries = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

export const getEntries = () => {
  if (!isBrowser()) {
    return [];
  }

  const entries = parseEntries(window.localStorage.getItem(STORAGE_KEY));

  return [...entries].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
};

export const getEntryById = (id) => {
  return getEntries().find((entry) => entry.id === id) || null;
};

export const saveEntries = (entries) => {
  if (!isBrowser()) {
    return [];
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries;
};

export const createEntry = ({ title, body }) => {
  const entry = {
    id: generateId(),
    title,
    body,
    createdAt: new Date().toISOString(),
    accentColor: assignAccentColor(),
    theme: "neutral",
  };

  const entries = [entry, ...getEntries()];
  saveEntries(entries);
  return entry;
};

export const deleteEntry = (id) => {
  const nextEntries = getEntries().filter((entry) => entry.id !== id);
  saveEntries(nextEntries);
  return nextEntries;
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

export default {
  getEntries,
  getEntryById,
  saveEntries,
  createEntry,
  deleteEntry,
  getUiMode,
  saveUiMode,
};
