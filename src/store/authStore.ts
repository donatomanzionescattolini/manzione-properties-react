import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useDataStore } from './dataStore';
import type { User } from '../types';
import type { Session, Subscription } from '@supabase/supabase-js';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; role?: 'admin' | 'tenant' }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  initialize: () => Promise<void>;
}

let authInitializationPromise: Promise<void> | null = null;
let hasInitializedAuth = false;
let authStateSubscription: Subscription | null = null;

async function loadCurrentUserFromSession(session: Session | null) {
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  return {
    id: session.user.id,
    email: session.user.email!,
    name: profile.name,
    role: profile.role as 'admin' | 'tenant',
    tenantId: profile.tenant_id ?? undefined,
    createdAt: profile.created_at,
  } satisfies User;
}

function isInvalidSessionError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return [
    'Invalid Refresh Token',
    'Refresh Token Not Found',
    'Auth session missing',
    'JWT expired',
  ].some((message) => error.message.includes(message));
}

async function clearInvalidSession(set: (partial: Partial<AuthState>) => void) {
  useDataStore.getState().resetData();
  set({ currentUser: null, isLoading: false });

  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore cleanup failures; local auth state has already been cleared.
  }
}

async function syncCurrentUserFromSession(
  set: (partial: Partial<AuthState>) => void,
  session: Session | null
) {
  if (!session) {
    useDataStore.getState().resetData();
    set({ currentUser: null });
    return;
  }

  const currentUser = await loadCurrentUserFromSession(session);
  set({ currentUser });
}

function ensureAuthStateSubscription(set: (partial: Partial<AuthState>) => void) {
  if (authStateSubscription) return;

  const authChange = supabase.auth.onAuthStateChange((event, session) => {
    void (async () => {
      if (event === 'SIGNED_OUT' || !session) {
        useDataStore.getState().resetData();
        set({ currentUser: null });
        return;
      }

      if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'INITIAL_SESSION'].includes(event)) {
        try {
          await syncCurrentUserFromSession(set, session);
        } catch (err) {
          if (isInvalidSessionError(err)) {
            await clearInvalidSession(set);
            return;
          }

          console.error('Auth state sync error:', err);
        }
      }
    })();
  });

  authStateSubscription = authChange.data.subscription;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isLoading: true,

  initialize: async () => {
    if (hasInitializedAuth) {
      set({ isLoading: false });
      return;
    }

    if (authInitializationPromise) {
      await authInitializationPromise;
      return;
    }

    authInitializationPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await syncCurrentUserFromSession(set, session);
      } catch (err) {
        if (isInvalidSessionError(err)) {
          await clearInvalidSession(set);
          return;
        }

        console.error('Auth initialization error:', err);
      } finally {
        hasInitializedAuth = true;
        set({ isLoading: false });
      }

      ensureAuthStateSubscription(set);
    })();

    try {
      await authInitializationPromise;
    } finally {
      authInitializationPromise = null;
    }
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user || !data.session) {
      return {
        success: false,
        message: error?.message ?? 'Sign-in succeeded, but no active session was created. Please try again.',
      };
    }

    const currentUser = await loadCurrentUserFromSession(data.session);

    if (!currentUser) {
      return { success: false, message: 'User profile not found. Contact your administrator.' };
    }

    set({ currentUser });

    return { success: true, role: currentUser.role };
  },

  logout: async () => {
    await supabase.auth.signOut();
    useDataStore.getState().resetData();
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
