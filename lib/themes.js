export const THEMES = {
  neutral: {
    dark: { cardBg: "#25283B", accent: "#8D98B8" },
    light: { cardBg: "#FFFCF8", accent: "#8E99AE" },
  },
  calm: {
    dark: { cardBg: "#1E3144", accent: "#7BC0FF" },
    light: { cardBg: "#F6FBFF", accent: "#60A5FA" },
  },
  joyful: {
    dark: { cardBg: "#342918", accent: "#F6C65B" },
    light: { cardBg: "#FFF9EE", accent: "#E8B648" },
  },
  melancholic: {
    dark: { cardBg: "#22233B", accent: "#9BA1FF" },
    light: { cardBg: "#F7F5FF", accent: "#8B90F3" },
  },
  anxious: {
    dark: { cardBg: "#352223", accent: "#FF8D8D" },
    light: { cardBg: "#FFF5F4", accent: "#F28A8A" },
  },
  angry: {
    dark: { cardBg: "#381F1F", accent: "#FF7272" },
    light: { cardBg: "#FFF3F1", accent: "#E96767" },
  },
  reflective: {
    dark: { cardBg: "#1E322D", accent: "#52D5A4" },
    light: { cardBg: "#F3FBF7", accent: "#41C18F" },
  },
};

export const getThemePalette = (themeKey, appearance = "dark") => {
  const theme = THEMES[themeKey] || THEMES.neutral;
  return theme[appearance] || theme.dark;
};

export default THEMES;
