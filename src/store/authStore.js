import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useAddressStore from "./addressStore";

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  // Called on app start — reads stored token and restores session
  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");

      console.log("HYDRATE token:", token);
      console.log("HYDRATE user:", userStr);

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({
          token,
          user,
          role: user.role,
          isAuthenticated: true,
          isLoading: false,
        });
        // Load addresses from backend on every app start
        await useAddressStore.getState().loadAddresses(token);
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (userData, token) => {
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    set({
      user: userData,
      token,
      role: userData.role,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    useAddressStore.getState().clearAddresses();
    set({ user: null, token: null, role: null, isAuthenticated: false });
  },

  updateUser: (updates) =>
    set((state) => ({
      user: { ...state.user, ...updates },
    })),
}));

export default useAuthStore;