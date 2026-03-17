import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

      console.log("HYDRATE token:", token); // ADD THIS
      console.log("HYDRATE user:", userStr); // ADD THIS

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({
          token,
          user,
          role: user.role,
          isAuthenticated: true,
          isLoading: false,
        });
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
    set({ user: null, token: null, role: null, isAuthenticated: false });
  },

  updateUser: (updates) =>
    set((state) => ({
      user: { ...state.user, ...updates },
    })),
}));

export default useAuthStore;