export const JOURNAL_PROMPTS = [
  "What felt lighter today than it did yesterday?",
  "What do I need more of this week?",
  "What moment do I want to remember in detail?",
  "What is quietly taking up mental space right now?",
  "What would feel like enough for today?",
];

export const JOURNAL_TEMPLATES = [
  {
    id: "blank",
    label: "Blank",
    title: "",
    body: "",
  },
  {
    id: "morning",
    label: "Morning Reset",
    title: "Morning Reset",
    body: "Today I want to focus on...\n\nA kind thing I can do for myself is...\n\nWhat would make tonight feel steady?",
  },
  {
    id: "evening",
    label: "Evening Reflection",
    title: "Evening Reflection",
    body: "What happened today?\n\nWhat felt meaningful?\n\nWhat do I want to carry into tomorrow?",
  },
  {
    id: "gratitude",
    label: "Gratitude",
    title: "Gratitude",
    body: "Three things I appreciated today:\n- \n- \n- ",
  },
  {
    id: "follow-up",
    label: "Follow-up",
    title: "Follow-up Reflection",
    body: "Since the last time I wrote about this...\n\nWhat has changed?\n\nWhat still needs care?",
  },
];

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

export const normalizeTag = (value) => {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
};

export const normalizeCollection = (value) => {
  return normalizeText(value).slice(0, 40);
};

export const normalizeDateValue = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getDateInputValue = (value) => {
  const date = normalizeDateValue(value);
  return date ? date.toISOString().slice(0, 10) : "";
};

export const getDayKey = (value) => {
  const date = normalizeDateValue(value);
  return date ? date.toISOString().slice(0, 10) : "";
};

export const getMonthKey = (value) => {
  const date = normalizeDateValue(value);
  return date ? date.toISOString().slice(0, 7) : "";
};

export const formatRangeLabel = (start, end) => {
  if (!start && !end) {
    return "Any time";
  }

  if (start && end) {
    return `${start} to ${end}`;
  }

  if (start) {
    return `From ${start}`;
  }

  return `Until ${end}`;
};

export const normalizeDraft = (draft) => {
  return {
    title: typeof draft?.title === "string" ? draft.title.slice(0, 100) : "",
    body: typeof draft?.body === "string" ? draft.body : "",
    tags: Array.isArray(draft?.tags) ? draft.tags.map(normalizeTag).filter(Boolean) : [],
    collection: normalizeCollection(draft?.collection),
    favorite: Boolean(draft?.favorite),
    pinned: Boolean(draft?.pinned),
  };
};

export const extractChecklistItems = (body) => {
  return String(body || "")
    .split("\n")
    .map((line, index) => {
      const match = line.match(/^\s*-\s\[( |x)\]\s(.+)$/i);

      if (!match) {
        return null;
      }

      return {
        id: `check-${index}`,
        text: match[2].trim(),
        checked: match[1].toLowerCase() === "x",
      };
    })
    .filter(Boolean);
};

export const prepareImportPreview = (currentEntries, incomingEntries) => {
  const currentById = new Map(currentEntries.map((entry) => [entry.id, entry]));
  const seenIncoming = new Set();
  const previewItems = [];
  let duplicateCount = 0;
  let invalidCount = 0;

  incomingEntries.forEach((entry) => {
    if (!entry || typeof entry !== "object" || !entry.id || !entry.title || !entry.body) {
      invalidCount += 1;
      return;
    }

    const duplicate = currentById.has(entry.id) || seenIncoming.has(entry.id);

    if (duplicate) {
      duplicateCount += 1;
    }

    seenIncoming.add(entry.id);
    previewItems.push({
      id: entry.id,
      title: entry.title,
      createdAt: entry.createdAt,
      duplicate,
    });
  });

  return {
    totalIncoming: incomingEntries.length,
    validIncoming: previewItems.length,
    duplicateCount,
    invalidCount,
    newCount: previewItems.length - duplicateCount,
    previewItems: previewItems.slice(0, 8),
  };
};

const timeframeMatches = (entry, timeframe) => {
  if (timeframe === "all") {
    return true;
  }

  const createdAt = normalizeDateValue(entry.createdAt);

  if (!createdAt) {
    return false;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timeframe === "today") {
    return createdAt >= startOfToday;
  }

  if (timeframe === "week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    return createdAt >= startOfWeek;
  }

  if (timeframe === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return createdAt >= startOfMonth;
  }

  return true;
};

const dateRangeMatches = (entry, startDate, endDate) => {
  const createdAt = normalizeDateValue(entry.createdAt);

  if (!createdAt) {
    return false;
  }

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);

    if (createdAt < start) {
      return false;
    }
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);

    if (createdAt > end) {
      return false;
    }
  }

  return true;
};

export const filterEntries = (entries, filters = {}) => {
  const normalizedQuery = normalizeText(filters.query).toLowerCase();
  const selectedTags = Array.isArray(filters.selectedTags)
    ? filters.selectedTags.map(normalizeTag).filter(Boolean)
    : [];
  const selectedCollections = Array.isArray(filters.selectedCollections)
    ? filters.selectedCollections.map(normalizeCollection).filter(Boolean)
    : [];

  return entries.filter((entry) => {
    const title = normalizeText(entry.title).toLowerCase();
    const body = normalizeText(entry.body).toLowerCase();
    const tags = Array.isArray(entry.tags) ? entry.tags.map(normalizeTag) : [];
    const collection = normalizeCollection(entry.collection);
    const matchesQuery =
      !normalizedQuery ||
      title.includes(normalizedQuery) ||
      body.includes(normalizedQuery) ||
      tags.some((tag) => tag.includes(normalizedQuery)) ||
      collection.toLowerCase().includes(normalizedQuery);
    const matchesTags =
      selectedTags.length === 0 || selectedTags.every((tag) => tags.includes(tag));
    const matchesCollections =
      selectedCollections.length === 0 || selectedCollections.includes(collection);
    const matchesFavorite = !filters.onlyFavorites || Boolean(entry.favorite);
    const matchesPinned = !filters.onlyPinned || Boolean(entry.pinned);

    return (
      matchesQuery &&
      matchesTags &&
      matchesCollections &&
      matchesFavorite &&
      matchesPinned &&
      timeframeMatches(entry, filters.timeframe || "all") &&
      dateRangeMatches(entry, filters.startDate, filters.endDate)
    );
  });
};

export const sortEntries = (entries, sortBy = "newest") => {
  const nextEntries = [...entries];

  if (sortBy === "oldest") {
    return nextEntries.sort((left, right) => {
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });
  }

  if (sortBy === "title") {
    return nextEntries.sort((left, right) => left.title.localeCompare(right.title));
  }

  if (sortBy === "updated") {
    return nextEntries.sort((left, right) => {
      return new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime();
    });
  }

  return nextEntries.sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) {
      return left.pinned ? -1 : 1;
    }

    if (Boolean(left.favorite) !== Boolean(right.favorite)) {
      return left.favorite ? -1 : 1;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
};

export const getAllTags = (entries) => {
  return [...new Set(entries.flatMap((entry) => entry.tags || []).map(normalizeTag).filter(Boolean))].sort();
};

export const getAllCollections = (entries) => {
  return [...new Set(entries.map((entry) => normalizeCollection(entry.collection)).filter(Boolean))].sort();
};

export const buildCalendarMatrix = (entries, monthValue) => {
  const activeMonth = normalizeDateValue(monthValue ? `${monthValue}-01` : new Date());
  const monthStart = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
  const monthEnd = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
  const startOffset = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const counts = new Map();

  entries.forEach((entry) => {
    const dayKey = getDayKey(entry.createdAt);
    counts.set(dayKey, (counts.get(dayKey) || 0) + 1);
  });

  const cells = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), day);
    const key = getDayKey(date);

    cells.push({
      key,
      day,
      count: counts.get(key) || 0,
      isToday: key === getDayKey(new Date()),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return {
    monthLabel: monthStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    monthValue: monthStart.toISOString().slice(0, 7),
    cells,
  };
};

export const buildTimelineGroups = (entries) => {
  const groups = new Map();

  sortEntries(entries, "newest").forEach((entry) => {
    const monthKey = getMonthKey(entry.createdAt);

    if (!groups.has(monthKey)) {
      groups.set(monthKey, {
        key: monthKey,
        label: new Date(`${monthKey}-01`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        entries: [],
      });
    }

    groups.get(monthKey).entries.push(entry);
  });

  return Array.from(groups.values());
};

export const buildReflectionSummary = (entries) => {
  const now = new Date();
  const thisWeek = entries.filter((entry) => {
    const createdAt = normalizeDateValue(entry.createdAt);
    return createdAt && now.getTime() - createdAt.getTime() <= 7 * 24 * 60 * 60 * 1000;
  });
  const daySet = new Set(entries.map((entry) => getDayKey(entry.createdAt)).filter(Boolean));
  const sortedDays = [...daySet].sort().reverse();
  let streak = 0;

  for (let index = 0; index < sortedDays.length; index += 1) {
    const current = new Date(`${sortedDays[index]}T00:00:00`);
    const expected = new Date();
    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() - index);

    if (current.toISOString().slice(0, 10) !== expected.toISOString().slice(0, 10)) {
      break;
    }

    streak += 1;
  }

  const topTags = getAllTags(thisWeek)
    .map((tag) => ({
      tag,
      count: thisWeek.filter((entry) => (entry.tags || []).includes(tag)).length,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);

  return {
    totalEntries: entries.length,
    thisWeekCount: thisWeek.length,
    streak,
    topTags,
    favoriteCount: entries.filter((entry) => entry.favorite).length,
  };
};

export const findRelatedEntries = (entry, entries, limit = 4) => {
  const referenceTags = new Set((entry.tags || []).map(normalizeTag));
  const collection = normalizeCollection(entry.collection);
  const titleWords = normalizeText(entry.title)
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return entries
    .filter((candidate) => candidate.id !== entry.id)
    .map((candidate) => {
      const candidateTags = new Set((candidate.tags || []).map(normalizeTag));
      const sharedTags = [...referenceTags].filter((tag) => candidateTags.has(tag)).length;
      const sharedCollection = collection && collection === normalizeCollection(candidate.collection) ? 2 : 0;
      const sharedWords = titleWords.filter((word) => candidate.title.toLowerCase().includes(word)).length;

      return {
        entry: candidate,
        score: sharedTags * 3 + sharedCollection + sharedWords,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((candidate) => candidate.entry);
};

export const findOnThisDayEntries = (entry, entries, limit = 4) => {
  const createdAt = normalizeDateValue(entry.createdAt);

  if (!createdAt) {
    return [];
  }

  const month = createdAt.getMonth();
  const day = createdAt.getDate();

  return sortEntries(entries, "newest")
    .filter((candidate) => {
      const candidateDate = normalizeDateValue(candidate.createdAt);

      return (
        candidate.id !== entry.id &&
        candidateDate &&
        candidateDate.getMonth() === month &&
        candidateDate.getDate() === day
      );
    })
    .slice(0, limit);
};
