import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; role?: 'admin' | 'tenant' }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isLoading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({
            currentUser: {
              id: session.user.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role as 'admin' | 'tenant',
              tenantId: profile.tenant_id ?? undefined,
              createdAt: profile.created_at,
            },
          });
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth state changes (tab switching, token refresh, etc.)
    // Note: SIGNED_IN is intentionally excluded — login() handles that directly
    // to avoid a race condition between the two async profile fetches.
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ currentUser: null });
        return;
      }
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({
            currentUser: {
              id: session.user.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role as 'admin' | 'tenant',
              tenantId: profile.tenant_id ?? undefined,
              createdAt: profile.created_at,
            },
          });
        }
      }
    });
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return {
        success: false,
        message: error?.message ?? 'Invalid email or password',
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, message: 'User profile not found. Contact your administrator.' };
    }

    set({
      currentUser: {
        id: data.user.id,
        email: data.user.email!,
        name: profile.name,
        role: profile.role as 'admin' | 'tenant',
        tenantId: profile.tenant_id ?? undefined,
        createdAt: profile.created_at,
      },
    });

    return { success: true, role: profile.role as 'admin' | 'tenant' };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  },
}));
