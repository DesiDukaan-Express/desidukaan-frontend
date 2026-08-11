import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import useAddressStore from "./addressStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Secure storage helpers (SecureStore on native, AsyncStorage on web) ──────
// expo-secure-store is not supported on web; we fall back to AsyncStorage there.

const REFRESH_KEY = "refresh_token";
const ACTIVE_ROLE_KEY = "active_role";
const ENABLED_ROLES_KEY = "enabled_roles";

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

const ALL_ROLES = ["customer", "vendor", "delivery"];

const loadPersistedEnabledRoles = async (userRoles = []) => {
  try {
    const stored = await AsyncStorage.getItem(ENABLED_ROLES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.from(new Set([...userRoles, ...parsed].filter(Boolean)));
  } catch {
    return Array.from(new Set([...userRoles].filter(Boolean)));
  }
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
    if (!res.ok) {
      if (res.status === 403 && data.error === "ACCOUNT_DEACTIVATED") {
        return { error: "ACCOUNT_DEACTIVATED" };
      }
      if (res.status === 401 || res.status === 403) {
        return { error: "INVALID_TOKEN" };
      }
      return null;
    }

    // Persist new tokens and user details if returned
    useAuthStore.getState()._setAccessToken(data.accessToken);
    await secureSet(REFRESH_KEY, data.refreshToken);
    if (data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      const backendRoles = data.user.roles || (data.user.role ? [data.user.role] : []);
      const enabledRoles = await loadPersistedEnabledRoles(backendRoles);
      await AsyncStorage.setItem(ENABLED_ROLES_KEY, JSON.stringify(enabledRoles));
      useAuthStore.setState({
        user: data.user,
        role: data.user.role,
        enabledRoles,
        accountDeactivated: false,
      });
    }

    return { token: data.accessToken, user: data.user };
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
  // activeRole: the role currently being used in the UI (set from role picker)
  // null means the picker hasn't been shown yet this session
  activeRole: null,
  // enabledRoles: all roles this user has unlocked
  enabledRoles: ["customer", "vendor", "delivery"],
  isAuthenticated: false,
  isLoading: true,
  // accountDeactivated: true → the full-screen "Account Deactivated" block
  // screen is shown and all app interaction is prevented.
  accountDeactivated: false,
  // vendorSuspended: true → the full-screen "Account Suspended" block screen
  // is shown to the vendor role. Scoped to the vendor role only (a suspended
  // shop does not block the same user from using the app as a customer).
  vendorSuspended: false,

  // Internal setter used by tryRefreshToken without triggering a full re-login
  _setAccessToken: (accessToken) => set({ token: accessToken }),

  // ── Add/ensure a role is enabled and persisted ───────────────────────────
  addEnabledRole: async (role) => {
    if (!role) return;
    const current = get().enabledRoles || ["customer"];
    if (!current.includes(role)) {
      const updated = Array.from(new Set([...current, role]));
      await AsyncStorage.setItem(ENABLED_ROLES_KEY, JSON.stringify(updated));
      set({ enabledRoles: updated });
    }
  },

  // ── Set active role (called by role picker) ──────────────────────────────
  setActiveRole: async (role) => {
    if (role === null || role === undefined) {
      // Clear active role → will trigger role picker to appear
      await AsyncStorage.removeItem(ACTIVE_ROLE_KEY);
      set({ activeRole: null });
    } else {
      await AsyncStorage.setItem(ACTIVE_ROLE_KEY, role);
      set({ activeRole: role });
    }
  },

  // ── Enable a new role via API, then set it as active ─────────────────────
  enableRole: async (role) => {
    const { token } = get();
    try {
      const res = await fetch(`${BASE_URL}/auth/me/roles`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      const currentEnabled = get().enabledRoles || ["customer"];
      let newRoles;
      if (res.ok && data.roles) {
        newRoles = Array.from(new Set([...currentEnabled, ...data.roles, role]));
      } else {
        newRoles = Array.from(new Set([...currentEnabled, role]));
      }
      await AsyncStorage.setItem(ENABLED_ROLES_KEY, JSON.stringify(newRoles));
      set((state) => ({
        enabledRoles: newRoles,
        user: data.user ? data.user : state.user,
      }));
      if (data.user) {
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
      }
      return { success: true };
    } catch {
      const currentEnabled = get().enabledRoles || ["customer"];
      const newRoles = Array.from(new Set([...currentEnabled, role]));
      await AsyncStorage.setItem(ENABLED_ROLES_KEY, JSON.stringify(newRoles));
      set({ enabledRoles: newRoles });
      return { success: true };
    }
  },

  // ── Hydrate: called on app start ──────────────────────────────────────────
  // We only persist the user object + refresh token.
  // On boot, if a refresh token exists, we silently refresh to get an access token.
  hydrate: async () => {
    try {
      const refreshToken = await secureGet(REFRESH_KEY);
      if (!refreshToken) {
        set({ isLoading: false });
        return;
      }

      // Try refreshing the token to restore the session
      const refreshResult = await tryRefreshToken();

      if (refreshResult && refreshResult.token) {
        const currentUser = refreshResult.user;
        const backendRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
        const enabledRoles = await loadPersistedEnabledRoles(backendRoles);
        await AsyncStorage.setItem(ENABLED_ROLES_KEY, JSON.stringify(enabledRoles));
        set({
          token: refreshResult.token,
          user: currentUser,
          role: currentUser ? currentUser.role : null,
          enabledRoles,
          activeRole: null,   // ← always null on app open → triggers role picker
          isAuthenticated: true,
          accountDeactivated: false,
          isLoading: false,
        });
        await useAddressStore.getState().loadAddresses(refreshResult.token);
      } else if (refreshResult && refreshResult.error === "ACCOUNT_DEACTIVATED") {
        set({ accountDeactivated: true, isLoading: false });
      } else if (refreshResult && refreshResult.error === "INVALID_TOKEN") {
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem(ACTIVE_ROLE_KEY);
        await AsyncStorage.removeItem(ENABLED_ROLES_KEY);
        await secureDelete(REFRESH_KEY);
        set({ isLoading: false });
      } else {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const backendRoles = user.roles || (user.role ? [user.role] : []);
          const enabledRoles = await loadPersistedEnabledRoles(backendRoles);
          set({
            user,
            role: user.role,
            enabledRoles,
            activeRole: null,   // ← always null on app open → triggers role picker
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      }
    } catch {
      set({ isLoading: false });
    }
  },

  // ── Login: called after OTP verify / password login ──────────────────────
  login: async (userData, accessToken, refreshToken) => {
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    if (refreshToken) await secureSet(REFRESH_KEY, refreshToken);
    const backendRoles = userData.roles || (userData.role ? [userData.role] : []);
    const enabledRoles = await loadPersistedEnabledRoles(backendRoles);
    await AsyncStorage.setItem(ENABLED_ROLES_KEY, JSON.stringify(enabledRoles));
    set({
      user: userData,
      token: accessToken,
      role: userData.role,
      enabledRoles,
      activeRole: null,   // picker will show after login
      isAuthenticated: true,
      accountDeactivated: false,
    });
  },

  // ── Logout: revoke refresh token on server + clear local state ────────────
  logout: async () => {
    try {
      const refreshToken = await secureGet(REFRESH_KEY);
      if (refreshToken) {
        fetch(`${BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
    } catch (_) {}
    try { await AsyncStorage.removeItem("user"); } catch (_) {}
    try { await AsyncStorage.removeItem(ACTIVE_ROLE_KEY); } catch (_) {}
    try { await AsyncStorage.removeItem(ENABLED_ROLES_KEY); } catch (_) {}
    try { await secureDelete(REFRESH_KEY); } catch (_) {}
    try { useAddressStore.getState().clearAddresses(); } catch (_) {}
    set({ user: null, token: null, role: null, activeRole: null, enabledRoles: ["customer", "vendor", "delivery"], isAuthenticated: false, accountDeactivated: false, vendorSuspended: false });
  },

  updateUser: (updates) =>
    set((state) => ({
      user: { ...state.user, ...updates },
    })),

  // ── Flag account as deactivated (called by login screens / live poll) ────
  flagDeactivated: () => set({ accountDeactivated: true }),

  // ── Clear the deactivated block (called on live "account:reactivated") ───
  clearDeactivation: () => set({ accountDeactivated: false }),

  // ── Flag the vendor's shop as suspended (socket "vendor:suspended") ──────
  flagVendorSuspended: () => set({ vendorSuspended: true }),

  // ── Clear the vendor suspension block (socket "vendor:reactivated") ──────
  clearVendorSuspended: () => set({ vendorSuspended: false }),

  // ── Live vendor-status check ─────────────────────────────────────────────
  // Called periodically + on app foreground while authenticated as a vendor,
  // as a fallback in case the vendor's socket wasn't connected when the admin
  // suspended the shop. If the backend reports is_active=false or
  // onboarding_status="suspended", we flag it so the block appears immediately
  // (no reload required).
  checkVendorStatus: async () => {
    const { token, isAuthenticated, activeRole, vendorSuspended } = get();
    // Only relevant when the user is using the vendor role.
    if (!token || !isAuthenticated || activeRole !== "vendor") return;

    try {
      const res = await fetch(`${BASE_URL}/vendors/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return; // ignore TOKEN_EXPIRED etc. — normal refresh flow handles it
      const data = await res.json();
      const vendor = data?.data?.vendor;
      if (!vendor) return;

      const isSuspended =
        vendor.is_active === false || vendor.onboarding_status === "suspended";
      if (isSuspended !== vendorSuspended) {
        set({ vendorSuspended: isSuspended });
      }
    } catch {
      // network error — leave as-is, retry on next tick
    }
  },

  // ── Live account-status check ─────────────────────────────────────────────
  // Called periodically + on app foreground while authenticated. If the
  // backend reports is_active=false (admin deactivated the account), we flag
  // it so the full-screen block appears immediately, without needing a reload.
  checkAccountStatus: async () => {
    const { token, isAuthenticated, accountDeactivated } = get();
    if (!token || !isAuthenticated || accountDeactivated) return;

    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return; // ignore TOKEN_EXPIRED etc. — normal refresh flow handles it
      const data = await res.json();
      if (data.user && data.user.is_active === false) {
        set({ accountDeactivated: true });
        return;
      }
      if (data.user && JSON.stringify(data.user) !== JSON.stringify(get().user)) {
        set({ user: data.user, role: data.user.role });
      }
    } catch {
      // network error — leave as-is, retry on next tick
    }
  },
}));

export default useAuthStore;