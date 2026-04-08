import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { isSupabaseConfigured } from './lib/supabase';

function SupabaseConfigError() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Configuration Required</h1>
      <p style={{ maxWidth: '480px', color: '#555', lineHeight: 1.6 }}>
        The Supabase environment variables are not set.
        Please create a <code>.env</code> file from <code>.env.example</code> and add
        your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> values,
        then restart the dev server.
      </p>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#888' }}>
        See <strong>SETUP.md</strong> for full instructions.
      </p>
    </div>
  );
}

export default function App() {
  const { initialize, currentUser, isLoading: authLoading } = useAuthStore();
  const { loadData } = useDataStore();

  // Initialize Supabase auth session on app start
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load data whenever the authenticated user changes
  useEffect(() => {
    if (currentUser && !authLoading) {
      loadData(currentUser.role, currentUser.tenantId);
    }
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
