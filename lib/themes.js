/**
 * Theme pipeline (current status):
 * Phase 1 (now):  user can manually set a mood/theme per entry
 * Phase 5 (planned): AWS Comprehend will auto-detect and set theme on save
 *
 * Themes map to sentiment bands:
 * neutral   → no mood set
 * calm      → positive, peaceful (Comprehend: POSITIVE, low arousal)
 * energised → positive, high energy (POSITIVE, high arousal)
 * reflective→ mixed/neutral sentiment
 * heavy     → negative (NEGATIVE)
 * anxious   → negative, high arousal (NEGATIVE, high arousal)
 */
export const THEMES = {
  neutral: {
    label: "No mood",
    accent: "#8D98B8",
    dark: { cardBg: "#25283B", accent: "#8D98B8" },
    light: { cardBg: "#FFFCF8", accent: "#8E99AE" },
  },
  calm: {
    label: "Calm",
    accent: "#7BC0FF",
    dark: { cardBg: "#1E3144", accent: "#7BC0FF" },
    light: { cardBg: "#F6FBFF", accent: "#60A5FA" },
  },
  energised: {
    label: "Energised",
    accent: "#F6C65B",
    dark: { cardBg: "#342918", accent: "#F6C65B" },
    light: { cardBg: "#FFF9EE", accent: "#E8B648" },
  },
  reflective: {
    label: "Reflective",
    accent: "#9BA1FF",
    dark: { cardBg: "#22233B", accent: "#9BA1FF" },
    light: { cardBg: "#F7F5FF", accent: "#8B90F3" },
  },
  heavy: {
    label: "Heavy",
    accent: "#6080CC",
    dark: { cardBg: "#1A2030", accent: "#6080CC" },
    light: { cardBg: "#F0F4FF", accent: "#5470C0" },
  },
  anxious: {
    label: "Anxious",
    accent: "#FF8D8D",
    dark: { cardBg: "#352223", accent: "#FF8D8D" },
    light: { cardBg: "#FFF5F4", accent: "#F28A8A" },
  },
};

export const getThemePalette = (themeKey, appearance = "dark") => {
  const theme = THEMES[themeKey] || THEMES.neutral;
  const palette = theme[appearance] || theme.dark;
  return palette;
};

export default THEMES;
