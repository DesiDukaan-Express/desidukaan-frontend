import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Stored preference values: "light" | "dark" | "default".
// "default" follows the device's appearance setting.
const STORAGE_KEY = "app_theme_mode";
const VALID_MODES = ["light", "dark", "default"];

export const lightColors = {
  mode: "light",
  orange: "#F97316",
  orangeDark: "#EA580C",
  orangeLight: "#FFF7ED",
  green: "#16A34A",
  greenDark: "#15803D",
  greenLight: "#F0FDF4",
  greenBorder: "#BBF7D0",
  greenMid: "#DCFCE7",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  gold: "#F59E0B",
  goldLight: "#FFFBEB",
  goldBorder: "#FDE68A",
  white: "#FFFFFF",
  surface: "#FFFFFF",
  bg: "#F8FAFC",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray900: "#111827",
  red: "#EF4444",
  redLight: "#FEF2F2",
  overlayDark: "#111827",
  statusBar: "dark",
};

export const darkColors = {
  mode: "dark",
  orange: "#DB7A33",
  orangeDark: "#C9691F",
  orangeLight: "#2A2019",
  green: "#2F9E68",
  greenDark: "#3AA673",
  greenLight: "#172720",
  greenBorder: "#2B4A3B",
  greenMid: "#1C3027",
  blue: "#5B95D6",
  blueLight: "#18212D",
  purple: "#8A7CCB",
  purpleLight: "#211F2E",
  gold: "#D9A03F",
  goldLight: "#292319",
  goldBorder: "#4D3E22",
  white: "#FFFFFF",
  surface: "#171A1F",
  bg: "#0F1216",
  gray100: "#1F2329",
  gray200: "#2E343C",
  gray300: "#3D434C",
  gray400: "#6A727E",
  gray500: "#8A929E",
  gray600: "#A4ABB6",
  gray700: "#BFC5CE",
  gray900: "#ECEFF3",
  red: "#DE5C5C",
  redLight: "#2C1E20",
  overlayDark: "#111827",
  statusBar: "light",
};

const ThemeContext = createContext({
  mode: "default",
  isDark: false,
  colors: lightColors,
  isReady: false,
  setMode: async () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState("default");
  const [isReady, setIsReady] = useState(false);

  // Load the saved preference once when the provider mounts.
  useEffect(() => {
    let isMounted = true;

    const loadSavedMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (isMounted && VALID_MODES.includes(savedMode)) {
          setModeState(savedMode);
        }
      } catch (error) {
        console.warn("Unable to load saved theme preference:", error);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };

    loadSavedMode();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update the UI immediately and persist the selected preference.
  const setMode = useCallback(async (nextMode) => {
    if (!VALID_MODES.includes(nextMode)) {
      console.warn("Invalid theme mode:", nextMode);
      return;
    }

    setModeState(nextMode);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch (error) {
      console.error("Unable to save theme preference:", error);
      throw error;
    }
  }, []);

  const isDark = mode === "default"
    ? systemScheme === "dark"
    : mode === "dark";

  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, isDark, colors, isReady, setMode }),
    [mode, isDark, colors, isReady, setMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
