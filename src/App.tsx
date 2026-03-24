import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';

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

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
