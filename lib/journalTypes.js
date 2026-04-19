export const JOURNAL_TYPES = {
  personal: {
    id: "personal",
    label: "Personal",
    tagline: "Your life, your way",
    description: "Daily thoughts, memories, and reflections.",
    icon: "✦",
    accentRamp: "purple",
    extraFields: [],
    promptLibrary: [
      "What made today different?",
      "What are you grateful for right now?",
      "Describe a moment you want to remember.",
      "What would you tell yourself from a year ago?",
      "What's been on your mind lately?",
    ],
    templates: [
      { id: "daily", label: "Daily reflection", body: "**Morning intention:**\n\n**How the day went:**\n\n**One thing I learned:**\n" },
      { id: "gratitude", label: "Gratitude log", body: "Three things I'm grateful for:\n1. \n2. \n3. \n\nWhy these matter:\n" },
    ],
  },

  science: {
    id: "science",
    label: "Science",
    tagline: "Hypothesis to conclusion",
    description: "Structured lab notes, experiment logs, and research observations.",
    icon: "⬡",
    accentRamp: "teal",
    extraFields: [
      { key: "hypothesis", label: "Hypothesis", type: "text", placeholder: "What do you expect to observe?" },
      { key: "method", label: "Method", type: "textarea", placeholder: "Describe the procedure." },
      { key: "results", label: "Results", type: "textarea", placeholder: "What did you observe?" },
      { key: "conclusion", label: "Conclusion", type: "textarea", placeholder: "What does this mean?" },
    ],
    promptLibrary: [
      "What was your hypothesis going in?",
      "What did you observe that surprised you?",
      "What would you change in the next run?",
      "Are your results reproducible? Why or why not?",
      "What does this experiment rule out?",
    ],
    templates: [
      { id: "experiment", label: "Experiment log", body: "**Hypothesis:**\n\n**Method:**\n\n**Results:**\n\n**Conclusion:**\n\n**Next steps:**\n" },
      { id: "observation", label: "Field observation", body: "**Date/Time:**\n**Location:**\n\n**Observations:**\n\n**Questions raised:**\n" },
    ],
  },

  travel: {
    id: "travel",
    label: "Travel",
    tagline: "Every place, every moment",
    description: "Trip logs, destination notes, and travel memories.",
    icon: "◈",
    accentRamp: "amber",
    extraFields: [
      { key: "location", label: "Location", type: "text", placeholder: "City, country or landmark" },
      { key: "weather", label: "Weather", type: "text", placeholder: "Sunny, 24°C" },
      { key: "transport_mode", label: "How you got there", type: "text", placeholder: "Bus, motorbike, flight…" },
    ],
    promptLibrary: [
      "Describe the first thing you noticed arriving here.",
      "What did you eat today and what did it taste like?",
      "What moment do you most want to remember from today?",
      "What surprised you about this place?",
      "How has this place changed how you see things?",
    ],
    templates: [
      { id: "day-log", label: "Day log", body: "**Where I am:**\n**How I got here:**\n\n**Today in brief:**\n\n**Standout moment:**\n\n**What I'd tell someone visiting:**\n" },
    ],
  },

  fitness: {
    id: "fitness",
    label: "Fitness",
    tagline: "Track every rep, every run",
    description: "Workout logs, progress notes, and body-awareness journaling.",
    icon: "◎",
    accentRamp: "coral",
    extraFields: [
      { key: "workout_type", label: "Workout type", type: "text", placeholder: "Run, lift, yoga, swim…" },
      { key: "duration_min", label: "Duration (min)", type: "number", placeholder: "45" },
      { key: "rpe", label: "Effort (RPE 1–10)", type: "number", placeholder: "7" },
    ],
    promptLibrary: [
      "How did your body feel today vs last week?",
      "What held you back — or what clicked?",
      "What will you do differently next session?",
      "How is your energy, sleep, and recovery?",
      "What's one metric you want to improve?",
    ],
    templates: [
      { id: "workout", label: "Workout log", body: "**Type:** \n**Duration:** \n**Effort (RPE):** \n\n**What I did:**\n\n**How it felt:**\n\n**Next goal:**\n" },
    ],
  },

  work: {
    id: "work",
    label: "Work",
    tagline: "Decisions, context, progress",
    description: "Project logs, meeting notes, decisions, and work reflections.",
    icon: "▣",
    accentRamp: "blue",
    extraFields: [
      { key: "project", label: "Project", type: "text", placeholder: "Project name or ticket" },
      { key: "stakeholders", label: "Stakeholders", type: "text", placeholder: "Who's involved" },
    ],
    promptLibrary: [
      "What decision did you make today and why?",
      "What's blocking progress? What would unblock it?",
      "What did you learn from a meeting or conversation?",
      "What are the open action items?",
      "What context would future-you need to understand today?",
    ],
    templates: [
      { id: "decision", label: "Decision log", body: "**Decision:**\n\n**Why:**\n\n**Alternatives considered:**\n\n**Owner:**\n\n**Review date:**\n" },
      { id: "meeting", label: "Meeting notes", body: "**Meeting:**\n**Attendees:**\n\n**Key points:**\n\n**Decisions made:**\n\n**Action items:**\n- [ ] \n" },
    ],
  },

  creative: {
    id: "creative",
    label: "Creative",
    tagline: "Ideas without judgment",
    description: "Story drafts, creative ideas, worldbuilding, and writing practice.",
    icon: "◇",
    accentRamp: "pink",
    extraFields: [
      { key: "genre", label: "Genre / form", type: "text", placeholder: "Short story, poem, script…" },
      { key: "word_count_target", label: "Word count target", type: "number", placeholder: "500" },
      { key: "draft_number", label: "Draft #", type: "number", placeholder: "1" },
    ],
    promptLibrary: [
      "Start with a character who wants something they can't have.",
      "Describe a place that doesn't exist but should.",
      "Write the first scene of a story that starts in the middle.",
      "What does your protagonist fear more than anything?",
      "Write one page with no dialogue at all.",
    ],
    templates: [
      { id: "draft", label: "Story draft", body: "**Title (working):**\n**Genre:**\n**Draft #:**\n\n---\n\n" },
      { id: "brainstorm", label: "Idea dump", body: "**Core idea:**\n\n**What if...:**\n- \n- \n- \n\n**Characters / voices:**\n\n**Open questions:**\n" },
    ],
  },
};

export const JOURNAL_TYPE_LIST = Object.values(JOURNAL_TYPES);

export function getJournalType(id) {
  return JOURNAL_TYPES[id] ?? JOURNAL_TYPES.personal;
}

export function getExtraFields(journalType) {
  return JOURNAL_TYPES[journalType]?.extraFields ?? [];
}

export function getPrompts(journalType) {
  return JOURNAL_TYPES[journalType]?.promptLibrary ?? [];
}

export function getTemplates(journalType) {
  return JOURNAL_TYPES[journalType]?.templates ?? [];
}
