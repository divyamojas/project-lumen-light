/**
 * Feature flags for Lumen.
 *
 * Tier system (not yet enforced — gates are scaffolded only):
 *   free  → core journaling, 1 journal type, local export
 *   pro   → all 6 journal types, S3 sync, AI features
 *   self  → full feature set, self-hosted
 *
 * To gate a feature: wrap in `if (hasFeature('feature_name'))`.
 * Enforcement happens server-side (add to backend when monetization ships).
 * For now, all flags return true — this is scaffolding only.
 */

const USER_TIER = "self"; // placeholder — replace with API response

const FEATURE_MAP = {
  free: [
    "journal_type_personal",
    "export_json",
    "search",
    "dark_mode",
  ],
  pro: [
    "journal_type_personal",
    "journal_type_science",
    "journal_type_travel",
    "journal_type_fitness",
    "journal_type_work",
    "journal_type_creative",
    "export_json",
    "export_encrypted",
    "s3_sync",
    "ai_query",
    "sentiment_themes",
    "search",
    "dark_mode",
    "calendar_view",
    "timeline_view",
  ],
  self: ["*"], // all features
};

export function hasFeature(featureName) {
  const tier = USER_TIER;
  const features = FEATURE_MAP[tier] ?? FEATURE_MAP.free;
  if (features.includes("*")) return true;
  return features.includes(featureName);
}

export function getUserTier() {
  return USER_TIER;
}
