import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Persisted preference key. Value is one of: "light" | "dark" | "default"
// "default" means: follow the phone's system appearance setting.
const STORAGE_KEY = "app_theme_mode";

// ─── Light palette (existing app colors) ───────────────────────────────────
export const lightColors = {
  mode: "light",
  orange: "#F97316", orangeDark: "#EA580C", orangeLight: "#FFF7ED",
  green: "#16A34A", greenDark: "#15803D",
  greenLight: "#F0FDF4", greenBorder: "#BBF7D0",
  greenMid: "#DCFCE7",
  blue: "#3B82F6", blueLight: "#EFF6FF",
  purple: "#8B5CF6", purpleLight: "#F5F3FF",
  gold: "#F59E0B", goldLight: "#FFFBEB", goldBorder: "#FDE68A",
  white: "#FFFFFF",
  surface: "#FFFFFF",
  bg: "#F8FAFC",
  gray100: "#F3F4F6", gray200: "#E5E7EB",
  gray300: "#D1D5DB", gray400: "#9CA3AF",
  gray500: "#6B7280", gray600: "#4B5563",
  gray700: "#374151", gray900: "#111827",
  red: "#EF4444", redLight: "#FEF2F2",
  overlayDark: "#111827",
  statusBar: "dark",
};

// ─── Dark palette ───────────────────────────────────────────────────────────
// The gray "ramp" is inverted on purpose: in the component styles, gray100
// always plays the role of "subtlest surface/border" and gray900 always plays
// the role of "strongest text", regardless of theme. Inverting the literal
// lightness of the ramp keeps every existing style rule correct without
// having to touch each usage.
export const darkColors = {
  mode: "dark",
  orange: "#DB7A33", orangeDark: "#C9691F", orangeLight: "#2A2019",
  green: "#2F9E68", greenDark: "#3AA673",
  greenLight: "#172720", greenBorder: "#2B4A3B",
  greenMid: "#1C3027",
  blue: "#5B95D6", blueLight: "#18212D",
  purple: "#8A7CCB", purpleLight: "#211F2E",
  gold: "#D9A03F", goldLight: "#292319", goldBorder: "#4D3E22",
  white: "#FFFFFF",
  surface: "#171A1F",
  bg: "#0F1216",
  gray100: "#1F2329", gray200: "#2E343C",
  gray300: "#3D434C", gray400: "#6A727E",
  gray500: "#8A929E", gray600: "#A4ABB6",
  gray700: "#BFC5CE", gray900: "#ECEFF3",
  red: "#DE5C5C", redLight: "#2C1E20",
  overlayDark: "#111827",
  statusBar: "light",
};

const ThemeContext = createContext({
  mode: "default",
  isDark: false,
  colors: lightColors,
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState("default"); // "light" | "dark" | "default"

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "default") setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = (next) => {
    if (next !== "light" && next !== "dark" && next !== "default") return;
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const isDark = mode === "default" ? systemScheme === "dark" : mode === "dark";
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode }),
    [mode, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
