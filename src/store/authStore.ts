import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { useDataStore } from './dataStore';

interface AuthState {
  currentUser: User | null;
  login: (email: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      login: (email, password) => {
        const users = useDataStore.getState().users;
        const user = users.find((u) => u.email === email && u.password === password);
        if (user) {
          set({ currentUser: user });
          return { success: true };
        }
        return { success: false, message: 'Invalid email or password' };
      },
      logout: () => set({ currentUser: null }),
    }),
    { name: 'manzione-auth' }
  )
);
