import { useEffect, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { isSupabaseConfigured } from './lib/supabase';

function SupabaseConfigError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center font-sans">
      <h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
      <p className="max-w-md text-gray-600 leading-relaxed">
        The Supabase environment variables are not set.
        Please create a <code className="bg-gray-100 px-1 rounded">.env</code> file
        from <code className="bg-gray-100 px-1 rounded">.env.example</code> and add
        your <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
        <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> values,
        then restart the dev server.
      </p>
      <p className="mt-4 text-sm text-gray-400">
        See <strong>SETUP.md</strong> for full instructions.
      </p>
    </div>
  );
}

export default function App() {
  const { initialize, currentUser, isLoading: authLoading } = useAuthStore();
  const { loadData } = useDataStore();
  const lastLoadedUserKeyRef = useRef<string | null>(null);

  // Initialize Supabase auth session on app start
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Load data whenever the authenticated user changes
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      lastLoadedUserKeyRef.current = null;
      return;
    }

    const userKey = `${currentUser.id}:${currentUser.role}:${currentUser.tenantId ?? ''}`;
    if (lastLoadedUserKeyRef.current === userKey) return;

    lastLoadedUserKeyRef.current = userKey;
    void loadData(currentUser.role, currentUser.tenantId);
  }, [currentUser, authLoading, loadData]);

  if (!isSupabaseConfigured) {
    return <SupabaseConfigError />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
