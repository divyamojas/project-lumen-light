const buildIsoDate = (daysAgo, hour) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

export const SAMPLE_ENTRIES = [
  {
    id: "seed-arrival-note",
    title: "Arrival note",
    body:
      "Settling into Lumen.\n\nToday I want a journal that helps me notice patterns without making reflection feel heavy.\n\nA few things already feel promising:\n- quick capture\n- calmer browsing\n- room for follow-up thoughts",
    createdAt: buildIsoDate(8, 8),
    updatedAt: buildIsoDate(8, 8),
    tags: ["setup", "intentions"],
    collection: "Getting Started",
    favorite: true,
    pinned: true,
    templateId: "morning",
    promptId: "",
    relatedEntryIds: ["seed-week-review"],
  },
  {
    id: "seed-evening-walk",
    title: "Evening walk helped more than expected",
    body:
      "I went out for a short walk after work and came back much lighter.\n\nThe useful part was not the distance. It was the pause between tasks and home.\n\nI should protect this little buffer more often.",
    createdAt: buildIsoDate(7, 19),
    updatedAt: buildIsoDate(7, 19),
    tags: ["energy", "routine"],
    collection: "Daily Notes",
    favorite: true,
    pinned: false,
    templateId: "evening",
    promptId: "What felt lighter today than it did yesterday?",
    relatedEntryIds: ["seed-friction-log"],
  },
  {
    id: "seed-friction-log",
    title: "Small friction log",
    body:
      "A few things quietly took more energy than they should have.\n- [x] Context switching between tabs\n- [ ] Replying to messages too late\n- [x] Skipping lunch and losing focus\n\nNone of this is dramatic, but it stacks up.",
    createdAt: buildIsoDate(6, 15),
    updatedAt: buildIsoDate(6, 15),
    tags: ["focus", "work"],
    collection: "Patterns",
    favorite: false,
    pinned: false,
    templateId: "blank",
    promptId: "",
    relatedEntryIds: ["seed-evening-walk"],
  },
  {
    id: "seed-week-review",
    title: "Gentle week review",
    body:
      "What worked this week:\n- keeping mornings simple\n- writing before opening too many apps\n- leaving a little empty space in the evening\n\nWhat still needs work:\n- clearer shutdown at the end of the day\n- better handoff between laptop and phone",
    createdAt: buildIsoDate(5, 20),
    updatedAt: buildIsoDate(5, 20),
    tags: ["review", "weekly"],
    collection: "Patterns",
    favorite: true,
    pinned: false,
    templateId: "follow-up",
    promptId: "What do I need more of this week?",
    relatedEntryIds: ["seed-arrival-note", "seed-focus-reset"],
  },
  {
    id: "seed-focus-reset",
    title: "Midday focus reset",
    body:
      "I stopped trying to rescue the whole afternoon and just picked the next clear step.\n\nThat worked better than making a heroic new plan.\n\nOne clear task is often enough to get momentum back.",
    createdAt: buildIsoDate(4, 13),
    updatedAt: buildIsoDate(4, 13),
    tags: ["focus", "reset"],
    collection: "Daily Notes",
    favorite: false,
    pinned: false,
    templateId: "morning",
    promptId: "",
    relatedEntryIds: ["seed-friction-log"],
  },
  {
    id: "seed-gratitude-list",
    title: "Three quiet wins",
    body:
      "Three things I appreciated today:\n- the house felt calm in the early morning\n- I finished one important task before lunch\n- dinner was simple and good",
    createdAt: buildIsoDate(3, 21),
    updatedAt: buildIsoDate(3, 21),
    tags: ["gratitude", "calm"],
    collection: "Daily Notes",
    favorite: false,
    pinned: false,
    templateId: "gratitude",
    promptId: "",
    relatedEntryIds: [],
  },
  {
    id: "seed-reading-note",
    title: "A paragraph worth remembering",
    body:
      "I came across a line today about building a life with less unnecessary urgency.\n\nThat phrase stayed with me because a lot of my stress is not from the task itself, but from how quickly I expect myself to move through it.",
    createdAt: buildIsoDate(2, 18),
    updatedAt: buildIsoDate(2, 18),
    tags: ["reading", "reflection"],
    collection: "Ideas",
    favorite: true,
    pinned: false,
    templateId: "blank",
    promptId: "What moment do I want to remember in detail?",
    relatedEntryIds: ["seed-week-review"],
  },
  {
    id: "seed-tomorrow-note",
    title: "Tomorrow only needs a clear start",
    body:
      "I do not need a perfect plan for tomorrow.\n\nI only need:\n- [ ] one clear first task\n- [ ] a realistic lunch break\n- [ ] a short walk before evening\n\nThat feels lighter already.",
    createdAt: buildIsoDate(1, 22),
    updatedAt: buildIsoDate(1, 22),
    tags: ["planning", "tomorrow"],
    collection: "Daily Notes",
    favorite: false,
    pinned: true,
    templateId: "evening",
    promptId: "",
    relatedEntryIds: ["seed-focus-reset"],
  },
];

export default SAMPLE_ENTRIES;
