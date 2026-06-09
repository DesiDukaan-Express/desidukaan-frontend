import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import useAddressStore from "./addressStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Secure storage helpers (SecureStore on native, AsyncStorage on web) ──────
// expo-secure-store is not supported on web; we fall back to AsyncStorage there.

const REFRESH_KEY = "refresh_token";

const secureGet = async (key) => {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
};

const secureSet = async (key, value) => {
  if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
};

const secureDelete = async (key) => {
  if (Platform.OS === "web") return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
};

// ─── Token refresh helper (called from api.js on TOKEN_EXPIRED) ───────────────

/**
 * Attempts to exchange the stored refresh token for a new access + refresh pair.
 * Returns the new access token on success, null on failure (forces logout).
 */
export const tryRefreshToken = async () => {
  try {
    const refreshToken = await secureGet(REFRESH_KEY);
    if (!refreshToken) return null;

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();
    if (!res.ok) return null;

    // Persist new tokens
    useAuthStore.getState()._setAccessToken(data.accessToken);
    await secureSet(REFRESH_KEY, data.refreshToken);

    return data.accessToken;
  } catch {
    return null;
  }
};

// ─── Auth Store ───────────────────────────────────────────────────────────────

const useAuthStore = create((set, get) => ({
  user: null,
  // accessToken lives in memory ONLY — never written to disk
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  // Internal setter used by tryRefreshToken without triggering a full re-login
  _setAccessToken: (accessToken) => set({ token: accessToken }),

  // ── Hydrate: called on app start ──────────────────────────────────────────
  // We only persist the user object + refresh token.
  // On boot, if a refresh token exists, we silently refresh to get an access token.
  hydrate: async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) {
        set({ isLoading: false });
        return;
      }

      const user = JSON.parse(userStr);
      const newAccessToken = await tryRefreshToken();

      if (newAccessToken) {
        set({
          token: newAccessToken,
          user,
          role: user.role,
          isAuthenticated: true,
          isLoading: false,
        });
        await useAddressStore.getState().loadAddresses(newAccessToken);
      } else {
        // Refresh token missing or expired — clear session
        await AsyncStorage.removeItem("user");
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  // ── Login: called after OTP verify / password login ──────────────────────
  login: async (userData, accessToken, refreshToken) => {
    // accessToken stays in memory only
    // refreshToken goes to secure storage
    // user goes to AsyncStorage (not sensitive)
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    if (refreshToken) await secureSet(REFRESH_KEY, refreshToken);
    set({
      user: userData,
      token: accessToken,
      role: userData.role,
      isAuthenticated: true,
    });
  },

  // ── Logout: revoke refresh token on server + clear local state ────────────
  logout: async () => {
    try {
      const refreshToken = await secureGet(REFRESH_KEY);
      if (refreshToken) {
        // Best-effort server revocation — don't block logout if it fails
        fetch(`${BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
    } finally {
      await AsyncStorage.removeItem("user");
      await secureDelete(REFRESH_KEY);
      useAddressStore.getState().clearAddresses();
      set({ user: null, token: null, role: null, isAuthenticated: false });
    }
  },

  updateUser: (updates) =>
    set((state) => ({
      user: { ...state.user, ...updates },
    })),
}));

export default useAuthStore;