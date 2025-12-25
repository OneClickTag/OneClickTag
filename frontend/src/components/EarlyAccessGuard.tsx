import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Rocket, Calendar, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EarlyAccessGuardProps {
  children: React.ReactNode;
}

export function EarlyAccessGuard({ children }: EarlyAccessGuardProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Check if early access mode is enabled
  const isEarlyAccessMode = import.meta.env.VITE_EARLY_ACCESS_MODE === 'true';

  // If early access mode is disabled, allow access
  if (!isEarlyAccessMode) {
    return <>{children}</>;
  }

  // Not logged in - redirect to login with return URL (allows admin to login)
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // If user is authenticated, check their role
  if (isAuthenticated && user) {
    const userRole = ((user as any)?.role || 'USER').toUpperCase();

    // Allow access for admins and super admins
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return <>{children}</>;
    }
  }

  // For non-admin users in early access mode, show coming soon page
  const launchDate = import.meta.env.VITE_EXPECTED_LAUNCH_DATE || '2025-03-01';
  const formattedDate = new Date(launchDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center transform rotate-3 shadow-lg">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full"></div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Coming Very Soon! ⏳
          </h1>

          {/* Subheading */}
          <p className="text-xl text-gray-600 text-center mb-8">
            We're putting the finishing touches on something amazing
          </p>

          {/* Launch Date */}
          <div className="flex items-center justify-center space-x-3 mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold text-gray-700">
              Expected Launch:{' '}
              <span className="text-blue-600">{formattedDate}</span>
            </span>
          </div>

          {/* Description */}
          <div className="space-y-4 mb-8 text-center">
            <p className="text-gray-600 leading-relaxed">
              OneClickTag is revolutionizing conversion tracking by automating
              Google Tag Manager and Google Ads setup. No more manual tag
              configuration, no more tracking errors.
            </p>
            <p className="text-gray-600 leading-relaxed">
              <strong className="text-gray-900">Want early access?</strong> Join
              our waitlist and be the first to experience one-click tracking
              automation!
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              <Link to="/early-access" className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Join the Waitlist</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-6 border-2 hover:bg-gray-50"
            >
              <Link to="/">
                <span>Back to Home</span>
              </Link>
            </Button>
          </div>

          {/* Already signed up message */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Already on the waitlist? We'll email you as soon as we launch! 🎉
            </p>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center mt-6 text-sm text-gray-500">
          Have questions?{' '}
          <Link
            to="/contact"
            className="text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Contact us
          </Link>
        </p>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
