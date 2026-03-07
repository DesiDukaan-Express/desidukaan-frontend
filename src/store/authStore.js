import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,

  login: (userData, token) => set({
    user: userData,
    token: token,
    role: userData.role,
    isAuthenticated: true,
  }),

  logout: () => set({
    user: null,
    token: null,
    role: null,
    isAuthenticated: false,
  }),

  updateUser: (updates) => set((state) => ({
    user: { ...state.user, ...updates },
  })),
}));

export default useAuthStore;