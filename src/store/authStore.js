import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true, // loading while checking stored token

  // Called on app start — checks if token exists in storage
  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      if (token && user) {
        const parsedUser = JSON.parse(user);
        set({
          token,
          user: parsedUser,
          role: parsedUser.role,
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
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    set({
      user: userData,
      token,
      role: userData.role,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null, role: null, isAuthenticated: false });
  },

  updateUser: (updates) => set((state) => ({
    user: { ...state.user, ...updates },
  })),
}));

export default useAuthStore;