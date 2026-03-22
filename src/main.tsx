import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from './store/authStore'

// Rehydrate the logged-in user from a live Supabase session (no-op in local/demo mode)
useAuthStore.getState().rehydrateFromSupabase();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
