import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  role: null,
  loading: true, // true until session is confirmed or ruled out
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
  clearAuth: () => set({ user: null, profile: null, role: null, loading: false }),
}))
