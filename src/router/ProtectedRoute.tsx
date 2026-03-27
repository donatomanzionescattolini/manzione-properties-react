import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: UserRole;
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { currentUser, isLoading } = useAuthStore();
  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
  const hashType = hashParams.get('type');
  const hashError = hashParams.get('error');
  const hashErrorCode = hashParams.get('error_code');

  if (hashType === 'invite' || hashType === 'recovery') {
    return <Navigate to={`/set-password${window.location.hash}`} replace />;
  }

  if (hashError) {
    const message = hashErrorCode === 'otp_expired'
      ? 'This email link is invalid or has expired. Please sign in again or request a new link.'
      : decodeURIComponent(hashParams.get('error_description') ?? 'Authentication failed. Please sign in again.').replace(/\+/g, ' ');

    return <Navigate to={`/login?message=${encodeURIComponent(message)}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentUser.role !== role) {
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/tenant" replace />;
  }

  return <>{children}</>;
}
