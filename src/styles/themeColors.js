// ─── Theme-aware color palettes ─────────────────────────────────────────────
// `surface` is the card/sheet background color — use this (not `white`) for
// any backgroundColor that should flip between light and dark. `white` stays
// literal pure white everywhere, since it's used for text/icons drawn on top
// of solid-color buttons and badges, which keep the same vivid colors in both
// themes. `heroGradient` and `accentBtnBg`/`switchTrackOn` exist because a couple
// of spots need a value that behaves differently from their light-mode sibling
// (light hero banner is a vivid green gradient; dark hero is flat and blends
// into the page, per the reference design).

export const lightColors = {
  orange: "#F97316", orangeDark: "#EA580C", orangeLight: "#FFF7ED",
  green: "#16A34A", greenDark: "#15803D",
  greenLight: "#F0FDF4", greenBorder: "#BBF7D0",
  greenMid: "#DCFCE7",
  blue: "#3B82F6", blueLight: "#EFF6FF",
  purple: "#8B5CF6", purpleLight: "#F5F3FF",
  gold: "#F59E0B", goldLight: "#FFFBEB", goldBorder: "#FDE68A",

  white: "#FFFFFF",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  accentBtnBg: "#DCFCE7",
  switchTrackOn: "#DCFCE7",
  heroDecor: "rgba(255,255,255,0.08)",
  heroGradient: ["#15803D", "#16A34A", "#22C55E"],

  gray100: "#F3F4F6", gray200: "#E5E7EB",
  gray300: "#D1D5DB", gray400: "#9CA3AF",
  gray500: "#6B7280", gray600: "#4B5563",
  gray700: "#374151", gray900: "#111827",

  red: "#EF4444", redLight: "#FEF2F2",
};

export const darkColors = {
  orange: "#FB923C", orangeDark: "#F97316", orangeLight: "#241C11",
  green: "#3EA37D", greenDark: "#EAF6EF",
  greenLight: "#0E211B", greenBorder: "#255C44",
  greenMid: "#1B2E29",
  blue: "#60A5FA", blueLight: "#132238",
  purple: "#A78BFA", purpleLight: "#211A34",
  gold: "#3EA37D", goldLight: "#0E211B", goldBorder: "#255C44",

  white: "#FFFFFF",
  bg: "#0A1B1B",
  surface: "#0A1B1B",
  accentBtnBg: "#11754D",
  switchTrackOn: "#1F7A52",
  heroDecor: "rgba(255,255,255,0.02)",
  // Nearly flat — the reference design has no visible green banner in dark
  // mode, just a very faint lift so the hero area still reads as a section.
  heroGradient: ["#081513", "#0A1B1B", "#0E211D"],

  gray100: "#132523", gray200: "#1C3330",
  gray300: "#4A625E", gray400: "#7C948E",
  gray500: "#93A6A1", gray600: "#B7C4C0",
  gray700: "#D5DEDB", gray900: "#F1F5F3",

  red: "#F87171", redLight: "#301616",
};

export const getThemeColors = (scheme) => (scheme === "dark" ? darkColors : lightColors);