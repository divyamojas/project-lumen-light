/**
 * Feature flags for Lumen.
 *
 * This file tracks shipped vs planned product capabilities.
 * It is not a subscription or entitlement system.
 *
 * To gate a feature: wrap in `if (hasFeature('feature_name'))`.
 * Keep shipped runtime features here and leave roadmap-only work out until it lands.
 */

const SHIPPED_FEATURES = new Set([
  "journal_type_personal",
  "journal_type_science",
  "journal_type_travel",
  "journal_type_fitness",
  "journal_type_work",
  "journal_type_creative",
  "export_json",
  "export_encrypted",
  "search",
  "dark_mode",
  "calendar_view",
  "timeline_view",
]);

export function hasFeature(featureName) {
  return SHIPPED_FEATURES.has(featureName);
}
