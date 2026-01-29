'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2 } from 'lucide-react';

interface EarlyAccessGuardProps {
  children: React.ReactNode;
}

const EARLY_ACCESS_MODE = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === 'true';
const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export function EarlyAccessGuard({ children }: EarlyAccessGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Skip if not in early access mode
    if (!EARLY_ACCESS_MODE) return;

    // Wait for auth to load
    if (loading) return;

    // If not logged in, redirect to login
    if (!user) {
      router.replace('/login?redirect=/dashboard');
      return;
    }

    // If logged in but not admin, redirect to early access page
    if (!ALLOWED_ROLES.includes(user.role)) {
      router.replace('/early-access?restricted=true');
    }
  }, [user, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // If early access mode is enabled, check user role
  if (EARLY_ACCESS_MODE) {
    // Not logged in - will redirect in useEffect
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Redirecting to login...</p>
          </div>
        </div>
      );
    }

    // Logged in but not admin - will redirect in useEffect
    if (!ALLOWED_ROLES.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Access restricted...</p>
          </div>
        </div>
      );
    }
  }

  // User has access - render children
  return <>{children}</>;
}
