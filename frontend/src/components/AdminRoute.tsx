import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/api/hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Not logged in - redirect to login with return URL
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Check if user has admin role
  const userRole = ((user as any)?.role || 'USER').toUpperCase();

  // Security: Redirect to 404 instead of showing access denied
  // This prevents attackers from knowing the admin panel exists
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    // Redirect to 404 or dashboard to hide admin panel existence
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
