import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

// ─── Theme mode store ───────────────────────────────────────────────────────
// mode:   "light" | "dark" | "default"   (what the user picked)
// scheme: "light" | "dark"               (what should actually be rendered)
//
// "default" means "follow the device's system appearance". In that case
// `scheme` tracks the OS setting live (via Appearance.addChangeListener).

const THEME_KEY = "theme_mode";

const resolveScheme = (mode) => {
  if (mode === "light" || mode === "dark") return mode;
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
};

const useThemeStore = create((set, get) => ({
  mode: "default",
  scheme: resolveScheme("default"),
  hydrated: false,

  // Load the saved preference (call this once on app start — it's also
  // called automatically below the first time this module is imported).
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      const mode = saved === "light" || saved === "dark" || saved === "default" ? saved : "default";
      set({ mode, scheme: resolveScheme(mode), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  // Switch theme. Persists the choice so it survives app restarts.
  setMode: async (mode) => {
    set({ mode, scheme: resolveScheme(mode) });
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch {
      // best-effort persistence; theme still applies for this session
    }
  },
}));

// Keep `scheme` in sync with OS-level light/dark changes while mode === "default"
Appearance.addChangeListener(({ colorScheme }) => {
  if (useThemeStore.getState().mode === "default") {
    useThemeStore.setState({ scheme: colorScheme === "dark" ? "dark" : "light" });
  }
});

// Fire-and-forget hydration as soon as the store is first imported, so any
// screen that uses it picks up the saved preference without extra wiring.
useThemeStore.getState().hydrate();

export default useThemeStore;