import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useDataStore } from './dataStore';

interface AuthState {
  currentUser: User | null;
  /** Synchronous local-mode login. Returns { success, message }. */
  login: (email: string, password: string) => { success: boolean; message?: string };
  /**
   * Async Supabase login. Call this when `isSupabaseConfigured` is true.
   * Falls back to synchronous local login when Supabase is not configured.
   */
  loginAsync: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  logoutAsync: () => Promise<void>;
  /** Rehydrate the current user from an active Supabase session (call on app mount). */
  rehydrateFromSupabase: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,

      // ── Local / demo mode login ───────────────────────────────────────────
      login: (email, password) => {
        const users = useDataStore.getState().users;
        const user = users.find((u) => u.email === email && u.password === password);
        if (user) {
          set({ currentUser: user });
          return { success: true };
        }
        return { success: false, message: 'Invalid email or password' };
      },

      // ── Supabase async login (used in production) ─────────────────────────
      loginAsync: async (email, password) => {
        if (!isSupabaseConfigured || !supabase) {
          // Fall back to local auth when Supabase is not configured
          const users = useDataStore.getState().users;
          const user = users.find((u) => u.email === email && u.password === password);
          if (user) {
            set({ currentUser: user });
            return { success: true };
          }
          return { success: false, message: 'Invalid email or password' };
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          return { success: false, message: error?.message ?? 'Sign-in failed' };
        }

        // Load the user's profile row to get name, role, and tenantId
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, name, role, tenant_id, created_at')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          const user: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role as User['role'],
            tenantId: profile.tenant_id ?? undefined,
            password: '',  // never stored in the frontend after Supabase auth
            createdAt: profile.created_at,
          };
          set({ currentUser: user });
        }

        return { success: true };
      },

      logout: () => set({ currentUser: null }),

      logoutAsync: async () => {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut();
        }
        set({ currentUser: null });
      },

      rehydrateFromSupabase: async () => {
        if (!isSupabaseConfigured || !supabase) return;

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, name, role, tenant_id, created_at')
          .eq('id', sessionData.session.user.id)
          .single();

        if (profile) {
          const user: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role as User['role'],
            tenantId: profile.tenant_id ?? undefined,
            password: '',
            createdAt: profile.created_at,
          };
          set({ currentUser: user });
        }
      },
    }),
    { name: 'manzione-auth' }
  )
);
